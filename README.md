# ThrowMyFile

Live: [https://tf.n3d.site](https://tf.n3d.site)
· Source: [github.com/n3d06/throw-files](https://github.com/n3d06/throw-files)

ThrowMyFile moves files between browsers without ever storing them. Open the
site on two devices, put the same channel code into both (or scan the QR code),
and send.

## How it works

A file takes one of two paths, picked by the **Auto / P2P / Relay** switch:

- **Direct (P2P)**: the browsers connect over a **WebRTC DataChannel** and the
  file goes straight between them, **end-to-end encrypted** (DTLS). The Worker
  only forwards the signalling. When a device joins a channel, each pair of
  devices connects right away and keeps that connection for its transfers.
  STUN (Cloudflare, Google) is used to find a route; there is no TURN, so strict
  NAT (most mobile data) can't connect directly.
- **Relay**: the sender's browser streams chunks over a **WebSocket** to a
  **Cloudflare Worker + Durable Object**, which forwards each chunk to the other
  devices on the channel. This is **not end-to-end encrypted**: it is TLS in
  transit but decrypted at the Worker to be forwarded.
- **Auto** (the default) uses P2P when the join-time check succeeded and the
  relay otherwise.
- Nothing is written to disk, a database, or object storage on the server. Every
  file is checked end to end with SHA-256 before it is saved.

## Features

- **Nothing stored**: no database, no file retention, no accounts.
- **Multiple files**: zipped client-side into one archive.
- **Text snippets**: send text, links or code (up to 50,000 characters) to the
  other devices; each arrives with a Copy button. Kept in the tab only.
- **Explicit saves**: received files stay in the tab until you press Save.
- **Live progress**: per-transfer progress, speed, time left, cancellation,
  connection state, and whether P2P works with the other devices.
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
