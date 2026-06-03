import request from 'supertest'

// Mock rate limiter to bypass Redis dependency in tests
const passthrough = (_req: unknown, _res: unknown, next: () => void) => next()
jest.mock('../../src/middleware/rateLimiter', () => ({
  slidingWindowRateLimit: () => passthrough,
  authRateLimit: passthrough,
  refreshRateLimit: passthrough,
  redirectRateLimit: passthrough,
  createUrlRateLimit: passthrough,
  analyticsRateLimit: passthrough,
}))

import app from '../../src/app'

/**
 * Integration tests for the Express app.
 *
 * These tests hit the actual Express middleware stack (helmet, cors, body parser,
 * error handler) but don't require a running database or Redis.
 * Routes that touch DB/Redis will return appropriate errors, which we can assert on.
 */

describe('Health Check', () => {
  it('GET /api/health should return 200 with status ok', async () => {
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('status', 'ok')
    expect(res.body).toHaveProperty('ts')
    expect(res.body).toHaveProperty('uptime')
    expect(typeof res.body.ts).toBe('number')
  })
})

describe('404 Handler', () => {
  it('should return 404 for unknown API routes', async () => {
    const res = await request(app).get('/api/nonexistent')

    expect(res.status).toBe(404)
    expect(res.body).toHaveProperty('error', 'Route not found')
    expect(res.body).toHaveProperty('code', 'NOT_FOUND')
  })
})

describe('Auth Validation', () => {
  it('POST /api/auth/register should return 400 for missing body', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error', 'Validation failed')
    expect(res.body).toHaveProperty('details')
  })

  it('POST /api/auth/register should return 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'bad-email', password: 'securepass123' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
  })

  it('POST /api/auth/register should return 400 for short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@test.com', password: 'short' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
  })

  it('POST /api/auth/login should return 400 for missing credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
  })

  it('POST /api/auth/refresh should return 400 for missing token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({})

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation failed')
  })
})

describe('Protected Routes', () => {
  it('POST /api/urls should return 401 without auth token', async () => {
    const res = await request(app)
      .post('/api/urls')
      .send({ original: 'https://example.com' })

    expect(res.status).toBe(401)
  })

  it('GET /api/urls should return 401 without auth token', async () => {
    const res = await request(app).get('/api/urls')

    expect(res.status).toBe(401)
  })
})

describe('Security Headers', () => {
  it('should include helmet security headers', async () => {
    const res = await request(app).get('/api/health')

    // Helmet sets these headers
    expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff')
    expect(res.headers).toHaveProperty('x-frame-options')
  })

  it('should include CORS headers', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3001')

    expect(res.headers).toHaveProperty('access-control-allow-origin')
  })
})

describe('Body Parser Limits', () => {
  it('should reject payloads exceeding 10kb', async () => {
    const largeBody = { data: 'x'.repeat(20000) }
    const res = await request(app)
      .post('/api/auth/register')
      .send(largeBody)

    // Global error handler catches the PayloadTooLargeError
    expect([413, 500]).toContain(res.status)
  })
})
