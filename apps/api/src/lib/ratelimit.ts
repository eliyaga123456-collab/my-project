/**
 * Sliding-window rate limiting behind a store interface. The in-memory store is correct for a single
 * instance; for horizontal scaling implement `RateLimitStore` with Redis (INCR + PEXPIRE) — see docs/DEPLOYMENT.md.
 */
export interface RateLimitStore {
  /** Records one hit for `key` within `windowMs` and returns hits in the window plus ms until the oldest hit expires. */
  hit(key: string, windowMs: number): Promise<{ count: number; retryAfterMs: number }>;
  count(key: string, windowMs: number): Promise<number>;
  /** Set-if-absent with TTL. Returns true when newly set (used for single-use proofs and view dedupe). */
  setOnce(key: string, ttlMs: number): Promise<boolean>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private hits = new Map<string, number[]>();
  private once = new Map<string, number>();
  private timer: NodeJS.Timeout;
  constructor() {
    this.timer = setInterval(() => this.gc(), 60_000);
    this.timer.unref();
  }
  private prune(key: string, windowMs: number, now: number) {
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    this.hits.set(key, arr);
    return arr;
  }
  async hit(key: string, windowMs: number) {
    const now = Date.now();
    const arr = this.prune(key, windowMs, now);
    arr.push(now);
    return { count: arr.length, retryAfterMs: Math.max(0, windowMs - (now - (arr[0] ?? now))) };
  }
  async count(key: string, windowMs: number) {
    return this.prune(key, windowMs, Date.now()).length;
  }
  async setOnce(key: string, ttlMs: number) {
    const now = Date.now();
    const exp = this.once.get(key);
    if (exp && exp > now) return false;
    this.once.set(key, now + ttlMs);
    return true;
  }
  private gc() {
    const now = Date.now();
    for (const [k, e] of this.once) if (e <= now) this.once.delete(k);
    for (const [k, arr] of this.hits) {
      if (!arr.length || now - arr[arr.length - 1]! > 3_600_000) this.hits.delete(k);
    }
  }
  reset() { this.hits.clear(); this.once.clear(); }
  close() { clearInterval(this.timer); }
}

export interface Limit { name: string; max: number; windowMs: number }
export const SEC = 1000, MIN = 60_000, HOUR = 3_600_000;
