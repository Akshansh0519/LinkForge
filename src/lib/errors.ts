import { Request, Response, NextFunction, RequestHandler } from 'express'

/**
 * Custom application error with HTTP status code.
 * All business logic errors should throw AppError — they're caught by the global error handler.
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

/**
 * Async handler wrapper — prevents repetitive try-catch in every controller.
 * Wraps async route handlers to forward rejected promises to Express error handler.
 */
export function asyncHandler(fn: RequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
