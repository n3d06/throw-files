// Transfer sizing limits and integrity checks.
//
// The hard constraint everything here derives from: Cloudflare Durable Objects
// reject WebSocket messages larger than 1 MiB. Our wire frame is
// [uint32 header length][header JSON][chunk bytes], so the chunk ceiling has to
// leave room for the largest header we could ever emit.

/** Cloudflare's per-message WebSocket ceiling. */
export const MAX_WS_MESSAGE_BYTES = 1024 * 1024;

/** Bytes reserved for the JSON chunk header (see maxHeaderByteLength). */
const HEADER_BUDGET_BYTES = 4096;

/**
 * Largest chunk payload we will ever put on the wire.
 *
 * 512 KiB sits comfortably under `MAX_WS_MESSAGE_BYTES` once the header budget
 * and length prefix are accounted for. The previous code scaled up to 2 MiB,
 * which silently exceeded the limit for every file over 50 MB.
 */
export const MAX_CHUNK_BYTES = 512 * 1024;

/** Advertised maximum transfer size. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024 * 1024;

/** Filesystem-realistic filename ceiling. */
export const MAX_FILENAME_LENGTH = 255;

/**
 * Longest text snippet, in UTF-16 code units (what String.length counts).
 * Must match MAX_TEXT_CHARS in worker/channel.ts. Even fully JSON-escaped this
 * stays far below `MAX_WS_MESSAGE_BYTES`, so text travels in a single frame.
 */
export const MAX_TEXT_CHARS = 50_000;

/** Largest received image we decode for an inline preview. */
export const MAX_PREVIEW_BYTES = 50 * 1024 * 1024;

const PREVIEW_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
  "image/svg+xml",
]);

/**
 * Whether a received file should get an inline image preview. The type is the
 * sender's claim, so a mismatch is still possible; the <img> just fails to load
 * and the row falls back to the name. SVG is safe here because an <img> never
 * runs a document's scripts.
 */
export function isPreviewableImage(type: string, size: number): boolean {
  return (
    PREVIEW_TYPES.has(type.toLowerCase()) && size > 0 && size <= MAX_PREVIEW_BYTES
  );
}

/** Why `text` cannot be sent, or null if it can. */
export function textSendProblem(text: string): "empty" | "too-long" | null {
  if (!text.trim()) return "empty";
  if (text.length > MAX_TEXT_CHARS) return "too-long";
  return null;
}

/** Upper bound on the encoded chunk header, worst case escaping included. */
export function maxHeaderByteLength(): number {
  return HEADER_BUDGET_BYTES;
}

/** Total wire size of a frame: 4-byte length prefix + header + chunk. */
export function frameByteLength(
  headerBytes: number,
  chunkBytes: number,
): number {
  return 4 + headerBytes + chunkBytes;
}

/**
 * Chunk size for a given file size. Larger files get larger chunks to cut
 * per-frame overhead, but never past `MAX_CHUNK_BYTES`.
 */
export function pickChunkSize(fileSize: number): number {
  const KB = 1024;
  const MB = 1024 * KB;
  let chunk: number;
  if (!(fileSize > 0)) chunk = 32 * KB;
  else if (fileSize < 256 * KB) chunk = 32 * KB;
  else if (fileSize < 1 * MB) chunk = 64 * KB;
  else if (fileSize < 5 * MB) chunk = 128 * KB;
  else if (fileSize < 10 * MB) chunk = 256 * KB;
  else chunk = MAX_CHUNK_BYTES;
  return Math.min(chunk, MAX_CHUNK_BYTES);
}

/**
 * Whether a received transfer is byte-for-byte complete.
 *
 * The receiver previously assembled a download from whatever chunks happened to
 * arrive, so a dropped chunk produced a silently truncated file reported as a
 * success. Nothing may be written to disk unless this returns true.
 */
export function isTransferComplete(
  bytesReceived: number,
  expectedSize: number,
): boolean {
  return expectedSize > 0 && bytesReceived === expectedSize;
}

/** Whether accepting `incomingBytes` would overshoot the declared size. */
export function wouldExceedExpectedSize(
  bytesReceived: number,
  incomingBytes: number,
  expectedSize: number,
): boolean {
  return bytesReceived + incomingBytes > expectedSize;
}
