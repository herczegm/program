import { http } from '../api/http'

export type Target = {
  userId: string
  competencyId: string
  targetLevel: number
  deadline: string | null
  createdAt: string
  updatedAt: string
}

export const targetsService = {
  // USER: csak saját (userId nélkül)
  listSelf() {
    return http<Target[]>('/targets')
  },

  // ADMIN: bárki
  listForUser(userId: string) {
    const qs = new URLSearchParams()
    qs.set('userId', userId)
    return http<Target[]>(`/targets?${qs.toString()}`)
  },

  upsertSelfCell(competencyId: string, targetLevel: number, deadline?: string | null) {
    return http<Target>('/targets/self/cell', {
      method: 'PUT',
      body: JSON.stringify({ competencyId, targetLevel, deadline: deadline ?? null }),
    })
  },

  upsertCell(userId: string, competencyId: string, targetLevel: number, deadline?: string | null) {
    return http<Target>('/targets/cell', {
      method: 'PUT',
      body: JSON.stringify({ userId, competencyId, targetLevel, deadline: deadline ?? null }),
    })
  },

  deleteSelfCell(competencyId: string) {
    const qs = new URLSearchParams()
    qs.set('competencyId', competencyId)
    return http<void>(`/targets/self/cell?${qs.toString()}`, { method: 'DELETE' })
  },

  deleteCell(userId: string, competencyId: string) {
    const qs = new URLSearchParams()
    qs.set('userId', userId)
    qs.set('competencyId', competencyId)
    return http<void>(`/targets/cell?${qs.toString()}`, { method: 'DELETE' })
  },
}
