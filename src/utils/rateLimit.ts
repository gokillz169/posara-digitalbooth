export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Bounded-memory sliding-window rate limiter keyed by client IP.
 * Caps tracked keys via oldest-key eviction to prevent heap exhaustion (OOM / DoS).
 */
export class SlidingWindowRateLimiter {
  private readonly hits = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly maxEntries: number;

  constructor(options: { maxRequests: number; windowMs: number; maxEntries?: number }) {
    this.maxRequests = Math.max(1, Math.floor(options.maxRequests));
    this.windowMs = Math.max(1000, Math.floor(options.windowMs));
    this.maxEntries = Math.max(10, Math.floor(options.maxEntries ?? 2000));
  }

  consume(key: string, nowMs: number = Date.now()): RateLimitResult {
    const cleanKey = (key || 'unknown').trim().slice(0, 128) || 'unknown';
    const cutoff = nowMs - this.windowMs;
    const prevTimestamps = this.hits.get(cleanKey) ?? [];
    const active = prevTimestamps.filter((ts) => ts > cutoff);

    if (active.length >= this.maxRequests) {
      this.hits.set(cleanKey, active);
      const oldestActive = active[0] ?? nowMs;
      const retryMs = Math.max(1000, oldestActive + this.windowMs - nowMs);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil(retryMs / 1000)
      };
    }

    if (!this.hits.has(cleanKey) && this.hits.size >= this.maxEntries) {
      this.pruneStaleOrOldest(cutoff);
    }

    active.push(nowMs);
    // Refresh insertion order for FIFO/LRU-style bounded eviction
    this.hits.delete(cleanKey);
    this.hits.set(cleanKey, active);

    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - active.length),
      retryAfterSeconds: 0
    };
  }

  get trackedKeyCount(): number {
    return this.hits.size;
  }

  private pruneStaleOrOldest(cutoff: number): void {
    for (const [k, timestamps] of this.hits.entries()) {
      const stillActive = timestamps.some((ts) => ts > cutoff);
      if (!stillActive) {
        this.hits.delete(k);
      }
    }
    while (this.hits.size >= this.maxEntries) {
      const oldestKey = this.hits.keys().next().value;
      if (oldestKey === undefined) break;
      this.hits.delete(oldestKey);
    }
  }
}

/**
 * Bounded TTL + LRU cache to avoid redundant CPU work when regenerating identical QR PNGs.
 */
export class TtlLruCache<V> {
  private readonly store = new Map<string, { value: V; expiresAt: number }>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(options: { maxEntries?: number; ttlMs?: number } = {}) {
    this.maxEntries = Math.max(10, Math.floor(options.maxEntries ?? 300));
    this.ttlMs = Math.max(1000, Math.floor(options.ttlMs ?? 15 * 60 * 1000));
  }

  get(key: string, nowMs: number = Date.now()): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= nowMs) {
      this.store.delete(key);
      return undefined;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: string, value: V, nowMs: number = Date.now()): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      for (const [k, v] of this.store.entries()) {
        if (v.expiresAt <= nowMs) {
          this.store.delete(k);
        }
      }
      while (this.store.size >= this.maxEntries) {
        const oldestKey = this.store.keys().next().value;
        if (oldestKey === undefined) break;
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, { value, expiresAt: nowMs + this.ttlMs });
  }

  get size(): number {
    return this.store.size;
  }
}

export function extractClientIp(
  forwardedHeader: string | string[] | undefined,
  remoteAddress: string | undefined
): string {
  const rawForwarded = Array.isArray(forwardedHeader) ? forwardedHeader[0] : forwardedHeader;
  if (typeof rawForwarded === 'string' && rawForwarded.trim()) {
    const firstHop = rawForwarded.split(',')[0]?.trim();
    if (firstHop) {
      return firstHop.slice(0, 64);
    }
  }
  return (remoteAddress || 'unknown').trim().slice(0, 64) || 'unknown';
}
