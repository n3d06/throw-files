import { describe, expect, test, vi } from "vitest";
import { DiskSink, MemorySink, type SaveFileHandle } from "./receive-sink";

const bytes = (...values: number[]) => new Uint8Array(values).buffer;

function fakeHandle() {
  const written: number[] = [];
  const stream = {
    write: vi.fn(async (data: ArrayBuffer | Blob) => {
      written.push(...new Uint8Array(data as ArrayBuffer));
    }),
    close: vi.fn(async () => {}),
    abort: vi.fn(async () => {}),
  };
  const handle: SaveFileHandle = {
    name: "out.bin",
    createWritable: async () => stream,
    getFile: async () => new File([new Uint8Array(written)], "out.bin"),
  };
  return { handle, stream, written };
}

describe("MemorySink", () => {
  test("assembles chunks in order", async () => {
    const sink = new MemorySink();
    sink.write(bytes(1, 2));
    sink.write(bytes(3));
    const blob = await sink.close("application/octet-stream");
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3]),
    );
  });
});

describe("DiskSink", () => {
  test("writes chunks in order and returns the saved file", async () => {
    const { handle, stream, written } = fakeHandle();
    const sink = new DiskSink(handle, stream);
    sink.write(bytes(1, 2));
    sink.write(bytes(3));
    const file = await sink.close();
    expect(written).toEqual([1, 2, 3]);
    expect(stream.close).toHaveBeenCalledOnce();
    expect(file.size).toBe(3);
  });

  test("a failed write aborts the file and rejects close()", async () => {
    const { handle, stream } = fakeHandle();
    stream.write.mockRejectedValueOnce(new Error("disk full"));
    const sink = new DiskSink(handle, stream);
    sink.write(bytes(1));
    sink.write(bytes(2));
    await expect(sink.close()).rejects.toThrow("disk full");
    expect(stream.abort).toHaveBeenCalled();
    expect(stream.close).not.toHaveBeenCalled();
  });

  test("abort discards the file and ignores later writes", async () => {
    const { handle, stream } = fakeHandle();
    const sink = new DiskSink(handle, stream);
    sink.write(bytes(1));
    sink.abort();
    sink.write(bytes(2));
    await new Promise((r) => setTimeout(r, 0));
    expect(stream.abort).toHaveBeenCalledOnce();
    expect(stream.write).toHaveBeenCalledTimes(1);
  });
});
