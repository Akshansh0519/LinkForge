import Redis from 'ioredis'
import logger from './logger'

/**
 * Singleton ioredis instance.
 * Never instantiate Redis elsewhere — always import from here.
 */
const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    const delay = Math.min(times * 200, 5000)
    logger.warn({ attempt: times, delayMs: delay }, 'redis_retry')
    return delay
  },
  lazyConnect: false,
})

redis.on('connect', () => {
  logger.info('redis_connected')
})

redis.on('error', (err: Error) => {
  logger.error({ error: err.message }, 'redis_error')
})

export default redis
