// Where a received file's bytes go while they arrive.
//
// DiskSink streams each chunk straight into a file the user picked when they
// accepted the offer (File System Access API, Chromium desktop), so memory
// stays flat even for multi-gigabyte files. MemorySink is the fallback for
// browsers without that API: chunks pile up in the tab until the user saves.

/** Minimal File System Access typings; not in every TS DOM lib yet. */
interface WritableFileStream {
  write(data: ArrayBuffer | Blob): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
}

export interface SaveFileHandle {
  name: string;
  createWritable(): Promise<WritableFileStream>;
  getFile(): Promise<File>;
}

type ShowSaveFilePicker = (options?: {
  suggestedName?: string;
}) => Promise<SaveFileHandle>;

export interface ReceiveSink {
  /** True when bytes go to a user-chosen file rather than memory. */
  readonly onDisk: boolean;
  /** Queue a chunk. Writes happen in order; failures surface from close(). */
  write(chunk: ArrayBuffer): void;
  /**
   * Finish the file. A disk sink returns the saved file (backed by disk, so
   * reading it for a preview does not load it into memory up front); a
   * memory sink returns the assembled blob.
   */
  close(type: string): Promise<Blob>;
  /** Drop everything written so far. Safe to call more than once. */
  abort(): void;
}

/**
 * Chunks arrive at 64 KB. Writing (or wrapping in a Blob) each one alone is
 * far slower than handling a few MB at once, so both sinks gather chunks up
 * to this size first.
 */
export const SINK_BATCH_BYTES = 4 * 1024 * 1024;

/** Collects chunks and hands them on in batches of about SINK_BATCH_BYTES. */
class Batcher {
  private parts: ArrayBuffer[] = [];
  private bytes = 0;

  /** Add a chunk; returns a full batch to write, or null. */
  add(chunk: ArrayBuffer): Blob | null {
    this.parts.push(chunk);
    this.bytes += chunk.byteLength;
    return this.bytes >= SINK_BATCH_BYTES ? this.take() : null;
  }

  /** Whatever is left, or null when nothing is. */
  take(): Blob | null {
    if (this.parts.length === 0) return null;
    const blob = new Blob(this.parts);
    this.parts = [];
    this.bytes = 0;
    return blob;
  }
}

export class MemorySink implements ReceiveSink {
  readonly onDisk = false;
  private chunks: Blob[] = [];
  private batch = new Batcher();

  write(chunk: ArrayBuffer): void {
    const full = this.batch.add(chunk);
    if (full) this.chunks.push(full);
  }

  async close(type: string): Promise<Blob> {
    const rest = this.batch.take();
    if (rest) this.chunks.push(rest);
    const blob = new Blob(this.chunks, { type });
    this.chunks = [];
    return blob;
  }

  abort(): void {
    this.chunks = [];
    this.batch = new Batcher();
  }
}

export class DiskSink implements ReceiveSink {
  readonly onDisk = true;
  private tail: Promise<void> = Promise.resolve();
  private failed: unknown = null;
  private done = false;
  private batch = new Batcher();

  constructor(
    private readonly handle: SaveFileHandle,
    private readonly stream: WritableFileStream,
  ) {}

  write(chunk: ArrayBuffer): void {
    if (this.done) return;
    const full = this.batch.add(chunk);
    if (full) this.enqueue(full);
  }

  private enqueue(data: Blob): void {
    this.tail = this.tail
      .then(() => (this.failed ? undefined : this.stream.write(data)))
      .catch((error) => {
        this.failed = error;
      });
  }

  async close(): Promise<Blob> {
    if (!this.done) {
      const rest = this.batch.take();
      if (rest) this.enqueue(rest);
    }
    this.done = true;
    await this.tail;
    if (this.failed) {
      await this.stream.abort().catch(() => {});
      throw this.failed instanceof Error
        ? this.failed
        : new Error("Writing the file to disk failed.");
    }
    await this.stream.close();
    return this.handle.getFile();
  }

  abort(): void {
    if (this.done) return;
    this.done = true;
    // abort() discards the temporary swap file, so no partial file is left.
    void this.tail.then(() => this.stream.abort()).catch(() => {});
  }
}

/** Whether this browser can stream a download straight to a chosen file. */
export function canSaveToDisk(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as { showSaveFilePicker?: unknown }).showSaveFilePicker ===
      "function"
  );
}

/**
 * Ask where to save `suggestedName` and open it for writing. Must run inside
 * a user gesture (the Accept click). Resolves to null if the user closed the
 * picker, and to a MemorySink when the browser has no save picker.
 */
export async function openReceiveSink(
  suggestedName: string,
): Promise<ReceiveSink | null> {
  if (!canSaveToDisk()) return new MemorySink();
  const picker = (window as unknown as { showSaveFilePicker: ShowSaveFilePicker })
    .showSaveFilePicker;
  let handle: SaveFileHandle;
  try {
    handle = await picker({ suggestedName });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return null;
    throw error;
  }
  return new DiskSink(handle, await handle.createWritable());
}
