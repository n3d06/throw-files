# ThrowMyFile – Copilot Instructions

## What this project is

A file-sharing SPA at [tf.n3d.site](https://tf.n3d.site). Nothing is stored.
A file travels one of two ways (the Auto / P2P / Relay switch):

- **P2P**: a WebRTC DataChannel between the browsers, end-to-end encrypted
  (DTLS). The Worker only forwards signalling ("rtc" messages). STUN only, no
  TURN, so strict NAT (most mobile data) falls back to the relay in Auto mode.
- **Relay**: chunks over a WebSocket through a Cloudflare Worker + Durable
  Object. Not end-to-end encrypted; decrypted at the Worker to be forwarded.

Be precise about which path a claim applies to. The frontend is React 18 built
with Rsbuild.

## Commands

```bash
# Root
npm run dev          # Frontend dev server (delegates to client/)
npm run dev:worker   # Worker locally on :8787
npm run build        # Install client deps + build client
npm test             # vitest (client)
npm run typecheck    # tsc for worker + client
npx wrangler deploy  # Deploy worker
```

## Architecture

```
worker/         Cloudflare Worker (relay)
client/src/     React 18 SPA
```

### Worker

- **`worker/index.ts`** — Entry point. Validates the `Origin` header and the
  `?channel=` code on WebSocket upgrades, then routes to **one Durable Object per
  channel** via `idFromName("channel:" + code)`. Non-WebSocket requests never
  touch a DO.
- **`worker/channel.ts`** — `ThrowFilesChannel`. One instance per channel, using
  the **WebSocket Hibernation API**. Because the DO is per-channel,
  `getWebSockets()` already returns exactly that channel's members — do not
  reintroduce per-chunk attachment filtering on the relay path.

**Connecting is joining.** Membership is established from the upgrade URL before
any frame can arrive; there is no `channel-join` handshake message.

**Message types:**
| Type | Direction | Purpose |
|------|-----------|---------|
| `file-offer` / `file-accept` / `file-decline` | client → DO → clients | Consent before any bytes; `file-accept` carries `p2p` and the receiver's P2P id `from` |
| `file-start` | client → DO | Announce a relay transfer |
| `file-done` | client → DO | Relay transfer finished; carries `sha256` |
| `file-abort` | client → DO | Sender cancelled or failed (`reason: "p2p-failed"`) |
| `rtc` | client → DO → clients | WebRTC signalling and P2P discovery (id `"probe"`); forwarded unread |
| `text` | client → DO → clients | Text snippet |
| Binary frame | client → DO → clients | File chunk relay |
| `ping` | client → DO | Keepalive, auto-answered without waking the DO |

**Binary frame:** `[uint32 header_length][JSON header][chunk bytes]`

### Client

- **`utils/channel.ts`** — Channel code rules. Codes are **exactly 6** chars
  `[A-Z0-9]`. Anything accepting user or URL input must go through
  `normalizeChannelCode` and `isValidChannelCode`. Unit-tested.
- **`utils/transfer.ts`** — Size limits and integrity checks. Cloudflare rejects
  WebSocket messages over **1 MiB**, so `MAX_CHUNK_BYTES` is 512 KiB and
  `pickChunkSize` must never exceed it. `isTransferComplete` gates every
  download — never hand the user bytes without it. Unit-tested.
- **`utils/format.ts`** — `formatFileSize`, `trimFileName`. Unit-tested.
- **`utils/throw-socket.ts`** — WebSocket wrapper. One connection per channel;
  `setChannel()` reconnects. File chunks are **never queued** across a reconnect
  (the receiver's byte offset would no longer match). Exposes a `state` event.
- **`utils/throw-file-upload.ts`** — Sender. Uploads run **sequentially**.
  Picks P2P or relay per file (`transfer-mode.ts`). P2P files only ever go
  over the link `peer-links.ts` opened when the receiver joined; there is no
  per-file connection. The channel is passed to
  `submitFiles(files, channel)`; do not resurrect the old pattern of mutating a
  descriptor from inside an event handler.
- **`utils/p2p.ts`** — One WebRTC connection: signalling over "rtc", one ICE
  restart, DataChannel back-pressure (stay under Chrome's 16 MB send queue, or
  the channel closes).
- **`utils/peer-links.ts`** — Connects P2P to every device as it joins, keeps the
  connection open, and opens a `file:<id>` DataChannel per transfer on it.
- **`utils/receive-sink.ts`** — Receiver storage (disk via File System Access,
  or memory), written in 4 MB batches.
- **`utils/integrity.ts`** — SHA-256 over per-chunk hashes; both paths send it
  with "done" and the receiver discards a file that doesn't match.
- **`pages/home/index.tsx`** — Transfer UI logic. **`pages/home/styles.ts`** —
  its styled-components. Keep them separate. `snackbar.tsx`, `qr-modal.tsx`
  and `history-modal.tsx` beside them are the page's own dialogs.
- **`App.tsx`** — React Router v5: `/`, `/privacy-policy`, and a catch-all 404.

## Key Conventions

### Product claims

The privacy policy, the README and the on-page badges must describe both paths
accurately: P2P is end-to-end encrypted but shares IP addresses with the other
devices and the STUN servers; the relay is not end-to-end encrypted. Relay mode
must make no WebRTC connection at all.

### Received files

Never auto-download. Completed transfers land in a "ready to save" list and wait
for an explicit click.

### Channel joins

Joining is an explicit action (button, Enter, generate, or a valid `?channel=` on
load). Never join from a keystroke handler, and use `history.replaceState` for
the URL — `pushState` traps the Back button.

### Styling

- **styled-components** (v5) for components; **LESS** (`App.less`) for globals
  and CSS variables.
- No remote CSS or font imports — a privacy-first app must not call out to a CDN.
- Text colours must clear WCAG AA 4.5:1. `--text-muted` and `--text-tertiary`
  were retuned for this; check before darkening them again.
- Every animation must be covered by the `prefers-reduced-motion` block in
  `App.less`.

### TypeScript

Strict everywhere. Root `tsconfig.json` covers `worker/`; `client/tsconfig.json`
covers the frontend. Client path alias: `@/*` → `./src/*`.

### Environment variables

`window.ENV.*` is a **build-time** substitution performed by the `define` plugin
in `rsbuild.config.js` — not a runtime lookup. Values come from
`client/.env.<mode>` and require a rebuild to change.

### Cloudflare deployment

- One Worker (`throw-files`) serves both the API (Durable Object) and the built
  frontend (`client/build`, via the `[assets]` block in `wrangler.toml`).
- The only serving domain is `tf.n3d.site` (`CANONICAL_ORIGIN` in
  `worker/index.ts`, the CSP `connect-src` in `client/public/_headers`), a
  custom domain attached **in the dashboard** (not in `wrangler.toml`).
  `throw-files.n3d.site` and `workers.dev` stay attached only to 308-redirect
  to it (`LEGACY_HOSTS`).
- CI: Cloudflare Workers Builds (Worker → Settings → Builds) runs
  `npm run build` then `npx wrangler deploy` on every push to `master`. There is
  no GitHub Actions workflow and no test gate, so run `npm test` locally.
