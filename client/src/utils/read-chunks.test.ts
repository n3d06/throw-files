import { describe, expect, test } from "vitest";
import { READ_BLOCK_BYTES, ReadError, readChunks } from "./read-chunks";

async function collect(file: Blob, chunkSize: number): Promise<Uint8Array[]> {
  const out: Uint8Array[] = [];
  for await (const chunk of readChunks(file, chunkSize)) out.push(chunk.slice());
  return out;
}

describe("readChunks", () => {
  test("yields every byte in order, in chunk-sized pieces", async () => {
    const size = READ_BLOCK_BYTES * 2 + 12_345; // spans block boundaries
    const bytes = new Uint8Array(size);
    for (let i = 0; i < size; i++) bytes[i] = (i * 7) & 255;
    const chunks = await collect(new Blob([bytes]), 64 * 1024);
    expect(chunks.slice(0, -1).every((c) => c.byteLength === 64 * 1024)).toBe(true);
    const joined = new Uint8Array(size);
    let at = 0;
    for (const c of chunks) {
      joined.set(c, at);
      at += c.byteLength;
    }
    expect(at).toBe(size);
    // Compared by hand: toEqual on 8 MB typed arrays exhausts the heap.
    expect(joined.every((b, i) => b === bytes[i])).toBe(true);
  });

  test("yields nothing for an empty file", async () => {
    expect(await collect(new Blob([]), 1024)).toEqual([]);
  });

  test("turns a failed read into ReadError", async () => {
    const broken = {
      size: 10,
      slice: () => ({ arrayBuffer: () => Promise.reject(new Error("gone")) }),
    } as unknown as Blob;
    await expect(collect(broken, 4)).rejects.toBeInstanceOf(ReadError);
  });
});
