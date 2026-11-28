// Transfer speed and time left, smoothed so the numbers don't jump around.

/** Ignore samples closer together than this; they are mostly noise. */
const MIN_SAMPLE_S = 0.25;
/** Weight of the newest sample in the moving average. */
const SMOOTHING = 0.3;

export class RateMeter {
  private last: { t: number; bytes: number } | null = null;
  /** Bytes per second, 0 until there are two samples. */
  rate = 0;

  /** Record that `bytes` have moved so far, at time `now` (ms). */
  update(bytes: number, now: number = performance.now()): number {
    if (!this.last) {
      this.last = { t: now, bytes };
      return this.rate;
    }
    const seconds = (now - this.last.t) / 1000;
    if (seconds < MIN_SAMPLE_S) return this.rate;
    const instant = Math.max(0, bytes - this.last.bytes) / seconds;
    this.rate = this.rate ? this.rate * (1 - SMOOTHING) + instant * SMOOTHING : instant;
    this.last = { t: now, bytes };
    return this.rate;
  }
}

/** "8 s left", "3 min left", "1 h 5 min left"; null when unknown. */
export function formatTimeLeft(remainingBytes: number, rate: number): string | null {
  if (!(rate > 0) || remainingBytes <= 0) return null;
  const seconds = Math.ceil(remainingBytes / rate);
  if (seconds < 60) return `${seconds} s left`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min left` : `${hours} h left`;
}
