import { Router } from 'express'
import { asyncHandler } from '../lib/errors'
import { requireAuth } from '../middleware/auth'
import { validateBody, validateQuery } from '../middleware/validate'
import { createUrlRateLimit, analyticsRateLimit } from '../middleware/rateLimiter'
import { CreateUrlSchema, UpdateUrlSchema, PaginationSchema } from '../validators'
import * as urlController from '../controllers/url.controller'
import * as analyticsController from '../controllers/analytics.controller'

const router = Router()

// All URL routes require authentication
router.use(requireAuth)

/**
 * POST /api/urls
 * Create a new shortened URL.
 */
router.post(
  '/',
  createUrlRateLimit,
  validateBody(CreateUrlSchema),
  asyncHandler(urlController.createUrl)
)

/**
 * GET /api/urls
 * List URLs for the authenticated user (paginated).
 */
router.get(
  '/',
  validateQuery(PaginationSchema),
  asyncHandler(urlController.listUrls)
)

/**
 * GET /api/urls/:id
 * Get a single URL by ID.
 */
router.get(
  '/:id',
  asyncHandler(urlController.getUrl)
)

/**
 * PATCH /api/urls/:id
 * Update a URL.
 */
router.patch(
  '/:id',
  validateBody(UpdateUrlSchema),
  asyncHandler(urlController.updateUrl)
)

/**
 * DELETE /api/urls/:id
 * Delete a URL.
 */
router.delete(
  '/:id',
  asyncHandler(urlController.deleteUrl)
)

/**
 * GET /api/urls/:id/qr
 * Generate QR code for the short URL.
 */
router.get(
  '/:id/qr',
  asyncHandler(urlController.getQr)
)

/**
 * GET /api/urls/:id/analytics
 * Get click analytics for a URL.
 */
router.get(
  '/:id/analytics',
  analyticsRateLimit,
  asyncHandler(analyticsController.getAnalytics)
)

export default router
