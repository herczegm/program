import { getToken } from '../state/authStore'

const base = import.meta.env.VITE_API_BASE ?? '/api'

export class ApiError extends Error {
  status: number
  bodyText?: string
  constructor(status: number, message: string, bodyText?: string) {
    super(message)
    this.status = status
    this.bodyText = bodyText
  }
}

async function parseError(res: Response) {
  const text = await res.text().catch(() => '')
  const msg = `${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`
  return new ApiError(res.status, msg, text)
}

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(init.headers)

  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${base}${path}`, { ...init, headers })

  if (!res.ok) throw await parseError(res)
  if (res.status === 204) return undefined as T

  return (await res.json()) as T
}
