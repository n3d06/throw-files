// How a file travels between devices.
//
// "relay": through the Cloudflare Durable Object, as before.
// "p2p":   straight between the two browsers over a WebRTC DataChannel; the
//          Worker only carries the signalling. Fails if no direct path.
// "auto":  try P2P, fall back to the relay if it cannot connect in time.

export type TransferMode = "auto" | "p2p" | "relay";

export const TRANSFER_MODES: readonly TransferMode[] = ["auto", "p2p", "relay"];

export const TRANSFER_MODE_STORAGE_KEY = "throwmyfile-transfer-mode";

/** How long a P2P attempt may take to open before it counts as failed. */
export const P2P_CONNECT_TIMEOUT_MS = 8_000;

/** Free public STUN: tells each browser its public address. No data passes it. */
export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.cloudflare.com:3478" },
];

export function loadTransferMode(): TransferMode {
  try {
    const value = localStorage.getItem(TRANSFER_MODE_STORAGE_KEY);
    return TRANSFER_MODES.includes(value as TransferMode)
      ? (value as TransferMode)
      : "auto";
  } catch {
    return "auto";
  }
}

export function saveTransferMode(mode: TransferMode): void {
  try {
    localStorage.setItem(TRANSFER_MODE_STORAGE_KEY, mode);
  } catch {
    /* storage blocked: the choice lasts for this visit only */
  }
}

/** Whether this browser can do P2P at all. */
export function supportsP2P(): boolean {
  return typeof RTCPeerConnection === "function";
}

/** Whether a receiver in `mode` should offer to take a file over P2P. */
export function receiverWantsP2P(mode: TransferMode): boolean {
  return mode !== "relay";
}

/**
 * What the sender does once a receiver accepted.
 *
 * - "relay":         send over the relay.
 * - "p2p":           P2P or nothing (sender insists on P2P).
 * - "p2p-or-relay":  try P2P, fall back to the relay if it fails.
 * - "impossible":    the sender insists on P2P but the receiver refused it.
 */
export type Route = "relay" | "p2p" | "p2p-or-relay" | "impossible";

export function resolveRoute(
  senderMode: TransferMode,
  receiverAcceptsP2P: boolean,
): Route {
  if (senderMode === "relay") return "relay";
  if (!receiverAcceptsP2P) return senderMode === "p2p" ? "impossible" : "relay";
  return senderMode === "p2p" ? "p2p" : "p2p-or-relay";
}
