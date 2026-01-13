import { http } from '../api/http'

export const competencyGroupsService = {
  listActive() {
    return http<Array<{ id: string; name: string; sortOrder: number }>>('/competency-groups')
  },
}
