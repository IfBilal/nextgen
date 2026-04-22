import { API_BASE_URL } from '../config/env'

interface ApiErrorPayload {
  error?: {
    code?: string
    message?: string
  }
}

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

function joinUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

async function parseResponseJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    return null
  }

  return (await response.json()) as T
}

export async function apiRequest<TResponse>(
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: unknown } = {},
): Promise<TResponse> {
  const headers = new Headers(options.headers)
  const hasBody = typeof options.body !== 'undefined'

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(joinUrl(path), {
    ...options,
    headers,
    body: hasBody ? JSON.stringify(options.body) : undefined,
  })

  const payload = await parseResponseJson<TResponse & ApiErrorPayload>(response)

  if (!response.ok) {
    const message = payload?.error?.message ?? 'Request failed'
    const code = payload?.error?.code
    throw new ApiError(message, response.status, code)
  }

  if (!payload) {
    throw new ApiError('Expected JSON response', response.status)
  }

  return payload
}
