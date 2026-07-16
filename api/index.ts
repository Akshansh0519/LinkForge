/**
 * Vercel Serverless Entry Point
 *
 * On Vercel, we do NOT call app.listen() — Vercel wraps the Express
 * app itself and handles incoming HTTP requests. We simply export the
 * configured app instance from app.ts.
 *
 * Prisma connects lazily (first query) so no explicit $connect() needed.
 * Redis connects lazily via ioredis and degrades gracefully if unavailable.
 */
import app from '../src/app'

export default app
