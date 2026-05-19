import { nanoid } from 'nanoid'
import prisma from '../lib/prisma'
import { delCache } from '../lib/cache'
import logger from '../lib/logger'
import { AppError } from '../lib/errors'
import { UrlResponse } from '../types'

// Reserved slugs — rejected at validation layer, not DB layer
const RESERVED_SLUGS = ['api', 'health', 'admin', 'static', 'assets', 'favicon.ico']

/**
 * Format a Prisma Url record into the API response shape.
 */
function formatUrlResponse(
  url: {
    id: string
    slug: string
    original: string
    expiresAt: Date | null
    createdAt: Date
    _count?: { clicks: number }
  }
): UrlResponse {
  return {
    id: url.id,
    slug: url.slug,
    original: url.original,
    shortUrl: `${process.env.BASE_URL}/${url.slug}`,
    expiresAt: url.expiresAt?.toISOString() ?? null,
    createdAt: url.createdAt.toISOString(),
    clickCount: url._count?.clicks ?? 0,
  }
}

/**
 * Generate a unique slug.
 * Default: nanoid(8) — 8 alphanumeric chars, ~281 trillion combinations.
 * Collision handling: generate → check uniqueness → if collision, regenerate once → if still collision, return 409.
 */
async function generateUniqueSlug(): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const slug = nanoid(8)
    const existing = await prisma.url.findUnique({ where: { slug } })
    if (!existing) return slug
    logger.warn({ slug, attempt }, 'slug_collision')
  }
  throw new AppError('Unable to generate unique slug. Please try again.', 409, 'SLUG_COLLISION')
}

/**
 * Create a new shortened URL.
 */
export async function createUrl(
  userId: string,
  data: { original: string; slug?: string; expiresAt?: string }
): Promise<UrlResponse> {
  let slug: string

  if (data.slug) {
    // Custom slug — validate reserved and uniqueness
    if (RESERVED_SLUGS.includes(data.slug.toLowerCase())) {
      throw new AppError(`Slug "${data.slug}" is reserved`, 409, 'SLUG_RESERVED')
    }
    const existing = await prisma.url.findUnique({ where: { slug: data.slug } })
    if (existing) {
      throw new AppError(`Slug "${data.slug}" is already taken`, 409, 'SLUG_TAKEN')
    }
    slug = data.slug
  } else {
    slug = await generateUniqueSlug()
  }

  const url = await prisma.url.create({
    data: {
      slug,
      original: data.original,
      userId,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
    include: { _count: { select: { clicks: true } } },
  })

  logger.info({ urlId: url.id, slug }, 'url_created')
  return formatUrlResponse(url)
}

/**
 * Get a single URL by ID (owned by the authenticated user).
 */
export async function getUrl(urlId: string, userId: string): Promise<UrlResponse> {
  const url = await prisma.url.findUnique({
    where: { id: urlId },
    include: { _count: { select: { clicks: true } } },
  })

  if (!url) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }
  if (url.userId !== userId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  return formatUrlResponse(url)
}

/**
 * List URLs for the authenticated user with pagination.
 */
export async function listUrls(userId: string, page: number, limit: number) {
  const skip = (page - 1) * limit

  const [urls, total] = await prisma.$transaction([
    prisma.url.findMany({
      where: { userId },
      include: { _count: { select: { clicks: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.url.count({ where: { userId } }),
  ])

  return {
    urls: urls.map(formatUrlResponse),
    total,
    page,
    pages: Math.ceil(total / limit),
  }
}

/**
 * Update a URL (owned by the authenticated user).
 * Invalidates cache on slug change.
 */
export async function updateUrl(
  urlId: string,
  userId: string,
  data: { original?: string; slug?: string; expiresAt?: string }
): Promise<UrlResponse> {
  const existing = await prisma.url.findUnique({ where: { id: urlId } })
  if (!existing) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }
  if (existing.userId !== userId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  // If changing slug, validate
  if (data.slug && data.slug !== existing.slug) {
    if (RESERVED_SLUGS.includes(data.slug.toLowerCase())) {
      throw new AppError(`Slug "${data.slug}" is reserved`, 409, 'SLUG_RESERVED')
    }
    const slugTaken = await prisma.url.findUnique({ where: { slug: data.slug } })
    if (slugTaken) {
      throw new AppError(`Slug "${data.slug}" is already taken`, 409, 'SLUG_TAKEN')
    }
  }

  const url = await prisma.url.update({
    where: { id: urlId },
    data: {
      ...(data.original && { original: data.original }),
      ...(data.slug && { slug: data.slug }),
      ...(data.expiresAt !== undefined && {
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      }),
    },
    include: { _count: { select: { clicks: true } } },
  })

  // Invalidate cache for old slug
  await delCache(existing.slug)
  // If slug changed, also invalidate new slug (in case it was cached from a previous URL)
  if (data.slug && data.slug !== existing.slug) {
    await delCache(data.slug)
  }

  logger.info({ urlId, slug: url.slug }, 'url_updated')
  return formatUrlResponse(url)
}

/**
 * Delete a URL (owned by the authenticated user).
 * Invalidates cache.
 */
export async function deleteUrl(urlId: string, userId: string): Promise<void> {
  const url = await prisma.url.findUnique({ where: { id: urlId } })
  if (!url) {
    throw new AppError('URL not found', 404, 'URL_NOT_FOUND')
  }
  if (url.userId !== userId) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN')
  }

  await prisma.url.delete({ where: { id: urlId } })
  await delCache(url.slug)

  logger.info({ urlId, slug: url.slug }, 'url_deleted')
}
