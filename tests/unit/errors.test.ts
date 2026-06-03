import { AppError } from '../../src/lib/errors'

describe('AppError', () => {
  it('should create an error with message, statusCode, and code', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND')

    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
    expect(err.message).toBe('Not found')
    expect(err.statusCode).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.name).toBe('AppError')
  })

  it('should work without an error code', () => {
    const err = new AppError('Server error', 500)

    expect(err.statusCode).toBe(500)
    expect(err.code).toBeUndefined()
  })

  it('should be catchable as an instance of AppError', () => {
    try {
      throw new AppError('Test error', 400, 'BAD_REQUEST')
    } catch (e) {
      expect(e).toBeInstanceOf(AppError)
      if (e instanceof AppError) {
        expect(e.statusCode).toBe(400)
      }
    }
  })

  it('should maintain proper prototype chain', () => {
    const err = new AppError('Test', 500)
    expect(Object.getPrototypeOf(err)).toBe(AppError.prototype)
  })
})
