// Chunked file sender.
//
// Wire format (must match worker/channel.ts):
//   [uint32 big-endian: header byte length][header JSON][chunk bytes]

import type { ThrowSocket } from "./throw-socket";
import { formatFileSize } from "./format";
import {
  MAX_FILE_BYTES,
  MAX_FILENAME_LENGTH,
  pickChunkSize,
} from "./transfer";

export const UploadError = {
  TooLarge: "too-large",
  Empty: "empty",
  BadName: "bad-name",
  Cancelled: "cancelled",
  ReadFailed: "read-failed",
  Disconnected: "disconnected",
  Declined: "declined",
  NoAnswer: "no-answer",
} as const;

/** How long an offer waits for someone on the channel to accept it. */
export const OFFER_TIMEOUT_MS = 2 * 60 * 1000;

type Answer = "accept" | "decline" | "cancelled" | "timeout" | "disconnected";

export type UploadErrorCode = (typeof UploadError)[keyof typeof UploadError];

export interface UploadFileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  compressed: boolean;
}

export interface UploadErrorEvent {
  id: string | null;
  code: UploadErrorCode;
  message: string;
}

interface Events {
  /** Offered and waiting for a receiver to accept; no data sent yet. */
  offer: { file: UploadFileInfo };
  /** Accepted: bytes start flowing. */
  start: { file: UploadFileInfo };
  progress: { id: string; bytesSent: number; size: number };
  complete: { file: UploadFileInfo };
  error: UploadErrorEvent;
}

type Listener<K extends keyof Events> = (payload: Events[K]) => void;

/** Pause chunking once this much data is sitting in the socket buffer. */
const MAX_BUFFERED_BYTES = 4 * 1024 * 1024;
const DRAIN_POLL_MS = 50;

export type SubmitFile = File & { compressed?: boolean };

class ThrowFileUpload {
  socket: ThrowSocket;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners: Map<string, ((payload: any) => void)[]> = new Map();
  private aborted: Set<string> = new Set();
  private active: Set<string> = new Set();
  /** Offers still waiting for an answer, keyed by transfer id. */
  private pending: Map<
    string,
    { answer: (a: Answer) => void; declines: number }
  > = new Map();
  /** Other devices on the channel; an offer fails once all have declined. */
  private readonly peerCount: () => number;

  private readonly onDisconnected = () => {
    this.pending.forEach((p) => p.answer("disconnected"));
    this.abortAll();
  };

  private readonly onAccept = ({ id }: { id: string }) =>
    this.pending.get(id)?.answer("accept");

  private readonly onDecline = ({ id }: { id: string }) => {
    const p = this.pending.get(id);
    if (!p) return;
    p.declines += 1;
    if (p.declines >= Math.max(1, this.peerCount())) p.answer("decline");
  };

  constructor(socket: ThrowSocket, peerCount: () => number = () => 1) {
    this.socket = socket;
    this.peerCount = peerCount;
    // A dropped connection invalidates every in-flight byte offset.
    this.socket.on("disconnected", this.onDisconnected);
    this.socket.on("file-accept", this.onAccept);
    this.socket.on("file-decline", this.onDecline);
  }

  /**
   * Detach from the socket. The socket is a module singleton that outlives this
   * instance, so without this every remount would leave another "disconnected"
   * listener behind.
   */
  dispose(): void {
    this.pending.forEach((p) => p.answer("cancelled"));
    this.abortAll();
    this.socket.off("disconnected", this.onDisconnected);
    this.socket.off("file-accept", this.onAccept);
    this.socket.off("file-decline", this.onDecline);
  }

  addEventListener<K extends keyof Events>(type: K, handler: Listener<K>): void {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type)!.push(handler);
  }

  removeEventListener<K extends keyof Events>(
    type: K,
    handler: Listener<K>,
  ): void {
    const list = this.listeners.get(type);
    if (list) {
      this.listeners.set(
        type,
        list.filter((h) => h !== handler),
      );
    }
  }

  get hasActiveUploads(): boolean {
    return this.active.size > 0;
  }

  cancelUpload(fileId: string): void {
    this.pending.get(fileId)?.answer("cancelled");
    if (this.active.has(fileId)) this.aborted.add(fileId);
  }

  /** Resolves with the first decisive answer to the offer `id`. */
  private awaitAnswer(id: string): Promise<Answer> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => finish("timeout"), OFFER_TIMEOUT_MS);
      const finish = (a: Answer) => {
        if (!this.pending.has(id)) return;
        clearTimeout(timer);
        this.pending.delete(id);
        resolve(a);
      };
      this.pending.set(id, { answer: finish, declines: 0 });
    });
  }

  abortAll(): void {
    this.active.forEach((id) => this.aborted.add(id));
  }

  private dispatch<K extends keyof Events>(type: K, payload: Events[K]): void {
    [...(this.listeners.get(type) ?? [])].forEach((h) => h(payload));
  }

  /**
   * Upload files one after another.
   *
   * Sequential on purpose: concurrent uploads interleaved their chunk streams
   * over a single socket and fought over the shared back-pressure gate.
   */
  async submitFiles(files: SubmitFile[], channel: string): Promise<void> {
    for (const file of files) {
      await this.uploadFile(file, channel);
    }
  }

  private async uploadFile(file: SubmitFile, channel: string): Promise<void> {
    if (file.size > MAX_FILE_BYTES) {
      this.fail(null, UploadError.TooLarge, {
        message: `${file.name} is ${formatFileSize(file.size)} — the limit is ${formatFileSize(MAX_FILE_BYTES)}.`,
      });
      return;
    }
    if (file.size === 0) {
      this.fail(null, UploadError.Empty, {
        message: `${file.name} is empty, so there is nothing to send.`,
      });
      return;
    }
    if (!file.name || file.name.length > MAX_FILENAME_LENGTH) {
      this.fail(null, UploadError.BadName, {
        message: `File names must be 1–${MAX_FILENAME_LENGTH} characters.`,
      });
      return;
    }
    if (!this.socket.connected) {
      this.fail(null, UploadError.Disconnected, {
        message: "Not connected — join a channel before sending.",
      });
      return;
    }

    const id = crypto.randomUUID();
    const info: UploadFileInfo = {
      id,
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      compressed: file.compressed ?? false,
    };

    this.active.add(id);
    this.dispatch("offer", { file: info });

    // Nothing is sent until a receiver says yes, so an unwanted file never
    // costs bandwidth or lands in anyone's memory.
    this.socket.emit("file-offer", {
      id: info.id,
      name: info.name,
      fileType: info.type,
      size: info.size,
      compressed: info.compressed,
    });
    const answer = await this.awaitAnswer(id);
    if (answer !== "accept") {
      this.cleanup(id);
      // Closes the prompt on every other device still showing this offer.
      this.socket.emit("file-abort", { id: info.id, name: info.name });
      const { code, message } = {
        decline: { code: UploadError.Declined, message: `${info.name} was declined.` },
        timeout: {
          code: UploadError.NoAnswer,
          message: `Nobody accepted ${info.name} in time.`,
        },
        cancelled: { code: UploadError.Cancelled, message: `${info.name} was cancelled.` },
        disconnected: {
          code: UploadError.Disconnected,
          message: `Connection lost before ${info.name} was accepted.`,
        },
      }[answer];
      this.dispatch("error", { id, code, message });
      return;
    }

    this.dispatch("start", { file: info });
    this.socket.emit("file-start", {
      id: info.id,
      name: info.name,
      fileType: info.type,
      size: info.size,
      compressed: info.compressed,
    });

    const headerBytes = new TextEncoder().encode(
      JSON.stringify({
        type: "file-chunk",
        id: info.id,
        channel,
        name: info.name,
        fileType: info.type,
        size: info.size,
        compressed: info.compressed,
      }),
    );
    const chunkSize = pickChunkSize(file.size);

    try {
      let offset = 0;
      while (offset < file.size) {
        if (this.aborted.has(id)) return this.finishAborted(id, info);

        let chunk: ArrayBuffer;
        try {
          chunk = await file.slice(offset, offset + chunkSize).arrayBuffer();
        } catch {
          this.fail(id, UploadError.ReadFailed, {
            message: `Could not read ${info.name} from disk.`,
          });
          return;
        }

        // Back-pressure: let the socket drain so a slow link cannot make the
        // sender balloon its own memory.
        while (this.socket.bufferedAmount > MAX_BUFFERED_BYTES) {
          if (this.aborted.has(id)) return this.finishAborted(id, info);
          if (!this.socket.connected) {
            this.fail(id, UploadError.Disconnected, {
              message: `Connection lost while sending ${info.name}.`,
            });
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, DRAIN_POLL_MS));
        }

        if (this.aborted.has(id)) return this.finishAborted(id, info);

        const frame = new ArrayBuffer(4 + headerBytes.byteLength + chunk.byteLength);
        new DataView(frame).setUint32(0, headerBytes.byteLength, false);
        new Uint8Array(frame, 4, headerBytes.byteLength).set(headerBytes);
        new Uint8Array(frame, 4 + headerBytes.byteLength).set(
          new Uint8Array(chunk),
        );

        if (!this.socket.sendBinary(frame)) {
          this.fail(id, UploadError.Disconnected, {
            message: `Connection lost while sending ${info.name}.`,
          });
          return;
        }

        offset += chunk.byteLength;
        this.dispatch("progress", {
          id,
          bytesSent: offset,
          size: file.size,
        });
      }

      this.socket.emit("file-done", {
        id: info.id,
        name: info.name,
        fileType: info.type,
        size: info.size,
      });
      this.cleanup(id);
      this.dispatch("complete", { file: info });
    } catch (error) {
      this.fail(id, UploadError.ReadFailed, {
        message:
          error instanceof Error
            ? error.message
            : `Sending ${info.name} failed.`,
      });
    }
  }

  private finishAborted(id: string, info: UploadFileInfo): void {
    this.cleanup(id);
    // Let the receiver drop its partial buffer instead of waiting for a timeout.
    this.socket.emit("file-abort", { id: info.id, name: info.name });
    this.dispatch("error", {
      id,
      code: UploadError.Cancelled,
      message: `${info.name} was cancelled.`,
    });
  }

  private fail(
    id: string | null,
    code: UploadErrorCode,
    { message }: { message: string },
  ): void {
    if (id) {
      this.cleanup(id);
      this.socket.emit("file-abort", { id });
    }
    this.dispatch("error", { id, code, message });
  }

  private cleanup(id: string): void {
    this.active.delete(id);
    this.aborted.delete(id);
  }
}

export default ThrowFileUpload;
