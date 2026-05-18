import { z } from 'zod'

/**
 * LinkForge — Zod Validation Schemas
 * All input validation uses Zod. No manual validation logic.
 * Schemas locked per spec Section 8.
 */

// ─── Auth Schemas ─────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
})

// ─── URL Schemas ──────────────────────────────────────

export const CreateUrlSchema = z.object({
  original: z.string().url({ message: 'Must be a valid URL including protocol' }),
  slug: z
    .string()
    .regex(/^[a-zA-Z0-9-_]{3,50}$/, {
      message: 'Slug must be 3-50 characters: letters, numbers, hyphens, underscores',
    })
    .optional(),
  expiresAt: z.string().datetime().optional(),
})

export const UpdateUrlSchema = CreateUrlSchema.partial().refine(
  (obj) => Object.keys(obj).length > 0,
  { message: 'At least one field required' }
)

// ─── Pagination Schema ───────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ─── Type Exports ─────────────────────────────────────

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type RefreshInput = z.infer<typeof RefreshSchema>
export type CreateUrlInput = z.infer<typeof CreateUrlSchema>
export type UpdateUrlInput = z.infer<typeof UpdateUrlSchema>
export type PaginationInput = z.infer<typeof PaginationSchema>
