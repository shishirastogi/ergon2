/**
 * In-memory fixed-window rate limiter (no external dependency).
 * Appropriate for this single-tenant, low-traffic deployment; swap for a
 * Redis-backed limiter if the API is ever horizontally scaled.
 *
 * Fails CLOSED: on any internal bookkeeping error requests are rejected
 * (429) rather than allowed through unthrottled.
 */
import { HttpError } from './httpError.js';

export function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, name = 'limiter' } = {}) {
  /** Map<key, number[] timestamps> */
  const hits = new Map();

  // Periodic sweep so stale entries don't grow without bound.
  const sweeper = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, stamps] of hits) {
      const alive = stamps.filter((t) => t > cutoff);
      if (alive.length === 0) hits.delete(key);
      else hits.set(key, alive);
    }
  }, windowMs);
  sweeper.unref?.();

  return function rateLimitMiddleware(req, res, next) {
    try {
      const key = `${name}:${req.ip || 'unknown'}`;
      const now = Date.now();
      const cutoff = now - windowMs;

      const recent = (hits.get(key) || []).filter((t) => t > cutoff);
      if (recent.length >= max) {
        const retryAfterSec = Math.ceil((recent[0] + windowMs - now) / 1000);
        respondTooMany(res, retryAfterSec);
        return;
      }
      recent.push(now);
      hits.set(key, recent);
      next();
    } catch {
      respondTooMany(res, 60); // fail closed
    }
  };
}

function respondTooMany(res, retryAfter) {
  if (!res.headersSent) {
    res.setHeader('Retry-After', String(Math.max(retryAfter, 1)));
    res.status(429).json({
      error: { message: 'Too many attempts. Please slow down and try again shortly.', code: 'RATE_LIMITED' },
    });
  }
}
