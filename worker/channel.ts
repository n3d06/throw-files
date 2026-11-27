interface Attachment {
  channel: string;
}

interface ChunkHeader {
  type: "file-chunk";
  id: string;
  channel: string;
  name: string;
  fileType: string;
  size: number;
  compressed: boolean;
}

/** Most devices allowed on one channel; stops a guessed code from being flooded. */
const MAX_CHANNEL_SOCKETS = 8;

/** Must match MAX_WS_MESSAGE_BYTES in client/src/utils/transfer.ts. */
const MAX_MESSAGE_BYTES = 1024 * 1024;

/** Must match MAX_TEXT_CHARS in client/src/utils/transfer.ts. */
const MAX_TEXT_CHARS = 50_000;

/** An SDP is a few KB; this leaves headroom without relaying junk. */
const MAX_RTC_SIGNAL_CHARS = 32_000;

/**
 * Durable Object that relays one channel's WebSocket traffic.
 *
 * There is one instance per channel code (see worker/index.ts), so
 * `getWebSockets()` already returns exactly this channel's members — no
 * per-chunk filtering or attachment deserialization is needed on the hot path.
 *
 * Uses the WebSocket Hibernation API so the DO sleeps between messages. Channel
 * membership is derived entirely from live sockets; nothing is persisted.
 */
export class ThrowFilesChannel {
  private ctx: DurableObjectState;

  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
    // Auto-respond to client keepalives without waking the DO.
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    if (this.ctx.getWebSockets().length >= MAX_CHANNEL_SOCKETS) {
      return new Response("Channel is full", { status: 429 });
    }

    // index.ts has already validated this.
    const channel = new URL(request.url).searchParams.get("channel") as string;

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);

    // Membership is recorded here, from the upgrade URL, so it exists before any
    // frame can arrive. The old protocol joined via a follow-up message, which
    // meant chunks flushed immediately after a reconnect hit a socket with no
    // channel yet and were dropped on the floor.
    //
    // The greeting itself waits for the client's "hello" rather than being sent
    // here — delivery of a send() issued before this 101 is returned is not
    // guaranteed.
    server.serializeAttachment({ channel } satisfies Attachment);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    const { channel } = (ws.deserializeAttachment() as Attachment) ?? {};
    if (!channel) return;

    if (message instanceof ArrayBuffer) {
      if (message.byteLength > MAX_MESSAGE_BYTES) return;

      // Binary frame = file chunk. [uint32 header_len][header JSON][chunk].
      // Verify the header's channel matches the socket's before relaying.
      try {
        if (message.byteLength < 4) return;
        const headerLen = new DataView(message).getUint32(0, false);
        if (headerLen === 0 || headerLen > message.byteLength - 4) return;
        const header = JSON.parse(
          new TextDecoder().decode(message.slice(4, 4 + headerLen)),
        ) as ChunkHeader;
        if (header.channel !== channel) return;
      } catch {
        return;
      }

      this.relayBinary(message, ws);
      return;
    }

    if (message.length > MAX_MESSAGE_BYTES) return;

    let msg: { type: string; [key: string]: unknown };
    try {
      msg = JSON.parse(message);
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
      return;
    }

    switch (msg.type) {
      // Sent by the client as soon as its socket opens. Acknowledging here
      // rather than during the upgrade guarantees the client is listening.
      case "hello":
        this.send(ws, {
          type: "channel-joined",
          channel,
          message: "Connected.",
        });
        this.broadcast({ type: "user-joined", channel }, ws);
        this.broadcastConnections();
        break;
      case "file-start":
        this.broadcast(
          {
            type: "file-incoming",
            channel,
            id: String(msg.id ?? ""),
            name: String(msg.name ?? ""),
            size: Number(msg.size ?? 0),
          },
          ws,
        );
        break;
      case "file-done":
        this.broadcast(
          {
            type: "file-done",
            channel,
            id: String(msg.id ?? ""),
            name: String(msg.name ?? ""),
            fileType: String(msg.fileType ?? ""),
            size: Number(msg.size ?? 0),
          },
          ws,
        );
        break;
      // Consent before data: the sender offers a file, receivers answer, and
      // chunks only flow after an accept. The relay just forwards the three.
      case "file-offer":
        this.broadcast(
          {
            type: "file-offer",
            channel,
            id: String(msg.id ?? ""),
            name: String(msg.name ?? "").slice(0, 255),
            fileType: String(msg.fileType ?? "").slice(0, 255),
            size: Number(msg.size ?? 0),
            compressed: Boolean(msg.compressed),
          },
          ws,
        );
        break;
      case "file-accept":
        this.broadcast(
          {
            type: "file-accept",
            channel,
            id: String(msg.id ?? ""),
            // The receiver is willing to take this file over WebRTC.
            p2p: msg.p2p === true,
          },
          ws,
        );
        break;
      case "file-decline":
        this.broadcast(
          { type: "file-decline", channel, id: String(msg.id ?? "") },
          ws,
        );
        break;
      // WebRTC signalling (SDP and ICE candidates) for a P2P transfer. The
      // file itself then goes device-to-device and never reaches the Worker.
      case "rtc": {
        const data = msg.data;
        if (typeof data !== "string" || data.length > MAX_RTC_SIGNAL_CHARS) break;
        this.broadcast(
          { type: "rtc", channel, id: String(msg.id ?? ""), data },
          ws,
        );
        break;
      }
      // A text snippet goes out in one control frame — no chunking needed.
      case "text": {
        const text = msg.text;
        if (typeof text !== "string" || !text.trim()) break;
        if (text.length > MAX_TEXT_CHARS) break;
        this.broadcast(
          {
            type: "text",
            channel,
            id: String(msg.id ?? ""),
            text,
          },
          ws,
        );
        break;
      }
      case "file-abort":
        this.broadcast(
          {
            type: "file-abort",
            channel,
            id: String(msg.id ?? ""),
            name: String(msg.name ?? ""),
            // Why the sender stopped; only known values are passed on.
            reason: msg.reason === "p2p-failed" ? "p2p-failed" : undefined,
          },
          ws,
        );
        break;
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
  ): Promise<void> {
    // Complete the closing handshake, otherwise the server half lingers.
    // 1006 is never a valid close code to send back.
    try {
      ws.close(code === 1006 ? 1000 : code, reason);
    } catch {
      /* already closed */
    }
    this.broadcastConnections(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.broadcastConnections(ws);
  }

  // ── Broadcast helpers ─────────────────────────────────────────────────────

  private send(ws: WebSocket, payload: object): void {
    try {
      ws.send(JSON.stringify(payload));
    } catch (error) {
      console.error("Failed to send message to client:", error);
    }
  }

  private peers(exclude?: WebSocket): WebSocket[] {
    const sockets = this.ctx.getWebSockets();
    return exclude ? sockets.filter((ws) => ws !== exclude) : sockets;
  }

  private broadcast(payload: object, exclude?: WebSocket): void {
    const msg = JSON.stringify(payload);
    for (const client of this.peers(exclude)) {
      try {
        client.send(msg);
      } catch (error) {
        console.error("Failed to send message to client:", error);
      }
    }
  }

  private relayBinary(data: ArrayBuffer, exclude: WebSocket): void {
    for (const client of this.peers(exclude)) {
      try {
        client.send(data);
      } catch {
        /* peer went away mid-relay */
      }
    }
  }

  /**
   * Broadcast the live member count.
   *
   * `closing` is excluded explicitly: during webSocketClose the socket can
   * still appear in getWebSockets(), which used to report a count one higher
   * than reality to everyone left in the channel.
   */
  private broadcastConnections(closing?: WebSocket): void {
    const remaining = this.peers(closing);
    const msg = JSON.stringify({ type: "connections", count: remaining.length });
    for (const client of remaining) {
      try {
        client.send(msg);
      } catch {
        /* peer went away */
      }
    }
  }
}
