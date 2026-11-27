import { describe, expect, test } from "vitest";
import {
  MAX_CHUNK_BYTES,
  MAX_FILE_BYTES,
  MAX_FILENAME_LENGTH,
  MAX_TEXT_CHARS,
  MAX_WS_MESSAGE_BYTES,
  frameByteLength,
  isTransferComplete,
  maxHeaderByteLength,
  MAX_PREVIEW_BYTES,
  isPreviewableImage,
  pickChunkSize,
  textSendProblem,
  wouldExceedExpectedSize,
} from "./transfer";

describe("isPreviewableImage", () => {
  test("accepts common image types", () => {
    for (const type of ["image/png", "image/jpeg", "image/webp", "IMAGE/GIF"]) {
      expect(isPreviewableImage(type, 1000)).toBe(true);
    }
  });

  test("rejects non-images, empty files and huge files", () => {
    expect(isPreviewableImage("application/pdf", 1000)).toBe(false);
    expect(isPreviewableImage("application/zip", 1000)).toBe(false);
    expect(isPreviewableImage("", 1000)).toBe(false);
    expect(isPreviewableImage("image/png", 0)).toBe(false);
    expect(isPreviewableImage("image/png", MAX_PREVIEW_BYTES + 1)).toBe(false);
  });
});

describe("textSendProblem", () => {
  test("rejects blank text", () => {
    expect(textSendProblem("")).toBe("empty");
    expect(textSendProblem("  \n\t ")).toBe("empty");
  });

  test("accepts text up to the limit", () => {
    expect(textSendProblem("hello")).toBeNull();
    expect(textSendProblem("a".repeat(MAX_TEXT_CHARS))).toBeNull();
  });

  test("rejects text over the limit", () => {
    expect(textSendProblem("a".repeat(MAX_TEXT_CHARS + 1))).toBe("too-long");
  });

  test("worst-case JSON-escaped text still fits one WebSocket frame", () => {
    // "\u0000" escapes to 6 bytes per character.
    const frame = JSON.stringify({ type: "text", text: "\u0000".repeat(MAX_TEXT_CHARS) });
    expect(new TextEncoder().encode(frame).byteLength).toBeLessThan(MAX_WS_MESSAGE_BYTES);
  });
});

const KB = 1024;
const MB = 1024 * KB;

describe("pickChunkSize", () => {
  test("scales up with file size", () => {
    expect(pickChunkSize(100 * KB)).toBeLessThan(pickChunkSize(80 * MB));
  });

  test("never exceeds the chunk ceiling, even for huge files", () => {
    for (const size of [1, 1 * MB, 100 * MB, 1024 * MB, MAX_FILE_BYTES]) {
      expect(pickChunkSize(size)).toBeLessThanOrEqual(MAX_CHUNK_BYTES);
    }
  });

  test("is monotonically non-decreasing", () => {
    let previous = 0;
    for (let size = 1; size < 512 * MB; size = Math.ceil(size * 1.7)) {
      const current = pickChunkSize(size);
      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });

  test("always returns a positive size", () => {
    expect(pickChunkSize(0)).toBeGreaterThan(0);
    expect(pickChunkSize(-1)).toBeGreaterThan(0);
  });
});

describe("frame size safety", () => {
  // Cloudflare Durable Objects reject WebSocket messages over 1 MiB. Every
  // frame is [uint32 header length][header JSON][chunk], so the chunk ceiling
  // plus the largest possible header must still fit.
  test("worst-case frame fits inside the WebSocket message limit", () => {
    const worstCase = frameByteLength(maxHeaderByteLength(), MAX_CHUNK_BYTES);
    expect(worstCase).toBeLessThanOrEqual(MAX_WS_MESSAGE_BYTES);
  });

  test("every chunk size pickChunkSize can return produces a legal frame", () => {
    for (const size of [1, 300 * KB, 2 * MB, 40 * MB, 90 * MB, 900 * MB]) {
      const frame = frameByteLength(maxHeaderByteLength(), pickChunkSize(size));
      expect(frame).toBeLessThanOrEqual(MAX_WS_MESSAGE_BYTES);
    }
  });

  test("header budget covers a maximum-length UTF-8 filename", () => {
    const header = JSON.stringify({
      type: "file-chunk",
      id: "x".repeat(32),
      channel: "ABC123",
      name: "é".repeat(MAX_FILENAME_LENGTH),
      fileType: "x".repeat(255),
      size: MAX_FILE_BYTES,
      compressed: true,
    });
    expect(new TextEncoder().encode(header).byteLength).toBeLessThanOrEqual(
      maxHeaderByteLength(),
    );
  });

  test("frameByteLength accounts for the 4-byte length prefix", () => {
    expect(frameByteLength(10, 100)).toBe(114);
  });
});

describe("isTransferComplete", () => {
  test("is true only when every expected byte arrived", () => {
    expect(isTransferComplete(1000, 1000)).toBe(true);
  });

  test("is false when bytes are missing", () => {
    expect(isTransferComplete(999, 1000)).toBe(false);
  });

  test("is false when more bytes arrived than expected", () => {
    expect(isTransferComplete(1001, 1000)).toBe(false);
  });

  test("is false when nothing arrived", () => {
    expect(isTransferComplete(0, 1000)).toBe(false);
  });

  test("is false for a zero-byte expectation", () => {
    expect(isTransferComplete(0, 0)).toBe(false);
  });
});

describe("wouldExceedExpectedSize", () => {
  test("allows a chunk that exactly completes the file", () => {
    expect(wouldExceedExpectedSize(900, 100, 1000)).toBe(false);
  });

  test("rejects a chunk that overshoots the declared size", () => {
    expect(wouldExceedExpectedSize(900, 101, 1000)).toBe(true);
  });
});
