export { ThrowFilesChannel } from "./channel";

/** The one domain the site is served from. */
const CANONICAL_ORIGIN = "https://tf.n3d.site";

const ALLOWED_ORIGINS = new Set([CANONICAL_ORIGIN]);

/**
 * Former homes of the site. They stay attached to this Worker only so old
 * links keep working: every request is permanently redirected to the same
 * path and query on CANONICAL_ORIGIN, so `?channel=` survives the move.
 */
const LEGACY_HOSTS = new Set([
  "throw-files.n3d.site",
  "throw-files.ngduy10102006.workers.dev",
]);

// Channel codes are fixed-length; see client/src/utils/channel.ts.
const CHANNEL_CODE = /^[A-Z0-9]{6}$/;

interface Env {
  THROW_FILES_CHANNEL: DurableObjectNamespace;
  ASSETS: Fetcher;
  /** Cloudflare Realtime TURN key (optional; set with `wrangler secret put`). */
  TURN_KEY_ID?: string;
  TURN_KEY_API_TOKEN?: string;
}

/**
 * STUN only tells each browser its public address. Two of them, so one
 * provider being unreachable (some networks block it) does not stop P2P.
 */
const STUN_SERVERS = [
  { urls: ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"] },
];

/**
 * TURN credentials live long enough for a large transfer: the browser has to
 * refresh its TURN allocation with them while the DataChannel is in use.
 */
const TURN_CREDENTIAL_TTL_S = 6 * 60 * 60;

/**
 * ICE servers for WebRTC. Like croc, which always has its relay to fall back
 * on when the two machines can't reach each other directly, a TURN server
 * keeps P2P working through symmetric / carrier-grade NAT (mobile data). The
 * DataChannel stays DTLS-encrypted end to end, so TURN only sees ciphertext.
 * Without TURN keys configured this returns STUN only.
 */
async function iceServersResponse(request: Request, env: Env): Promise<Response> {
  const headers = {
    ...corsHeaders(request),
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  // Only hand TURN credentials to this site's own pages.
  const sameSite = request.headers.get("Sec-Fetch-Site") === "same-origin";
  if (!sameSite && !isAllowedOrigin(request.headers.get("Origin"))) {
    return new Response(JSON.stringify({ iceServers: STUN_SERVERS }), { headers });
  }

  const iceServers: RTCIceServerLike[] = [...STUN_SERVERS];
  if (env.TURN_KEY_ID && env.TURN_KEY_API_TOKEN) {
    try {
      const res = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ttl: TURN_CREDENTIAL_TTL_S }),
        },
      );
      if (res.ok) {
        const body = (await res.json()) as {
          iceServers?: RTCIceServerLike | RTCIceServerLike[];
        };
        const list = Array.isArray(body.iceServers)
          ? body.iceServers
          : body.iceServers
            ? [body.iceServers]
            : [];
        for (const server of list) {
          const urls = (Array.isArray(server.urls) ? server.urls : [server.urls])
            // Browsers can't use port 53; those URLs only add timeouts.
            .filter((u) => u.startsWith("turn") && !/:53(\?|$)/.test(u));
          if (urls.length) iceServers.push({ ...server, urls });
        }
      } else {
        console.error("TURN credential request failed:", res.status);
      }
    } catch (error) {
      console.error("TURN credential request failed:", error);
    }
  }
  return new Response(JSON.stringify({ iceServers }), { headers });
}

interface RTCIceServerLike {
  urls: string | string[];
  username?: string;
  credential?: string;
}

/**
 * WebSocket upgrades are not subject to CORS, so the Origin header is the only
 * thing standing between us and cross-site socket hijacking: without this any
 * page could open a socket, guess a channel and receive someone's files.
 *
 * Loopback origins stay allowed for local development. That is not a hole a
 * remote site can walk through — a page can only send `Origin: localhost` if it
 * is genuinely served from the user's own machine.
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  const requested = request.headers.get("Access-Control-Request-Headers");
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin)
      ? (origin as string)
      : CANONICAL_ORIGIN,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": requested ?? "Content-Type",
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 308 keeps the method; browsers re-request on the new domain. A socket
    // from a page still open on an old domain cannot follow it and fails,
    // which the client reports as a lost connection until the user reloads.
    if (LEGACY_HOSTS.has(url.hostname)) {
      return Response.redirect(
        `${CANONICAL_ORIGIN}${url.pathname}${url.search}`,
        308,
      );
    }

    // CORS preflight — handled at the edge, no DO wakeup needed.
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      if (!isAllowedOrigin(request.headers.get("Origin"))) {
        return new Response("Forbidden origin", { status: 403 });
      }

      const channel = url.searchParams.get("channel") ?? "";
      if (!CHANNEL_CODE.test(channel)) {
        return new Response("Invalid channel code", { status: 400 });
      }

      // One Durable Object per channel. Previously every connection on the
      // planet shared `idFromName("main")`, which made each relayed chunk walk
      // the full global socket list and capped the whole product at the
      // throughput of a single-threaded DO.
      const id = env.THROW_FILES_CHANNEL.idFromName(`channel:${channel}`);
      return env.THROW_FILES_CHANNEL.get(id).fetch(request);
    }

    if (url.pathname === "/ice") {
      return iceServersResponse(request, env);
    }

    if (url.pathname === "/health") {
      return new Response("ok", {
        headers: { ...corsHeaders(request), "Content-Type": "text/plain" },
      });
    }

    // Everything else is the static frontend (client/build).
    return env.ASSETS.fetch(request);
  },
};
