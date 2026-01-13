import { http } from '../api/http'
import { type CompetencyGroupModel } from '../models/CompetencyGroupModel';

export const competencyGroupsService = {

  listActive() {
    return http<CompetencyGroupModel[]>('/competency-groups')
  },

  reorder(ids: string[]) {
    return http<CompetencyGroupModel[]>('/competency-groups/reorder', {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
    })
  },

  create(dto: { name: string; sortOrder?: number }) {
    return http<CompetencyGroupModel>('/competency-groups', { method: 'POST', body: JSON.stringify(dto) })
  },

  update(id: string, dto: { name?: string; sortOrder?: number; isDeleted?: boolean }) {
    return http<CompetencyGroupModel>(`/competency-groups/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
  },

  softDelete(id: string) {
    return http<CompetencyGroupModel>(`/competency-groups/${id}/delete`, { method: 'PATCH' })
  },
  
}
