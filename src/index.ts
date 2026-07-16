import app from './app'
import prisma from './lib/prisma'
import redis from './lib/redis'
import logger from './lib/logger'

const PORT = parseInt(process.env.PORT ?? '3000', 10)

async function main() {
  try {
    // Connect to PostgreSQL via Prisma
    await prisma.$connect()
    logger.info('database_connected')

    // Test Redis connectivity.
    // Non-fatal: if Redis is unavailable at startup the server still starts.
    // Cache misses fall back to DB, rate limiting fails-open — both already
    // handled in cache.ts and rateLimiter.ts. ioredis will auto-reconnect
    // once Redis becomes available (retryStrategy in redis.ts).
    try {
      await redis.ping()
      logger.info('redis_connected')
    } catch (err) {
      logger.warn({ error: err }, 'redis_unavailable_at_startup — running in degraded cache mode')
    }

    // Start the HTTP server
    // Listen on 0.0.0.0 — required for Render/Docker/cloud containers.
    // Binding only to 127.0.0.1 (Node's default) makes the service unreachable externally.
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT, env: process.env.NODE_ENV ?? 'development' }, 'server_started')
    })

    // ─── Graceful Shutdown ──────────────────────────────
    const shutdown = async (signal: string) => {
      logger.info({ signal }, 'shutdown_signal_received')

      server.close(async () => {
        logger.info('http_server_closed')

        await prisma.$disconnect()
        logger.info('database_disconnected')

        redis.disconnect()
        logger.info('redis_disconnected')

        process.exit(0)
      })

      // Force exit after 10 seconds if graceful shutdown hangs
      setTimeout(() => {
        logger.error('forced_shutdown_timeout')
        process.exit(1)
      }, 10_000)
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'))
    process.on('SIGINT', () => shutdown('SIGINT'))
  } catch (err) {
    logger.error({ error: err }, 'startup_failed')
    await prisma.$disconnect()
    process.exit(1)
  }
}

main()
