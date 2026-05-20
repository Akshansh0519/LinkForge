import { Request, Response, NextFunction } from 'express'
import redis from '../lib/redis'
import logger from '../lib/logger'

interface RateLimitOptions {
  /** Unique prefix for the rate limit key (e.g., 'redirect', 'auth', 'create') */
  prefix: string
  /** Maximum requests allowed in the window */
  max: number
  /** Window duration in milliseconds */
  windowMs: number
  /** Function to extract the identifier (userId or IP) */
  keyGenerator?: (req: Request) => string
}

/**
 * Sliding Window Rate Limiter — Redis Sorted Sets
 *
 * Algorithm:
 *   now = Date.now()
 *   windowStart = now - windowMs
 *   pipeline:
 *     ZREMRANGEBYSCORE key 0 windowStart    // remove expired entries
 *     ZADD key now now.toString()           // add current request (score = member = timestamp)
 *     ZCARD key                             // count requests in window
 *     EXPIRE key ceil(windowMs/1000)        // reset TTL
 *   count = pipeline result[2]
 *   if count > max: return 429
 *
 * Why sorted set not string counter: sorted set stores per-request timestamps,
 * enabling exact sliding window. String counter only supports fixed window.
 * ZCARD gives exact count of requests in [windowStart, now].
 *
 * Why O(log n): ZADD and ZREMRANGEBYSCORE are O(log n) where n = requests in window.
 * For reasonable rate limits (100/min), n is small.
 */
export function slidingWindowRateLimit(options: RateLimitOptions) {
  const { prefix, max, windowMs, keyGenerator } = options

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Determine the identifier: userId (authenticated) or IP (public)
      const identifier = keyGenerator
        ? keyGenerator(req)
        : req.user?.userId ?? req.ip ?? 'unknown'

      const key = `rl:${prefix}:${identifier}`
      const now = Date.now()
      const windowStart = now - windowMs

      // Execute all Redis commands in a single pipeline (atomic)
      const results = await redis
        .pipeline()
        .zremrangebyscore(key, 0, windowStart) // remove expired entries
        .zadd(key, now, now.toString()) // add current request
        .zcard(key) // count requests in window
        .expire(key, Math.ceil(windowMs / 1000)) // reset TTL
        .exec()

      if (!results) {
        logger.error({ key }, 'rate_limiter_pipeline_null')
        next()
        return
      }

      const count = results[2]?.[1] as number

      // Set rate limit headers on every response
      res.setHeader('X-RateLimit-Limit', max.toString())
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count).toString())
      res.setHeader('X-RateLimit-Reset', (windowStart + windowMs).toString())

      if (count > max) {
        logger.warn({ key, count, max }, 'rate_limit_exceeded')
        res.status(429).json({
          error: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
        })
        return
      }

      next()
    } catch (err) {
      // If Redis is down, allow the request through (fail-open)
      logger.error({ error: err, prefix }, 'rate_limiter_error')
      next()
    }
  }
}

// ─── Pre-configured Rate Limiters (per spec Section 4) ─────────────

/** Public redirect: 60 req/min per IP */
export const redirectRateLimit = slidingWindowRateLimit({
  prefix: 'redirect',
  max: 60,
  windowMs: 60_000,
})

/** Auth endpoints (login/register): 10 req/min per IP — brute force protection */
export const authRateLimit = slidingWindowRateLimit({
  prefix: 'auth',
  max: 10,
  windowMs: 60_000,
})

/** Auth refresh: 20 req/min per IP */
export const refreshRateLimit = slidingWindowRateLimit({
  prefix: 'refresh',
  max: 20,
  windowMs: 60_000,
})

/** Authenticated URL creation: 20 req/min per userId */
export const createUrlRateLimit = slidingWindowRateLimit({
  prefix: 'create',
  max: 20,
  windowMs: 60_000,
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? 'unknown',
})

/** Analytics endpoints: 30 req/min per userId */
export const analyticsRateLimit = slidingWindowRateLimit({
  prefix: 'analytics',
  max: 30,
  windowMs: 60_000,
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? 'unknown',
})
