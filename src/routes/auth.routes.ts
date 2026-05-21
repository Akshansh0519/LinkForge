import { Router } from 'express'
import { asyncHandler } from '../lib/errors'
import { validateBody } from '../middleware/validate'
import { authRateLimit, refreshRateLimit } from '../middleware/rateLimiter'
import { RegisterSchema, LoginSchema, RefreshSchema } from '../validators'
import * as authController from '../controllers/auth.controller'

const router = Router()

/**
 * POST /api/auth/register
 * Public — creates a new user account.
 */
router.post(
  '/register',
  authRateLimit,
  validateBody(RegisterSchema),
  asyncHandler(authController.register)
)

/**
 * POST /api/auth/login
 * Public — authenticates existing user.
 */
router.post(
  '/login',
  authRateLimit,
  validateBody(LoginSchema),
  asyncHandler(authController.login)
)

/**
 * POST /api/auth/refresh
 * Public — rotates refresh token.
 */
router.post(
  '/refresh',
  refreshRateLimit,
  validateBody(RefreshSchema),
  asyncHandler(authController.refresh)
)

export default router
