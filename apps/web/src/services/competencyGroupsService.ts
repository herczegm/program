import { http } from '../api/http'

export const competencyGroupsService = {

  listActive() {
    return http<Array<{ id: string; name: string; sortOrder: number }>>('/competency-groups')
  },

  reorder(ids: string[]) {
    return http<Array<{id: string; name: string; sortOrder: number}>>('/competency-groups/reored', {
      method: 'PATCH',
      body: JSON.stringify({ ids }),
    })
  },
}
