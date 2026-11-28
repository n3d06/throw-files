// One WebRTC DataChannel per P2P transfer.
//
// Signalling (the SDP offer/answer and ICE candidates) rides the existing
// channel WebSocket as "rtc" messages tagged with the transfer id; the Worker
// only forwards them. Once the DataChannel opens, file bytes go browser to
// browser, encrypted end to end by DTLS, and never touch the Worker.
//
// Connecting borrows from croc (github.com/schollz/croc): try the direct
// routes first (LAN, then public address via STUN), fall back to the relay
// when neither works (Auto mode), and give a failed attempt one retry (an ICE
// restart) before giving up.
//
// On the DataChannel, binary messages are file chunks in order, and text
// messages are control: {"t":"done"} or {"t":"abort"}.

import { parseHash } from "./integrity";
import type { ThrowSocket } from "./throw-socket";
import { ICE_SERVERS } from "./transfer-mode";

/** DataChannel message size every browser handles. */
const P2P_CHUNK_BYTES = 64 * 1024;
/** Largest message worth sending; bigger ones gain little and Chrome caps here. */
const P2P_MAX_CHUNK_BYTES = 256 * 1024;
/**
 * Pause sending once this much is queued in the DataChannel. Deep enough that
 * a fast link never runs dry between refills, and well under Chrome's 16 MB
 * send queue: going over it closes the channel outright.
 */
const P2P_HIGH_WATER = 8 * 1024 * 1024;
const P2P_LOW_WATER = 2 * 1024 * 1024;

/**
 * Message size for a connection: as large as both sides accept (SDP
 * max-message-size), up to 256 KB. Fewer, larger messages cost less per byte.
 */
export function p2pChunkSize(pc: RTCPeerConnection): number {
  const max = pc.sctp?.maxMessageSize ?? 0;
  if (!(max > 0)) return P2P_CHUNK_BYTES;
  return Math.max(16 * 1024, Math.min(P2P_MAX_CHUNK_BYTES, max));
}

type Signal =
  | { kind: "description"; description: RTCSessionDescriptionInit }
  | { kind: "candidate"; candidate: RTCIceCandidateInit };

/** "done" carries the file's hash (see integrity.ts) when the sender had one. */
export type P2PControl = { t: "done"; sha256?: string } | { t: "abort" };

// ── Diagnostics ─────────────────────────────────────────────────────────────

/**
 * Classify an ICE candidate line: "host (mDNS)" when the browser hid the LAN
 * IP behind a .local name, "host (IP)", "srflx" (public address learned via
 * STUN), "prflx" or "relay".
 */
export function candidateKind(candidate: string): string | null {
  const typ = / typ (\w+)/.exec(candidate)?.[1];
  if (!typ) return null;
  if (typ !== "host") return typ;
  // candidate:<foundation> <component> <proto> <priority> <address> <port> typ host
  const address = candidate.split(" ")[4] ?? "";
  return address.endsWith(".local") ? "host (mDNS)" : "host (IP)";
}

/** What a failed connection gathered, phrased so the user can act on it. */
export function explainFailure(diag: {
  local: string[];
  remote: string[];
  state: string;
}): string {
  const list = (kinds: string[]) => (kinds.length ? kinds.join(", ") : "none");
  const facts = `This device: ${list(diag.local)}. Other device: ${list(diag.remote)}. State: ${diag.state}.`;
  let hint: string;
  if (diag.remote.length === 0) {
    hint = "The other device sent no addresses: its browser may be blocking WebRTC.";
  } else if (diag.local.length === 0) {
    hint = "This browser gathered no addresses: it may be blocking WebRTC.";
  } else if (!diag.local.includes("srflx") && !diag.remote.includes("srflx")) {
    hint = "Neither side reached the STUN server, and the local addresses were not reachable.";
  } else {
    hint =
      "Both sides found addresses but couldn't reach each other: usually a firewall (Windows set to a Public network), Wi-Fi client isolation, or a router without NAT hairpinning.";
  }
  return `${hint} ${facts}`;
}

/** Name the path a connected candidate pair takes. */
export function describeRoute(local?: string, remote?: string): string | null {
  if (!local || !remote) return null;
  if (local === "host" && remote === "host") return "direct (LAN)";
  return "direct (internet)";
}

// ── Peer connection ─────────────────────────────────────────────────────────

/** A peer connection for one transfer, plus its signalling subscription. */
class Link {
  readonly pc: RTCPeerConnection;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private closed = false;
  /** Candidate kinds seen on each side, for failure diagnostics. */
  private readonly localKinds = new Set<string>();
  private readonly remoteKinds = new Set<string>();
  private readonly onSignal = ({ id, data }: { id: string; data: string }) => {
    if (id !== this.id || this.closed) return;
    let signal: Signal;
    try {
      signal = JSON.parse(data) as Signal;
    } catch {
      return;
    }
    // Signals are applied strictly in arrival order: an answer must be set
    // before the candidates that follow it, and an ICE-restart offer after
    // the first exchange has finished.
    this.queue = this.queue.then(() => this.handle(signal));
  };
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly socket: ThrowSocket,
    private readonly id: string,
    private readonly onRemoteOffer?: () => Promise<void>,
  ) {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    socket.on("rtc", this.onSignal);
    this.pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !candidate.candidate) return;
      const kind = candidateKind(candidate.candidate);
      if (kind) this.localKinds.add(kind);
      this.send({ kind: "candidate", candidate: candidate.toJSON() });
    };
  }

  /** Human-readable account of why this link may not have connected. */
  describe(): string {
    return explainFailure({
      local: [...this.localKinds],
      remote: [...this.remoteKinds],
      state: this.pc.iceConnectionState,
    });
  }

  /** How the connected pair reaches each other, or null if unknown. */
  async route(): Promise<string | null> {
    try {
      const stats = await this.pc.getStats();
      let pairId: string | undefined;
      stats.forEach((r) => {
        if (r.type === "transport" && r.selectedCandidatePairId) {
          pairId = r.selectedCandidatePairId;
        }
      });
      let pair: { localCandidateId?: string; remoteCandidateId?: string } | undefined;
      stats.forEach((r) => {
        if (r.type !== "candidate-pair") return;
        if (pairId ? r.id === pairId : r.nominated && r.state === "succeeded") pair = r;
      });
      if (!pair) return null;
      const local = pair.localCandidateId ? stats.get(pair.localCandidateId) : undefined;
      const remote = pair.remoteCandidateId ? stats.get(pair.remoteCandidateId) : undefined;
      return describeRoute(local?.candidateType, remote?.candidateType);
    } catch {
      return null;
    }
  }

  send(signal: Signal): void {
    this.socket.emit("rtc", { id: this.id, data: JSON.stringify(signal) });
  }

  private async handle(signal: Signal): Promise<void> {
    if (this.closed) return;
    try {
      if (signal.kind === "candidate") {
        const kind = candidateKind(signal.candidate.candidate ?? "");
        if (kind) this.remoteKinds.add(kind);
        if (this.pc.remoteDescription) await this.pc.addIceCandidate(signal.candidate);
        else this.pendingCandidates.push(signal.candidate);
        return;
      }
      await this.pc.setRemoteDescription(signal.description);
      for (const c of this.pendingCandidates.splice(0)) {
        await this.pc.addIceCandidate(c).catch(() => undefined);
      }
      if (signal.description.type === "offer" && this.onRemoteOffer) {
        await this.onRemoteOffer();
      }
    } catch (error) {
      // A bad or late signal: the connect timeout reports the failure.
      console.info("[p2p] signal ignored:", error);
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.socket.off("rtc", this.onSignal);
    try {
      this.pc.close();
    } catch {
      /* already closed */
    }
  }
}

/** An open DataChannel and how to tear it down. */
export interface P2PConnection {
  channel: RTCDataChannel;
  /** The peer connection; more DataChannels can be opened on it. */
  pc: RTCPeerConnection;
  /** "direct (LAN)", "direct (internet)", or null. */
  route: string | null;
  close(): void;
}

/**
 * Sender side: offer a DataChannel for transfer `id` and wait for it to open.
 * If ICE fails, it restarts once (new candidates, same channel) before giving
 * up. Rejects (and cleans up) if it is not open within `timeoutMs`.
 */
export async function connectAsSender(
  socket: ThrowSocket,
  id: string,
  timeoutMs: number,
): Promise<P2PConnection> {
  const link = new Link(socket, id);
  const channel = link.pc.createDataChannel("file", { ordered: true });
  channel.binaryType = "arraybuffer";

  return new Promise<P2PConnection>((resolve, reject) => {
    let settled = false;
    let restarted = false;
    const fail = (reason: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Read the diagnostics before close() tears the connection down.
      const detail = link.describe();
      link.close();
      console.info(`[p2p] ${reason}. ${detail}`);
      reject(new Error(`${reason}. ${detail}`));
    };
    const timer = setTimeout(() => fail("P2P connection timed out"), timeoutMs);

    const offer = async (iceRestart: boolean) => {
      const description = await link.pc.createOffer({ iceRestart });
      await link.pc.setLocalDescription(description);
      link.send({ kind: "description", description });
    };

    link.pc.onconnectionstatechange = () => {
      if (link.pc.connectionState !== "failed" || settled) return;
      if (restarted) return fail("P2P connection failed");
      // Like croc trying an alternate route before giving up: gather fresh
      // candidates (a NAT mapping may have changed, a slow STUN reply may
      // now arrive) and try every pair again.
      restarted = true;
      console.info("[p2p] connection failed, restarting ICE once");
      offer(true).catch(() => fail("P2P connection failed"));
    };
    channel.onopen = async () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const route = await link.route();
      console.info(`[p2p] connected: ${route ?? "route unknown"}`);
      resolve({ channel, route, pc: link.pc, close: () => link.close() });
    };
    offer(false).catch(() => fail("Could not start a P2P connection"));
  });
}

/**
 * Receiver side: wait for the sender's offer for transfer `id`, answer it,
 * and hand over the DataChannel once it opens. Nothing happens if the sender
 * never offers (it chose the relay); call `close()` when the transfer ends.
 * Resolve this before accepting, so the first offer is not missed.
 */
export function listenAsReceiver(
  socket: ThrowSocket,
  id: string,
  onChannel: (channel: RTCDataChannel, route: Promise<string | null>) => void,
): { close(): void; describe(): string; pc: RTCPeerConnection } {
  // eslint-disable-next-line prefer-const
  let link: Link;
  const answer = async () => {
    const description = await link.pc.createAnswer();
    await link.pc.setLocalDescription(description);
    link.send({ kind: "description", description });
  };
  link = new Link(socket, id, answer);
  link.pc.ondatachannel = ({ channel }) => {
    channel.binaryType = "arraybuffer";
    // Hand the channel over synchronously, so its message handler is set
    // before the first chunk can arrive; the route is looked up meanwhile.
    const opened = () => onChannel(channel, link.route());
    if (channel.readyState === "open") opened();
    else channel.onopen = opened;
  };
  return { close: () => link.close(), describe: () => link.describe(), pc: link.pc };
}

/** Resolve once the channel's send buffer has drained below the low mark. */
export function waitForDrain(channel: RTCDataChannel): Promise<void> {
  if (channel.bufferedAmount <= P2P_HIGH_WATER) return Promise.resolve();
  channel.bufferedAmountLowThreshold = P2P_LOW_WATER;
  return new Promise((resolve, reject) => {
    const done = () => {
      channel.removeEventListener("bufferedamountlow", done);
      channel.removeEventListener("close", closed);
      resolve();
    };
    const closed = () => {
      channel.removeEventListener("bufferedamountlow", done);
      reject(new Error("P2P channel closed"));
    };
    channel.addEventListener("bufferedamountlow", done);
    channel.addEventListener("close", closed, { once: true });
  });
}

export function sendControl(channel: RTCDataChannel, message: P2PControl): void {
  if (channel.readyState === "open") channel.send(JSON.stringify(message));
}

export function parseControl(data: string): P2PControl | null {
  try {
    const message = JSON.parse(data) as { t?: unknown; sha256?: unknown };
    if (message?.t === "abort") return { t: "abort" };
    if (message?.t !== "done") return null;
    const sha256 = parseHash(message.sha256);
    return sha256 ? { t: "done", sha256 } : { t: "done" };
  } catch {
    return null;
  }
}
