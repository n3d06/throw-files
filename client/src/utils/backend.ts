// Where the Worker lives. Computed on first use, not at import, so modules
// that import this still load in tests without a `window`.

let cached: string | null = null;

/** The Worker's WebSocket origin, e.g. "wss://tf.n3d.site". */
export function wsBase(): string {
  if (cached) return cached;
  const configured =
    (window as { ENV?: { REACT_APP_BACKEND_URL?: string } }).ENV
      ?.REACT_APP_BACKEND_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    (window.location.hostname === "localhost"
      ? "http://localhost:8787"
      : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`);
  cached = configured.replace(/^http/, "ws").replace(/\/$/, "");
  return cached;
}
