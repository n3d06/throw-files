// Read a file for sending.
//
// Reading 64 KB at a time meant one disk round trip per chunk, with the
// network idle while it waited. Instead the file is read in blocks of a few
// MB, the next block is requested while the current one is being sent, and
// each block is handed out as chunk-sized views (no copying).

export const READ_BLOCK_BYTES = 4 * 1024 * 1024;

/** Thrown when the file can't be read (moved, deleted, permission lost). */
export class ReadError extends Error {}

export async function* readChunks(
  file: Blob,
  chunkSize: number,
): AsyncGenerator<Uint8Array<ArrayBuffer>> {
  // A whole number of chunks per block keeps every chunk full-sized.
  const blockSize = chunkSize * Math.max(1, Math.ceil(READ_BLOCK_BYTES / chunkSize));
  const read = (start: number): Promise<ArrayBuffer> | null => {
    if (start >= file.size) return null;
    const pending = file
      .slice(start, start + blockSize)
      .arrayBuffer()
      .catch(() => {
        throw new ReadError("Could not read the file");
      });
    // If sending stops early, nobody awaits this read: don't let its failure
    // surface as an unhandled rejection.
    pending.catch(() => undefined);
    return pending;
  };

  let start = 0;
  let next = read(0);
  while (next) {
    const block = await next;
    if (block.byteLength === 0) return;
    start += block.byteLength;
    next = read(start); // read ahead while this block goes out
    for (let i = 0; i < block.byteLength; i += chunkSize) {
      yield new Uint8Array(block, i, Math.min(chunkSize, block.byteLength - i));
    }
  }
}
