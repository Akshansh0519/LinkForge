import { Request, Response } from 'express'
import prisma from '../lib/prisma'
import { getCache, setCache } from '../lib/cache'
import { trackClick } from '../services/analytics.service'
import { AppError } from '../lib/errors'
import logger from '../lib/logger'

/** TTL for cached URL records: 1 hour */
const CACHE_TTL = 3600

interface CachedUrl {
  id: string
  slug: string
  original: string
  expiresAt: string | null
}

/**
 * Logs redirect latency with cache source and bucket classification.
 * Extracted to keep handleRedirect focused on control flow only.
 * Buckets: fast (<10ms), normal (10-50ms), slow (>50ms)
 */
function logRedirectLatency(slug: string, source: 'cache' | 'db', startTime: number): void {
  const ms = performance.now() - startTime
  const bucket = ms < 10 ? 'fast' : ms < 50 ? 'normal' : 'slow'
  logger.info({ slug, source, ms: ms.toFixed(2), bucket }, 'redirect_latency')
}

export async function handleRedirect(req: Request, res: Response): Promise<void> {
  const start = performance.now()
  const { slug } = req.params

  // 1. Check cache first
  let url = await getCache<CachedUrl>(slug)
  let cacheHit = !!url

  // 2. Cache miss — query DB
  if (!url) {
    const dbUrl = await prisma.url.findUnique({ where: { slug } })
    if (!dbUrl) {
      throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
    }

    // Set cache for future requests
    const urlToCache: CachedUrl = {
      id: dbUrl.id,
      slug: dbUrl.slug,
      original: dbUrl.original,
      expiresAt: dbUrl.expiresAt?.toISOString() ?? null,
    }
    await setCache(slug, urlToCache, CACHE_TTL)
    url = urlToCache
    cacheHit = false
  }

  // Expose cache status in response header (useful for debugging & monitoring)
  res.setHeader('X-Cache', cacheHit ? 'HIT' : 'MISS')

  // 3. Check expiration
  if (url.expiresAt && new Date(url.expiresAt) < new Date()) {
    throw new AppError('This URL has expired', 410, 'URL_EXPIRED')
  }

  // 4. Fire-and-forget click tracking — NEVER await
  trackClick(url.id, req)

  // 5. Log latency (extracted helper)
  logRedirectLatency(slug, cacheHit ? 'cache' : 'db', start)

  // 6. Redirect
  res.redirect(302, url.original)
}
