# ThrowMyFile

Live: [https://tf.n3d.site](https://tf.n3d.site)
· Source: [github.com/n3d06/throw-files](https://github.com/n3d06/throw-files)

ThrowMyFile moves files between browsers without ever storing them. Open the
site on two devices, put the same channel code into both (or scan the QR code),
and send.

## How it works

- The sender's browser slices the file into chunks and streams them over a
  **WebSocket** to a **Cloudflare Worker + Durable Object**, which forwards each
  chunk to the other devices on the same channel code.
- Chunks live in memory only long enough to be forwarded. Nothing is written to
  disk, a database, or object storage.
- This is a **relay**, not a direct peer-to-peer connection. There is no WebRTC.
- It is **not end-to-end encrypted**. Traffic is TLS-encrypted in transit, but it
  is decrypted at the Worker in order to be relayed. Encrypt sensitive files
  yourself before sending them.

## Features

- **Nothing stored**: no database, no file retention, no accounts.
- **Multiple files**: zipped client-side into one archive.
- **Text snippets**: send text, links or code (up to 50,000 characters) to the
  other devices; each arrives with a Copy button. Kept in the tab only.
- **Explicit saves**: received files stay in the tab until you press Save.
- **Live progress**: per-transfer progress, cancellation and connection state.
- **QR code**: show a QR for the channel link so another device can open it.
- **Drag, drop or paste**, plus a copyable channel code and share link.
- **Flat, minimal UI**: dashboard layout, no gradients, shadows or animations,
  light and dark themes, keyboard navigable.

## Tech stack

- **Backend**: TypeScript on Cloudflare Workers, one Durable Object per channel,
  WebSocket Hibernation API.
- **Frontend**: React 18, Rsbuild, styled-components, JSZip, qrcode-generator.
- The Worker also serves the built frontend (`client/build`) as static assets,
  so one deploy covers both.

## Getting started

```bash
npm install
npm install --prefix client

npm run dev          # frontend, localhost:3000
npm run dev:worker   # Worker, localhost:8787
```

`client/.env.development` points the frontend at `localhost:8787`.

### Checks

```bash
npm test             # vitest unit tests (client)
npm run typecheck    # tsc for worker and client
```

## Deployment (Cloudflare Workers)

You need a free Cloudflare account. Before the first deploy, set these to your
own values:

| File | What to change |
|---|---|
| `wrangler.toml` | `account_id` (run `npx wrangler whoami`), and `name` |
| `worker/index.ts` | `ALLOWED_ORIGINS`: the public URL of your site |
| `client/.env.production` | `REACT_APP_BACKEND_URL` and `REACT_APP_FRONTEND_URL` |
| `client/public/_headers` | the URL in the CSP `connect-src` |

Then:

```bash
npx wrangler login
npm run build --prefix client
npx wrangler deploy
```

The site is served from one domain, `tf.n3d.site`, attached as a custom domain
in the Cloudflare dashboard (Workers & Pages → your Worker → Domains → Add
Domain → Custom domain), not in `wrangler.toml`. It is `CANONICAL_ORIGIN` in
`worker/index.ts` and the only host in the CSP `connect-src`.

The old addresses, `throw-files.n3d.site` and the `workers.dev` route, stay
attached only so old links keep working: the Worker answers every request on
them with a 308 redirect to the same path and query on `tf.n3d.site`
(`LEGACY_HOSTS`).

The frontend reads its URLs from `client/.env.production` at **build** time, so
changing them needs a rebuild before `wrangler deploy`.

### P2P across networks (TURN)

P2P works out of the box on the same network and through most home routers
(STUN). Strict NAT, which most mobile data uses, needs a TURN server. The
Worker hands one out from `/ice` once it has a Cloudflare Realtime TURN key
(Dashboard → Realtime → TURN Server → Create; the free tier covers 1 TB a
month):

```sh
npx wrangler secret put TURN_KEY_ID
npx wrangler secret put TURN_KEY_API_TOKEN
```

Over TURN the DataChannel is still DTLS-encrypted end to end; TURN only
forwards ciphertext. In the browser console, `[p2p] connected:` shows whether
a transfer went `direct (LAN)`, `direct (internet)` or through the `TURN relay`.

### Automatic deploy (Cloudflare Workers Builds)

There is no GitHub Actions workflow. Instead the Worker is connected to this
repository in the Cloudflare dashboard (Worker → Settings → Builds), so every
push to `master` is built and deployed by Cloudflare:

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`

This does not run tests or typechecks. Run `npm test` and `npm run typecheck`
locally before pushing.

## License

MIT. See [LICENSE](LICENSE).

---
Originally created by [Jamuel Galicia](https://github.com/jamg26). This is a
modified fork.
