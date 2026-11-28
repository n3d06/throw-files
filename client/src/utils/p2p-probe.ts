// Connects P2P to every other device as soon as it joins the channel, and
// keeps that connection open so files start at once.
//
// Every device has a random id for this page load. Discovery rides the
// Worker's "rtc" forwarding under the fixed id "probe":
//   {"hello": <id>, "fresh"?: true}  "I'm here" (fresh: re-check me unless
//                                    you already hold a live connection)
//   {"ready": <id>, "to": <id>}      "I'm listening for your offer"
//   {"failed": <id>, "to": <id>}     "I couldn't connect to you; stop waiting"
// For each pair, the device with the larger id listens and the smaller one
// connects once it hears "ready", so the offer never arrives before anyone
// is listening.
//
// Once connected, each file gets its own DataChannel labelled
// "file:<transfer id>" on the same peer connection (no new signalling or ICE),
// opened by whichever side sends. The result also tells Auto whether to try
// P2P at all for a given receiver.

import { connectAsSender, listenAsReceiver, p2pChunkSize } from "./p2p";
import type { ThrowSocket } from "./throw-socket";
import { P2P_CONNECT_TIMEOUT_MS } from "./transfer-mode";

export type ProbeStatus =
  | { state: "checking"; since: number }
  | { state: "ok"; route: string | null }
  | { state: "failed"; detail: string };

type ProbeMessage = {
  hello?: string;
  fresh?: boolean;
  ready?: string;
  failed?: string;
  to?: string;
};

const PROBE_SIGNAL_ID = "probe";
/**
 * The listener's own limit, in case the connecting side's "failed" message
 * never arrives; normally that message ends the wait first.
 */
const LISTEN_TIMEOUT_MS = P2P_CONNECT_TIMEOUT_MS + 5_000;
/** A per-file DataChannel on a live connection opens in well under this. */
const CHANNEL_OPEN_TIMEOUT_MS = 3_000;
const FILE_LABEL = "file:";

/** One line for the UI from every peer's status, or null when nothing to say. */
export function summarizeProbes(statuses: ProbeStatus[]): {
  tone: "checking" | "ok" | "failed";
  text: string;
  /** While checking: when the oldest running check started (ms epoch). */
  since?: number;
} | null {
  if (statuses.length === 0) return null;
  const running = statuses.flatMap((s) => (s.state === "checking" ? [s.since] : []));
  if (running.length) {
    return { tone: "checking", text: "Checking direct connection…", since: Math.min(...running) };
  }
  const failed = statuses.filter((s) => s.state === "failed").length;
  if (failed === statuses.length) {
    return { tone: "failed", text: "P2P unavailable — Auto will use the relay" };
  }
  const routes = [
    ...new Set(
      statuses.flatMap((s) => (s.state === "ok" && s.route ? [s.route] : [])),
    ),
  ];
  const via = routes.length ? ` · ${routes.join(", ")}` : "";
  return failed
    ? { tone: "ok", text: `P2P ready for ${statuses.length - failed} of ${statuses.length} devices${via}` }
    : { tone: "ok", text: `P2P ready${via}` };
}

/** The transfer id a per-file DataChannel belongs to, or null. */
export function transferIdOf(label: string): string | null {
  return label.startsWith(FILE_LABEL) && label.length > FILE_LABEL.length
    ? label.slice(FILE_LABEL.length)
    : null;
}

interface Peer {
  status: ProbeStatus;
  /** The live connection, once the check succeeded. */
  pc?: RTCPeerConnection;
  /** Tears down this peer's connection or pending attempt. */
  close?: () => void;
  /** Listener side: stop waiting and record the failure. */
  giveUp?: () => void;
}

export class P2PProbe {
  /** The socket's client id: the Worker names it when this tab leaves. */
  get selfId(): string {
    return this.socket.clientId;
  }
  private peers = new Map<string, Peer>();
  private started = false;
  /** Receives per-file DataChannels other devices open to this one. */
  onIncomingChannel: (transferId: string, channel: RTCDataChannel) => void = (
    _id,
    channel,
  ) => channel.close();

  constructor(
    private readonly socket: ThrowSocket,
    /** False in Relay mode or without WebRTC: no probing, no answering. */
    private readonly enabled: () => boolean,
    private readonly onChange: (statuses: Map<string, ProbeStatus>) => void,
  ) {}

  start(): void {
    if (this.started) return;
    this.started = true;
    this.socket.on("rtc", this.onSignal);
    this.socket.on("joined", this.onJoined);
    this.socket.on("peer-left", this.onPeerLeft);
    if (this.socket.connected) this.restart();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.socket.off("rtc", this.onSignal);
    this.socket.off("joined", this.onJoined);
    this.socket.off("peer-left", this.onPeerLeft);
    this.reset();
  }

  /** Forget every result, close every connection, and check again. */
  restart(): void {
    this.reset();
    if (this.enabled() && this.socket.connected) this.announce(true);
  }

  /** Drop all results and close every connection. */
  reset(): void {
    this.peers.forEach((peer) => peer.close?.());
    const had = this.peers.size > 0;
    this.peers.clear();
    if (had) this.notify();
  }

  /** The last check of the device with this id, if any. */
  status(peerId: string | undefined): ProbeStatus | undefined {
    return peerId ? this.peers.get(peerId)?.status : undefined;
  }

  /**
   * Open a DataChannel for one transfer on the live connection to `peerId`.
   * Null when there is no live connection or the channel doesn't open.
   */
  async openChannel(
    peerId: string | undefined,
    transferId: string,
  ): Promise<{ channel: RTCDataChannel; chunkSize: number } | null> {
    const pc = peerId ? this.peers.get(peerId)?.pc : undefined;
    if (!pc || pc.connectionState !== "connected") return null;
    let channel: RTCDataChannel;
    try {
      channel = pc.createDataChannel(`${FILE_LABEL}${transferId}`, { ordered: true });
    } catch {
      return null;
    }
    channel.binaryType = "arraybuffer";
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        channel.close();
        resolve(null);
      }, CHANNEL_OPEN_TIMEOUT_MS);
      channel.onopen = () => {
        clearTimeout(timer);
        resolve({ channel, chunkSize: p2pChunkSize(pc) });
      };
      channel.onclose = () => {
        clearTimeout(timer);
        resolve(null);
      };
    });
  }

  /**
   * After a socket reconnect: keep live connections (a P2P transfer may be
   * using one), drop the rest, and say hello again.
   */
  private readonly onJoined = () => {
    if (!this.enabled()) return;
    let changed = false;
    this.peers.forEach((peer, id) => {
      if (!this.isLive(peer)) {
        this.forget(id);
        changed = true;
      }
    });
    if (changed) this.notify();
    this.announce(true);
  };

  /** That tab closed or left: its result (or pending check) no longer applies. */
  private readonly onPeerLeft = (peerId: string) => {
    if (!this.peers.has(peerId)) return;
    this.forget(peerId);
    this.notify();
  };

  private isLive(peer: Peer): boolean {
    return peer.status.state === "ok" && peer.pc?.connectionState === "connected";
  }

  private readonly onSignal = ({ id, data }: { id: string; data: string }) => {
    if (id !== PROBE_SIGNAL_ID || !this.enabled()) return;
    let msg: ProbeMessage;
    try {
      msg = JSON.parse(data) as ProbeMessage;
    } catch {
      return;
    }
    if (typeof msg.hello === "string" && msg.hello && msg.hello !== this.selfId) {
      this.onHello(msg.hello, msg.fresh === true);
    } else if (
      typeof msg.ready === "string" &&
      msg.to === this.selfId &&
      this.peers.get(msg.ready)?.status.state === "checking"
    ) {
      void this.connect(msg.ready);
    } else if (typeof msg.failed === "string" && msg.to === this.selfId) {
      this.peers.get(msg.failed)?.giveUp?.();
    }
  };

  private onHello(peerId: string, fresh: boolean): void {
    const known = this.peers.get(peerId);
    if (known) {
      if (!fresh || this.isLive(known)) return;
      this.forget(peerId);
    }
    this.peers.set(peerId, { status: { state: "checking", since: Date.now() } });
    this.notify();
    // Make sure the newcomer knows about this device too.
    this.announce(false);
    if (this.selfId > peerId) void this.listen(peerId);
    // Otherwise wait for the peer's "ready", then connect.
  }

  private forget(peerId: string): void {
    this.peers.get(peerId)?.close?.();
    this.peers.delete(peerId);
  }

  /** Route DataChannels the other side opens on a live connection. */
  private routeChannel(channel: RTCDataChannel): boolean {
    const transferId = transferIdOf(channel.label);
    if (!transferId) return false;
    channel.binaryType = "arraybuffer";
    this.onIncomingChannel(transferId, channel);
    return true;
  }

  /**
   * Watch a live connection; if it drops, forget it and check again. The
   * check's channel closes as soon as the other side closes the connection
   * (reload, Relay mode); ICE alone takes ~15 s to notice.
   */
  private watch(
    peer: Peer,
    peerId: string,
    pc: RTCPeerConnection,
    channel: RTCDataChannel,
  ): void {
    const lost = () => {
      if (this.peers.get(peerId) !== peer) return;
      console.info("[p2p] direct connection lost, checking again");
      this.forget(peerId);
      this.notify();
      if (this.enabled() && this.socket.connected) this.announce(true);
    };
    channel.addEventListener("close", lost);
    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") lost();
    });
  }

  /** This device listens; `peerId` will offer once it hears "ready". */
  private listen(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handle = listenAsReceiver(
      this.socket,
      `probe:${peerId}:${this.selfId}`,
      (channel, route) => {
        if (this.routeChannel(channel)) return;
        // The check's own channel: the connection works.
        clearTimeout(timer);
        if (this.peers.get(peerId) !== peer) return;
        peer.pc = handle.pc;
        this.watch(peer, peerId, handle.pc, channel);
        void route.then((r) => this.settle(peer, peerId, { state: "ok", route: r }));
      },
    );
    peer.close = () => {
      clearTimeout(timer);
      handle.close();
    };
    peer.giveUp = () => {
      clearTimeout(timer);
      this.settle(peer, peerId, { state: "failed", detail: handle.describe() });
      handle.close();
    };
    timer = setTimeout(peer.giveUp, LISTEN_TIMEOUT_MS);
    this.send({ ready: this.selfId, to: peerId });
  }

  /** This device offers a DataChannel to a listening peer. */
  private async connect(peerId: string): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer || peer.close) return; // already connecting
    let cancelled = false;
    peer.close = () => {
      cancelled = true;
    };
    try {
      const connection = await connectAsSender(
        this.socket,
        `probe:${this.selfId}:${peerId}`,
        P2P_CONNECT_TIMEOUT_MS,
      );
      if (cancelled) return connection.close();
      peer.close = () => connection.close();
      peer.pc = connection.pc;
      connection.pc.ondatachannel = ({ channel }) => {
        if (!this.routeChannel(channel)) channel.close();
      };
      this.watch(peer, peerId, connection.pc, connection.channel);
      this.settle(peer, peerId, { state: "ok", route: connection.route });
    } catch (error) {
      if (cancelled) return;
      this.settle(peer, peerId, {
        state: "failed",
        detail: error instanceof Error ? error.message : "P2P connection failed",
      });
      // The listener would otherwise wait out its own, longer timeout.
      this.send({ failed: this.selfId, to: peerId });
    }
  }

  private settle(peer: Peer, peerId: string, status: ProbeStatus): void {
    if (this.peers.get(peerId) !== peer || peer.status.state !== "checking") return;
    peer.status = status;
    console.info(
      status.state === "ok"
        ? `[p2p] check: direct connection works (${status.route ?? "route unknown"})`
        : `[p2p] check: no direct connection. ${status.state === "failed" ? status.detail : ""}`,
    );
    this.notify();
  }

  private announce(fresh: boolean): void {
    this.send(fresh ? { hello: this.selfId, fresh: true } : { hello: this.selfId });
  }

  private send(msg: ProbeMessage): void {
    this.socket.emit("rtc", { id: PROBE_SIGNAL_ID, data: JSON.stringify(msg) });
  }

  private notify(): void {
    this.onChange(new Map([...this.peers].map(([id, p]) => [id, p.status])));
  }
}
