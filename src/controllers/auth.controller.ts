import { Request, Response } from 'express'
import * as authService from '../services/auth.service'

/**
 * POST /api/auth/register
 * Creates a new user and returns tokens.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body
  const result = await authService.register(email, password)
  res.status(201).json(result)
}

/**
 * POST /api/auth/login
 * Authenticates a user and returns tokens.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body
  const result = await authService.login(email, password)
  res.status(200).json(result)
}

/**
 * POST /api/auth/refresh
 * Rotates refresh token and returns new tokens.
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body
  const result = await authService.refresh(refreshToken)
  res.status(200).json(result)
}
