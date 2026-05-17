import { PrismaClient } from '@prisma/client'
import logger from './logger'

/**
 * Singleton PrismaClient instance.
 * Never instantiate PrismaClient elsewhere — always import from here.
 */
const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ]
      : [{ emit: 'event', level: 'error' }],
})

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug({ duration: e.duration, query: e.query }, 'prisma_query')
  })
}

prisma.$on('error', (e) => {
  logger.error({ message: e.message }, 'prisma_error')
})

export default prisma
