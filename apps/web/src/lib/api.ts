import { getToken } from './token'

const base = import.meta.env.VITE_API_BASE ?? '/api'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(init.headers)

  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${base}${path}`, { ...init, headers })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${res.statusText}${text ? ` - ${text}` : ''}`)
  }

  // 204 eset
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  login: (username: string, password: string) =>
    request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<{ id: string; username: string; displayName: string | null; email: string | null; role: 'USER' | 'ADMIN' }>('/auth/me'),

  matrixFast: (params?: { userIds?: string[]; groupIds?: string[]; type?: 'CORE' | 'CUSTOM'; includeAdmins?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.userIds?.length) qs.set('userIds', params.userIds.join(','))
    if (params?.groupIds?.length) qs.set('groupIds', params.groupIds.join(','))
    if (params?.type) qs.set('type', params.type)
    if (params?.includeAdmins !== undefined) qs.set('includeAdmins', params.includeAdmins ? '1' : '0')
    const q = qs.toString()
    return request<any>(`/matrix/fast${q ? `?${q}` : ''}`)
  },

  setCell: (userId: string, competencyId: string, level: number) =>
    request<{ userId: string; competencyId: string; level: number; updatedAt: string }>('/matrix/cell', {
      method: 'PATCH',
      body: JSON.stringify({ userId, competencyId, level }),
    }),

  setCells: (cells: Array<{ userId: string; competencyId: string; level: number }>) =>
    request<{ updated: number }>('/matrix/cells', {
      method: 'PATCH',
      body: JSON.stringify({ cells }),
    }),

  groupsTree: (params?: { type?: 'CORE' | 'CUSTOM'; includeDeleted?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.type) qs.set('type', params.type)
    if (params?.includeDeleted) qs.set('includeDeleted', '1')
    const q = qs.toString()
    return request<any>(`/competency-groups/tree${q ? `?${q}` : ''}`)
  },

  competenciesByGroup: (params?: { type?: 'CORE' | 'CUSTOM'; includeDeleted?: boolean }) => {
    const qs = new URLSearchParams()
    if (params?.type) qs.set('type', params.type)
    if (params?.includeDeleted) qs.set('includeDeleted', '1')
    const q = qs.toString()
    return request<any>(`/competencies/by-group${q ? `?${q}` : ''}`)
  },

  users: (q?: string) => request<any>(`/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
}
