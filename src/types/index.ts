/**
 * LinkForge — Type definitions
 * All response shapes and Express request augmentation.
 */

// ─── Response Types ───────────────────────────────────

export interface UrlResponse {
  id: string
  slug: string
  original: string
  shortUrl: string // = process.env.BASE_URL + '/' + slug
  expiresAt: string | null
  createdAt: string
  clickCount: number // derived via _count on Prisma query
}

export interface AnalyticsResponse {
  urlId: string
  totalClicks: number
  clicksByDay: { date: string; count: number }[] // last 30 days
  clicksByCountry: { country: string; count: number }[] // top 10
  clicksByDevice: { device: string; count: number }[]
  clicksByReferrer: { referrer: string; count: number }[] // top 10
}

export interface AuthResponse {
  user: { id: string; email: string; createdAt: string }
  accessToken: string
  refreshToken: string
}

// ─── Error Response ───────────────────────────────────

export interface ErrorResponse {
  error: string
  code?: string
  details?: unknown
}

// ─── Express Request Augmentation ─────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
      }
    }
  }
}
