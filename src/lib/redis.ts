import Redis from 'ioredis'
import logger from './logger'

/**
 * Singleton ioredis instance.
 * Never instantiate Redis elsewhere — always import from here.
 */
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

/**
 * Singleton ioredis instance.
 * Never instantiate Redis elsewhere — always import from here.
 *
 * TLS note: Upstash and most managed Redis providers use rediss:// (TLS).
 * ioredis requires an explicit { tls: {} } option when connecting over TLS.
 * enableReadyCheck: false is recommended by Upstash for serverless environments.
 */
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  ...(REDIS_URL.startsWith('rediss://') ? { tls: {} } : {}),
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
