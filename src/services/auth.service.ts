import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma'
import redis from '../lib/redis'
import logger from '../lib/logger'
import { AppError } from '../lib/errors'

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10)
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60 // 7 days in seconds

// ─── Token Generation ─────────────────────────────────

function generateAccessToken(userId: string): string {
  const secret = process.env.ACCESS_TOKEN_SECRET
  if (!secret) throw new AppError('ACCESS_TOKEN_SECRET not configured', 500)
  return jwt.sign({ userId, type: 'access' }, secret, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

function generateRefreshToken(userId: string): string {
  const secret = process.env.REFRESH_TOKEN_SECRET
  if (!secret) throw new AppError('REFRESH_TOKEN_SECRET not configured', 500)
  return jwt.sign({ userId, type: 'refresh' }, secret, { expiresIn: REFRESH_TOKEN_EXPIRY })
}

function generateTokens(userId: string) {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId),
  }
}

/**
 * Store refresh token in Redis.
 * Key: refresh:{userId}:{tokenHash} where tokenHash = first 16 chars of token
 * Value: "1"
 * TTL: 7 days
 */
async function storeRefreshToken(userId: string, token: string): Promise<void> {
  const tokenHash = token.substring(0, 16)
  const key = `refresh:${userId}:${tokenHash}`
  await redis.setex(key, REFRESH_TOKEN_TTL, '1')
}

/**
 * Verify refresh token exists in Redis (not revoked).
 */
async function isRefreshTokenValid(userId: string, token: string): Promise<boolean> {
  const tokenHash = token.substring(0, 16)
  const key = `refresh:${userId}:${tokenHash}`
  const exists = await redis.exists(key)
  return exists === 1
}

/**
 * Revoke a specific refresh token.
 */
async function revokeRefreshToken(userId: string, token: string): Promise<void> {
  const tokenHash = token.substring(0, 16)
  const key = `refresh:${userId}:${tokenHash}`
  await redis.del(key)
}

// ─── Public API ───────────────────────────────────────

/**
 * Register a new user.
 * Returns user data + access/refresh tokens.
 */
export async function register(email: string, password: string) {
  // Check for existing user
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new AppError('Email already registered', 409, 'EMAIL_EXISTS')
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const user = await prisma.user.create({
    data: { email, passwordHash },
    select: { id: true, email: true, createdAt: true },
  })

  const tokens = generateTokens(user.id)
  await storeRefreshToken(user.id, tokens.refreshToken)

  logger.info({ userId: user.id }, 'user_registered')

  return {
    user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
    ...tokens,
  }
}

/**
 * Login an existing user.
 * Returns user data + access/refresh tokens.
 */
export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, createdAt: true },
  })

  if (!user) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)
  if (!isValid) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS')
  }

  const tokens = generateTokens(user.id)
  await storeRefreshToken(user.id, tokens.refreshToken)

  logger.info({ userId: user.id }, 'user_logged_in')

  return {
    user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
    ...tokens,
  }
}

/**
 * Refresh token rotation.
 * Verify JWT → check Redis key exists → issue new tokens → DEL old key → SET new key.
 */
export async function refresh(refreshToken: string) {
  const secret = process.env.REFRESH_TOKEN_SECRET
  if (!secret) throw new AppError('REFRESH_TOKEN_SECRET not configured', 500)

  let decoded: { userId: string; type: string }
  try {
    decoded = jwt.verify(refreshToken, secret) as { userId: string; type: string }
  } catch {
    throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN')
  }

  if (decoded.type !== 'refresh') {
    throw new AppError('Invalid token type', 401, 'INVALID_TOKEN_TYPE')
  }

  // Check token exists in Redis (not revoked)
  const isValid = await isRefreshTokenValid(decoded.userId, refreshToken)
  if (!isValid) {
    throw new AppError('Refresh token has been revoked', 401, 'TOKEN_REVOKED')
  }

  // Revoke old token
  await revokeRefreshToken(decoded.userId, refreshToken)

  // Issue new tokens
  const tokens = generateTokens(decoded.userId)
  await storeRefreshToken(decoded.userId, tokens.refreshToken)

  // Get user data
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true, createdAt: true },
  })

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND')
  }

  logger.info({ userId: user.id }, 'token_refreshed')

  return {
    user: { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() },
    ...tokens,
  }
}
