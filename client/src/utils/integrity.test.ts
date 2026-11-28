import { describe, expect, test } from "vitest";
import { ChunkHasher, parseHash } from "./integrity";

const bytes = (...values: number[]) => new Uint8Array(values).buffer;

async function hashOf(chunks: ArrayBuffer[]): Promise<string> {
  const hasher = new ChunkHasher();
  chunks.forEach((c) => hasher.add(c));
  return hasher.hex();
}

describe("ChunkHasher", () => {
  test("is the same for the same chunks", async () => {
    const a = await hashOf([bytes(1, 2), bytes(3)]);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashOf([bytes(1, 2), bytes(3)])).toBe(a);
  });

  test("changes on an altered, missing or reordered chunk", async () => {
    const a = await hashOf([bytes(1, 2), bytes(3)]);
    expect(await hashOf([bytes(1, 9), bytes(3)])).not.toBe(a);
    expect(await hashOf([bytes(1, 2)])).not.toBe(a);
    expect(await hashOf([bytes(3), bytes(1, 2)])).not.toBe(a);
  });
});

describe("parseHash", () => {
  test("accepts only 64 lowercase hex characters", () => {
    expect(parseHash("a".repeat(64))).toBe("a".repeat(64));
    expect(parseHash("A".repeat(64))).toBeUndefined();
    expect(parseHash(42)).toBeUndefined();
  });
});
