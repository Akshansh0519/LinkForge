const API_BASE = import.meta.env.VITE_API_URL || ''

interface RequestOptions {
  method?: string
  body?: unknown
  token?: string | null
}

class ApiError extends Error {
  status: number
  code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null as T

  const data = await res.json()
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong', res.status, data.code)
  return data as T
}

// ─── Auth ─────────────────────────────────────────────
export interface AuthResponse {
  user: { id: string; email: string; createdAt: string }
  accessToken: string
  refreshToken: string
}

export const authApi = {
  register: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: { email, password } }),
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password } }),
  refresh: (refreshToken: string) =>
    request<AuthResponse>('/api/auth/refresh', { method: 'POST', body: { refreshToken } }),
}

// ─── URLs ─────────────────────────────────────────────
export interface UrlResponse {
  id: string
  slug: string
  original: string
  shortUrl: string
  expiresAt: string | null
  createdAt: string
  clickCount: number
}

export interface UrlListResponse {
  urls: UrlResponse[]
  total: number
  page: number
  pages: number
}

export interface CreateUrlPayload {
  original: string
  slug?: string
  expiresAt?: string
}

export const urlApi = {
  create: (data: CreateUrlPayload, token: string) =>
    request<UrlResponse>('/api/urls', { method: 'POST', body: data, token }),
  list: (page: number, limit: number, token: string) =>
    request<UrlListResponse>(`/api/urls?page=${page}&limit=${limit}`, { token }),
  get: (id: string, token: string) =>
    request<UrlResponse>(`/api/urls/${id}`, { token }),
  update: (id: string, data: Partial<CreateUrlPayload>, token: string) =>
    request<UrlResponse>(`/api/urls/${id}`, { method: 'PATCH', body: data, token }),
  delete: (id: string, token: string) =>
    request<void>(`/api/urls/${id}`, { method: 'DELETE', token }),
  qr: (id: string, token: string) =>
    `${API_BASE}/api/urls/${id}/qr?token=${token}`,
}

// ─── Analytics ────────────────────────────────────────
export interface AnalyticsResponse {
  urlId: string
  totalClicks: number
  clicksByDay: { date: string; count: number }[]
  clicksByCountry: { country: string; count: number }[]
  clicksByDevice: { device: string; count: number }[]
  clicksByReferrer: { referrer: string; count: number }[]
}

export const analyticsApi = {
  get: (urlId: string, token: string) =>
    request<AnalyticsResponse>(`/api/urls/${urlId}/analytics`, { token }),
}

export { ApiError }
