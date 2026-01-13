import { http } from '../api/http'

export type LevelChange = {
  id: string
  createdAt: string
  oldLevel: number
  newLevel: number
  actor: { id: string; username: string; displayName: string | null }
  competency: { id: string; name: string; type: 'CORE' | 'CUSTOM'; group: { id: string; name: string } }
}

export const auditService = {
  userLevelChanges(userId: string, take = 50) {
    return http<LevelChange[]>(`/users/${userId}/level-changes?take=${take}`)
  },
}
