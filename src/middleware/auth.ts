import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { AppError } from '../lib/errors'
import logger from '../lib/logger'

interface JwtPayload {
  userId: string
  type: 'access' | 'refresh'
}

/**
 * requireAuth middleware — JWT verification.
 *
 * Flow:
 *   1. Extract "Bearer {token}" from Authorization header
 *   2. jwt.verify(token, ACCESS_TOKEN_SECRET) → decoded
 *   3. Attach req.user = { userId: decoded.userId }
 *   4. On error: 401 { error: 'Invalid or expired token' }
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  const token = authHeader.split(' ')[1]

  if (!token) {
    throw new AppError('Authentication required', 401, 'AUTH_REQUIRED')
  }

  try {
    const secret = process.env.ACCESS_TOKEN_SECRET
    if (!secret) {
      logger.error('ACCESS_TOKEN_SECRET is not set')
      throw new AppError('Internal server error', 500)
    }

    const decoded = jwt.verify(token, secret) as JwtPayload

    if (decoded.type !== 'access') {
      throw new AppError('Invalid token type', 401, 'INVALID_TOKEN_TYPE')
    }

    req.user = { userId: decoded.userId }
    next()
  } catch (err) {
    if (err instanceof AppError) {
      throw err
    }
    throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN')
  }
}
