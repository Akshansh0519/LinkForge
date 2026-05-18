import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'

/**
 * Zod validation middleware factory.
 * Validates req.body against the provided schema.
 * On failure: returns 400 with flattened Zod errors.
 * On success: replaces req.body with parsed + coerced data and calls next().
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      })
      return
    }
    req.body = result.data // replace with parsed + coerced data
    next()
  }
}

/**
 * Zod validation middleware factory for query parameters.
 * Validates req.query against the provided schema.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten(),
      })
      return
    }
    // Attach parsed query as a typed property
    ;(req as Request & { parsedQuery: T }).parsedQuery = result.data
    next()
  }
}
