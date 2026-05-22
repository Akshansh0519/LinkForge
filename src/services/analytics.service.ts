import { Request } from 'express'
import geoip from 'geoip-lite'
import { UAParser } from 'ua-parser-js'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { AppError } from '../lib/errors'
import { AnalyticsResponse } from '../types'

/**
 * Track a click — async, non-blocking.
 *
 * This function must NEVER be awaited in the redirect handler.
 * Failure must NEVER propagate to the client.
 *
 * Pattern in redirect handler:
 *   trackClick(url.id, req)  // no await — fire and forget
 *   return res.redirect(302, url.original)
 */
export async function trackClick(urlId: string, req: Request): Promise<void> {
  try {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? 'unknown'
    const geo = geoip.lookup(ip)
    const parser = new UAParser(req.headers['user-agent'] ?? '')
    const deviceType = parser.getDevice().type ?? 'desktop'
    const referrer = (req.headers['referer'] ?? req.headers['referrer'] ?? null) as string | null

    await prisma.click.create({
      data: {
        urlId,
        country: geo?.country ?? null,
        device: deviceType,
        referrer: referrer ? new URL(referrer).hostname : null, // store hostname only, not full URL
      },
    })

    logger.debug({ urlId, country: geo?.country, device: deviceType }, 'click_tracked')
  } catch (err) {
    logger.error({ urlId, error: err }, 'trackClick failed')
    // swallow — never throw
  }
}

/**
 * Get analytics for a URL.
 * Uses Prisma.$transaction with groupBy queries for efficient aggregation.
 *
 * Returns: clicksByDay (last 30 days), clicksByCountry (top 10),
 *          clicksByDevice, clicksByReferrer (top 10)
 */
export async function getAnalytics(urlId: string, userId: string): Promise<AnalyticsResponse> {
  // Verify ownership
  const url = await prisma.url.findUnique({
    where: { id: urlId },
    select: { userId: true },
  })

  if (!url) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }
  if (url.userId !== userId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [totalClicks, clicksByCountry, clicksByDevice, clicksByReferrer, clicksByDayRaw] =
    await prisma.$transaction([
      // Total clicks
      prisma.click.count({ where: { urlId } }),

      // Clicks by country — top 10
      prisma.click.groupBy({
        by: ['country'],
        where: { urlId },
        _count: { id: true },
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),

      // Clicks by device
      prisma.click.groupBy({
        by: ['device'],
        where: { urlId },
        _count: { id: true },
        orderBy: { _count: { device: 'desc' } },
      }),

      // Clicks by referrer — top 10
      prisma.click.groupBy({
        by: ['referrer'],
        where: { urlId },
        _count: { id: true },
        orderBy: { _count: { referrer: 'desc' } },
        take: 10,
      }),

      // Clicks in the last 30 days (we'll group by day in JS since Prisma doesn't natively group by date truncation)
      prisma.click.findMany({
        where: {
          urlId,
          clickedAt: { gte: thirtyDaysAgo },
        },
        select: { clickedAt: true },
        orderBy: { clickedAt: 'asc' },
      }),
    ])

  // Group clicks by day (truncate to YYYY-MM-DD)
  const dayMap = new Map<string, number>()
  for (const click of clicksByDayRaw) {
    const day = click.clickedAt.toISOString().split('T')[0]
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1)
  }
  const clicksByDay = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }))

  return {
    urlId,
    totalClicks,
    clicksByDay,
    clicksByCountry: clicksByCountry.map((c) => ({
      country: c.country ?? 'Unknown',
      count: typeof c._count === 'object' ? (c._count?.id ?? 0) : 0,
    })),
    clicksByDevice: clicksByDevice.map((d) => ({
      device: d.device ?? 'Unknown',
      count: typeof d._count === 'object' ? (d._count?.id ?? 0) : 0,
    })),
    clicksByReferrer: clicksByReferrer.map((r) => ({
      referrer: r.referrer ?? 'Direct',
      count: typeof r._count === 'object' ? (r._count?.id ?? 0) : 0,
    })),
  }
}
