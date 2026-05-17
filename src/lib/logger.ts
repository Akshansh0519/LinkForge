import pino from 'pino'

/**
 * Pino logger — JSON in production, pretty-printed in development.
 * All logging in the application goes through this logger.
 * Never use console.log in any production-path code.
 */
const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport:
    process.env.NODE_ENV !== 'production'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
})

export default logger
