import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  CreateUrlSchema,
  UpdateUrlSchema,
  PaginationSchema,
} from '../../src/validators'

// ─── Auth Schemas ─────────────────────────────────────

describe('RegisterSchema', () => {
  it('should accept valid email and password', () => {
    const result = RegisterSchema.safeParse({
      email: 'test@example.com',
      password: 'securepass123',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid email', () => {
    const result = RegisterSchema.safeParse({
      email: 'not-an-email',
      password: 'securepass123',
    })
    expect(result.success).toBe(false)
  })

  it('should reject short password (< 8 chars)', () => {
    const result = RegisterSchema.safeParse({
      email: 'test@example.com',
      password: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('should reject password exceeding 128 chars', () => {
    const result = RegisterSchema.safeParse({
      email: 'test@example.com',
      password: 'a'.repeat(129),
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing fields', () => {
    const result = RegisterSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('LoginSchema', () => {
  it('should accept valid login data', () => {
    const result = LoginSchema.safeParse({
      email: 'user@domain.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing password', () => {
    const result = LoginSchema.safeParse({ email: 'user@domain.com' })
    expect(result.success).toBe(false)
  })
})

describe('RefreshSchema', () => {
  it('should accept a non-empty refresh token', () => {
    const result = RefreshSchema.safeParse({ refreshToken: 'some-token' })
    expect(result.success).toBe(true)
  })

  it('should reject an empty refresh token', () => {
    const result = RefreshSchema.safeParse({ refreshToken: '' })
    expect(result.success).toBe(false)
  })

  it('should reject missing refreshToken field', () => {
    const result = RefreshSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ─── URL Schemas ──────────────────────────────────────

describe('CreateUrlSchema', () => {
  it('should accept a valid URL without optional fields', () => {
    const result = CreateUrlSchema.safeParse({
      original: 'https://example.com/page',
    })
    expect(result.success).toBe(true)
  })

  it('should accept a valid URL with a custom slug', () => {
    const result = CreateUrlSchema.safeParse({
      original: 'https://example.com',
      slug: 'my-link',
    })
    expect(result.success).toBe(true)
  })

  it('should accept a valid URL with expiresAt datetime', () => {
    const result = CreateUrlSchema.safeParse({
      original: 'https://example.com',
      expiresAt: '2026-12-31T23:59:59Z',
    })
    expect(result.success).toBe(true)
  })

  it('should reject a URL without protocol', () => {
    const result = CreateUrlSchema.safeParse({
      original: 'example.com',
    })
    expect(result.success).toBe(false)
  })

  it('should reject a slug shorter than 3 characters', () => {
    const result = CreateUrlSchema.safeParse({
      original: 'https://example.com',
      slug: 'ab',
    })
    expect(result.success).toBe(false)
  })

  it('should reject a slug longer than 50 characters', () => {
    const result = CreateUrlSchema.safeParse({
      original: 'https://example.com',
      slug: 'a'.repeat(51),
    })
    expect(result.success).toBe(false)
  })

  it('should reject a slug with special characters', () => {
    const result = CreateUrlSchema.safeParse({
      original: 'https://example.com',
      slug: 'my slug!',
    })
    expect(result.success).toBe(false)
  })

  it('should accept a slug with hyphens and underscores', () => {
    const result = CreateUrlSchema.safeParse({
      original: 'https://example.com',
      slug: 'my-custom_slug',
    })
    expect(result.success).toBe(true)
  })
})

describe('UpdateUrlSchema', () => {
  it('should accept a partial update with only original', () => {
    const result = UpdateUrlSchema.safeParse({
      original: 'https://new-url.com',
    })
    expect(result.success).toBe(true)
  })

  it('should accept a partial update with only slug', () => {
    const result = UpdateUrlSchema.safeParse({
      slug: 'new-slug',
    })
    expect(result.success).toBe(true)
  })

  it('should reject an empty update (no fields)', () => {
    const result = UpdateUrlSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ─── Pagination Schema ───────────────────────────────

describe('PaginationSchema', () => {
  it('should use defaults when no values provided', () => {
    const result = PaginationSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
    }
  })

  it('should coerce string values to numbers', () => {
    const result = PaginationSchema.safeParse({ page: '3', limit: '50' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(3)
      expect(result.data.limit).toBe(50)
    }
  })

  it('should reject page < 1', () => {
    const result = PaginationSchema.safeParse({ page: 0 })
    expect(result.success).toBe(false)
  })

  it('should reject limit > 100', () => {
    const result = PaginationSchema.safeParse({ limit: 101 })
    expect(result.success).toBe(false)
  })

  it('should reject non-integer page', () => {
    const result = PaginationSchema.safeParse({ page: 1.5 })
    expect(result.success).toBe(false)
  })
})
