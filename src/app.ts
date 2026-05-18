import express, { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'
import { ZodError } from 'zod'
import { AppError } from './lib/errors'
import logger from './lib/logger'
import authRoutes from './routes/auth.routes'
import urlRoutes from './routes/url.routes'
import redirectRoutes from './routes/redirect.routes'

/**
 * Express app factory — all middleware + routes wired here.
 * No server.listen — that happens in index.ts.
 */
const app = express()

// ─── Security Middleware (exact order per spec Section 10) ─────────
// 1. Helmet — 11 security headers including CSP, X-Frame-Options
app.use(helmet())

// 2. CORS — restrict to CLIENT_URL in production
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : '*',
    credentials: true,
  })
)

// 3. Body parser — 10kb limit prevents payload attacks
app.use(express.json({ limit: '10kb' }))

// 4. Access logging — morgan combined format
app.use(morgan('combined'))

// ─── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    ts: Date.now(),
    version: process.env.npm_package_version ?? '1.0.0',
    uptime: process.uptime(),
  })
})

// ─── API Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/urls', urlRoutes)

// ─── Public Redirect Route (must come AFTER /api/* routes) ────────
app.use('/', redirectRoutes)

// ─── 404 Handler ──────────────────────────────────────────────────
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError('Route not found', 404, 'NOT_FOUND'))
})

// ─── Global Error Handler (4-arg middleware, mounted LAST) ────────
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
    })
  }

  if (err instanceof ZodError) {
    // Safety net — should be caught by validateBody but just in case
    return res.status(400).json({
      error: 'Validation failed',
      details: err.flatten(),
    })
  }

  // Unexpected error
  logger.error({ err, path: req.path, method: req.method }, 'unhandled_error')
  res.status(500).json({ error: 'Internal server error' })
})

export default app
