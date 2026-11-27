// One WebRTC DataChannel per P2P transfer.
//
// Signalling (the SDP offer/answer and ICE candidates) rides the existing
// channel WebSocket as "rtc" messages tagged with the transfer id; the Worker
// only forwards them. Once the DataChannel opens, file bytes go browser to
// browser, encrypted end to end by DTLS, and never touch the Worker.
//
// On the DataChannel, binary messages are file chunks in order, and text
// messages are control: {"t":"done"} or {"t":"abort"}.

import type { ThrowSocket } from "./throw-socket";
import { ICE_SERVERS } from "./transfer-mode";

/** DataChannel message size every browser handles. */
export const P2P_CHUNK_BYTES = 64 * 1024;
/** Pause sending once this much is queued in the DataChannel. */
const P2P_HIGH_WATER = 4 * 1024 * 1024;
const P2P_LOW_WATER = 1024 * 1024;

type Signal =
  | { kind: "description"; description: RTCSessionDescriptionInit }
  | { kind: "candidate"; candidate: RTCIceCandidateInit };

export type P2PControl = { t: "done" } | { t: "abort" };

/** A peer connection for one transfer, plus its signalling subscription. */
class Link {
  readonly pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private closed = false;
  private readonly onSignal = ({ id, data }: { id: string; data: string }) => {
    if (id !== this.id || this.closed) return;
    let signal: Signal;
    try {
      signal = JSON.parse(data) as Signal;
    } catch {
      return;
    }
    void this.handle(signal);
  };

  constructor(
    private readonly socket: ThrowSocket,
    private readonly id: string,
    private readonly onRemoteOffer?: () => Promise<void>,
  ) {
    socket.on("rtc", this.onSignal);
    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) this.send({ kind: "candidate", candidate: candidate.toJSON() });
    };
  }

  send(signal: Signal): void {
    this.socket.emit("rtc", { id: this.id, data: JSON.stringify(signal) });
  }

  private async handle(signal: Signal): Promise<void> {
    try {
      if (signal.kind === "candidate") {
        if (this.pc.remoteDescription) await this.pc.addIceCandidate(signal.candidate);
        else this.pendingCandidates.push(signal.candidate);
        return;
      }
      await this.pc.setRemoteDescription(signal.description);
      for (const c of this.pendingCandidates.splice(0)) await this.pc.addIceCandidate(c);
      if (signal.description.type === "offer" && this.onRemoteOffer) {
        await this.onRemoteOffer();
      }
    } catch {
      /* a bad or late signal: the connect timeout reports the failure */
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
  close(): void;
}

/**
 * Sender side: offer a DataChannel for transfer `id` and wait for it to open.
 * Rejects (and cleans up) if it is not open within `timeoutMs`.
 */
export function connectAsSender(
  socket: ThrowSocket,
  id: string,
  timeoutMs: number,
): Promise<P2PConnection> {
  const link = new Link(socket, id);
  const channel = link.pc.createDataChannel("file", { ordered: true });
  channel.binaryType = "arraybuffer";

  return new Promise<P2PConnection>((resolve, reject) => {
    const fail = (reason: string) => {
      clearTimeout(timer);
      link.close();
      reject(new Error(reason));
    };
    const timer = setTimeout(() => fail("P2P connection timed out"), timeoutMs);
    link.pc.onconnectionstatechange = () => {
      if (link.pc.connectionState === "failed") fail("P2P connection failed");
    };
    channel.onopen = () => {
      clearTimeout(timer);
      resolve({ channel, close: () => link.close() });
    };
    void (async () => {
      try {
        const offer = await link.pc.createOffer();
        await link.pc.setLocalDescription(offer);
        link.send({ kind: "description", description: offer });
      } catch {
        fail("Could not start a P2P connection");
      }
    })();
  });
}

/**
 * Receiver side: wait for the sender's offer for transfer `id`, answer it,
 * and hand over the DataChannel once it opens. Nothing happens if the sender
 * never offers (it chose the relay); call `close()` when the transfer ends.
 */
export function listenAsReceiver(
  socket: ThrowSocket,
  id: string,
  onChannel: (channel: RTCDataChannel) => void,
): { close(): void } {
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
    if (channel.readyState === "open") onChannel(channel);
    else channel.onopen = () => onChannel(channel);
  };
  return { close: () => link.close() };
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
    const message = JSON.parse(data) as P2PControl;
    return message?.t === "done" || message?.t === "abort" ? message : null;
  } catch {
    return null;
  }
}
