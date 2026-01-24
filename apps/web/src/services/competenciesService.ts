import { http } from '../api/http'

export type Competency = {
  id: string
  name: string
  type: 'CORE' | 'CUSTOM'
  groupId: string
  sortOrder: number
}

export const competenciesService = {
  list() {
    return http<Competency[]>('/competencies')
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

  suggest(q: string) {
    const s = (q ?? '').trim()
    if (s.length < 2) return Promise.resolve([])
    return http<Array<{ id: string; name: string; type: 'CORE' | 'CUSTOM'; group: { id: string; name: string } }>>(
      `/competencies/suggest?q=${encodeURIComponent(s)}`,
    )
  },

  createCustom(dto:{ name: string; groupId: string }) {
    return http<Competency>('/competencies/custom', { method: 'POST', body: JSON.stringify(dto) })
  }
}
