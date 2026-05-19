import { Router } from 'express'
import { asyncHandler } from '../lib/errors'
import { redirectRateLimit } from '../middleware/rateLimiter'
import { handleRedirect } from '../controllers/redirect.controller'

const router = Router()

/**
 * GET /:slug
 * Public — redirects to the original URL.
 * This is the hot path — highest frequency route.
 */
router.get(
  '/:slug',
  redirectRateLimit,
  asyncHandler(handleRedirect)
)

export default router
