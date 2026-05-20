import redis from './redis'
import logger from './logger'

const DEFAULT_TTL = 3600 // 1 hour in seconds

/**
 * URL Cache operations — cache-aside pattern.
 *
 * Key pattern: url:{slug}
 * Value: JSON.stringify(Url record)
 * TTL: 3600 seconds (1 hour)
 *
 * SET on: cache miss (after DB read)
 * DEL on: URL update or delete
 * GET on: every redirect request, checked BEFORE DB query
 */

/**
 * Get a cached URL by slug.
 * Returns the parsed URL object or null on cache miss.
 */
export async function getCache<T>(slug: string): Promise<T | null> {
  try {
    const cached = await redis.get(`url:${slug}`)
    if (cached) {
      logger.debug({ slug, source: 'cache' }, 'cache_hit')
      return JSON.parse(cached) as T
    }
    logger.debug({ slug }, 'cache_miss')
    return null
  } catch (err) {
    logger.error({ slug, error: err }, 'cache_get_error')
    return null // Cache failure should never block the request
  }
}

/**
 * Set a URL in cache with TTL.
 * Called after a successful DB read on cache miss.
 */
export async function setCache(slug: string, data: unknown, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    await redis.setex(`url:${slug}`, ttl, JSON.stringify(data))
    logger.debug({ slug, ttl }, 'cache_set')
  } catch (err) {
    logger.error({ slug, error: err }, 'cache_set_error')
    // Cache failure should never block the request
  }
}

/**
 * Delete a cached URL by slug.
 * Called on URL update (PATCH) or delete (DELETE) to invalidate stale cache.
 */
export async function delCache(slug: string): Promise<void> {
  try {
    await redis.del(`url:${slug}`)
    logger.debug({ slug }, 'cache_del')
  } catch (err) {
    logger.error({ slug, error: err }, 'cache_del_error')
  }
}
