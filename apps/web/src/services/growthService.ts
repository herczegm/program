import { http } from '../api/http'

export type GrowthItem = {
  userId: string
  competencyId: string
  growth: number
}

export type GrowthResponse = {
  meta: {
    from: string
    to: string
    userIdsCount: number
    competencyIdsCount: number
  }
  items: GrowthItem[]
}

export const growthService = {
  get(params: { days: 30 | 90 | 180; userIds: string[]; competencyIds: string[] }) {
    const qs = new URLSearchParams()
    qs.set('days', String(params.days))
    if (params.userIds.length) qs.set('userIds', params.userIds.join(','))
    if (params.competencyIds.length) qs.set('competencyIds', params.competencyIds.join(','))
    return http<GrowthResponse>(`/growth?${qs.toString()}`)
  },
}
