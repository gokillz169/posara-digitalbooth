import test from 'node:test';
import assert from 'node:assert/strict';
import { SlidingWindowRateLimiter, TtlLruCache, extractClientIp } from './rateLimit.ts';

test('SlidingWindowRateLimiter allows up to maxRequests then blocks with retryAfterSeconds', () => {
  const limiter = new SlidingWindowRateLimiter({ maxRequests: 3, windowMs: 10_000 });
  const t0 = 1_000_000;

  assert.equal(limiter.consume('1.2.3.4', t0).allowed, true);
  assert.equal(limiter.consume('1.2.3.4', t0 + 100).allowed, true);
  const third = limiter.consume('1.2.3.4', t0 + 200);
  assert.equal(third.allowed, true);
  assert.equal(third.remaining, 0);

  const blocked = limiter.consume('1.2.3.4', t0 + 300);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 9 && blocked.retryAfterSeconds <= 10);

  // Separate IP remains unaffected
  assert.equal(limiter.consume('5.6.7.8', t0 + 300).allowed, true);

  // Window slides past t0
  assert.equal(limiter.consume('1.2.3.4', t0 + 10_001).allowed, true);
});

test('SlidingWindowRateLimiter caps tracked IPs at maxEntries to prevent OOM', () => {
  const limiter = new SlidingWindowRateLimiter({
    maxRequests: 5,
    windowMs: 60_000,
    maxEntries: 10
  });
  for (let i = 0; i < 25; i++) {
    limiter.consume(`10.0.0.${i}`, 5000 + i);
  }
  assert.ok(limiter.trackedKeyCount <= 10);
});

test('TtlLruCache expires stale entries and evicts oldest on overflow', () => {
  const cache = new TtlLruCache<string>({ maxEntries: 10, ttlMs: 5000 });
  cache.set('k1', 'v1', 1000);
  assert.equal(cache.get('k1', 2000), 'v1');
  assert.equal(cache.get('k1', 6001), undefined);

  for (let i = 0; i < 15; i++) {
    cache.set(`item-${i}`, `val-${i}`, 10_000 + i);
  }
  assert.ok(cache.size <= 10);
  assert.equal(cache.get('item-0', 10_100), undefined);
  assert.equal(cache.get('item-14', 10_100), 'val-14');
});

test('extractClientIp parses first X-Forwarded-For hop safely', () => {
  assert.equal(extractClientIp('203.0.113.10, 10.0.0.1', '127.0.0.1'), '203.0.113.10');
  assert.equal(extractClientIp(undefined, '::1'), '::1');
});
