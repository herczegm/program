import { http } from '../api/http'

export type Competency = {
  id: string
  name: string
  type: 'CORE' | 'CUSTOM'
  groupId: string
  sortOrder: number
}

export type CompetencySuggestItem = {
  id: string
  name: string
  type: 'CORE' | 'CUSTOM'
  group: {
    id: string
    name: string
  }
}

export const competenciesService = {
  list() {
    return http<Competency[]>('/competencies')
  },

  suggest(q: string) {
    const qs = new URLSearchParams()
    if (q.trim()) qs.set('q', q.trim())
    const s = qs.toString()
    return http<CompetencySuggestItem[]>(
      `/competencies/suggest?${s ? `${s}` : ''}`,
    )
  },

  createCustom(dto:{ name: string; groupId: string }) {
    return http<Competency>('/competencies/custom', {
      method: 'POST',
      body: JSON.stringify(dto)
    })
  },

  create(dto: { name: string; type?: 'CORE' | 'CUSTOM'; groupId: string; sortOrder?: number }) {
    return http<Competency>('/competencies', { method: 'POST', body: JSON.stringify(dto) })
  },

  update(id: string, dto: Partial<{ name: string; type: 'CORE' | 'CUSTOM'; groupId: string; sortOrder: number; isDeleted: boolean }>) {
    return http<Competency>(`/competencies/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
  },

  softDelete(id: string) {
    return http<Competency>(`/competencies/${id}/delete`, { method: 'PATCH' })
  },

  reorder(ids: string[]) {
    return http<void>('competencies/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
    })
  },

}
