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

    // Redis connection is lazy (handled by ioredis internally)
    // but we ping to confirm
    await redis.ping()
    logger.info('redis_connected')

    // Start the HTTP server
    const server = app.listen(PORT, () => {
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
