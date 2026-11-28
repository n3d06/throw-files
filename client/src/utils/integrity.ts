// End-to-end integrity check for a transfer.
//
// Web Crypto can't hash a stream incrementally, so each chunk is hashed as it
// is sent or received (natively, off the main thread), and the file's hash is
// SHA-256 over the chunk hashes in order. Both paths keep chunk boundaries
// (one WebSocket frame or one DataChannel message per chunk), so sender and
// receiver hash exactly the same pieces. Any missing, extra, reordered or
// altered byte changes the result.

/** Whether this page can hash (Web Crypto needs HTTPS or localhost). */
export function canHash(): boolean {
  return typeof crypto !== "undefined" && typeof crypto.subtle?.digest === "function";
}

export class ChunkHasher {
  private parts: Promise<ArrayBuffer>[] = [];

  /** Queue one chunk; call in the order the chunks travel. */
  add(chunk: ArrayBuffer | Uint8Array<ArrayBuffer>): void {
    // digest() copies the bytes synchronously, so the caller may reuse them.
    this.parts.push(crypto.subtle.digest("SHA-256", chunk));
  }

  /** Lowercase hex SHA-256 over the chunk hashes. */
  async hex(): Promise<string> {
    const digests = await Promise.all(this.parts);
    const all = new Uint8Array(digests.length * 32);
    digests.forEach((d, i) => all.set(new Uint8Array(d), i * 32));
    const final = new Uint8Array(await crypto.subtle.digest("SHA-256", all));
    return Array.from(final, (b) => b.toString(16).padStart(2, "0")).join("");
  }
}

/** A hash a peer sent us, if it is well formed. */
export function parseHash(value: unknown): string | undefined {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) ? value : undefined;
}
