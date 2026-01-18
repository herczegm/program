import { http } from '../api/http'

export type MatrixFast = {
  meta: {
    defaultLevel: number
    levelRange: number[]
    rowsCount: number
    columnsCount: number
  }
  groupHeaders: Array<{ groupId: string; groupName: string; start: number; span: number }>
  columns: Array<{ id: string; name: string; type: 'CORE' | 'CUSTOM'; groupId: string; groupName: string }>
  colIndexById: Record<string, number>
  rows: Array<{
    userId: string
    username: string
    displayName: string | null
    role: 'USER' | 'ADMIN'
    levelsDense: number[]
  }>
}

export const matrixService = {
  fast(params?: { userIds?: string[]; groupIds?: string[]; type?: 'CORE' | 'CUSTOM'; includeAdmins?: boolean; includeDeleted?: boolean }) {
    const qs = new URLSearchParams()
    if (params?.userIds?.length) qs.set('userIds', params.userIds.join(','))
    if (params?.groupIds?.length) qs.set('groupIds', params.groupIds.join(','))
    if (params?.type) qs.set('type', params.type)
    if (params?.includeAdmins !== undefined) qs.set('includeAdmins', params.includeAdmins ? '1' : '0')
    if (params?.includeDeleted) qs.set('includeDeleted', 'true')

    const q = qs.toString()
    return http<MatrixFast>(`/matrix/fast${q ? `?${q}` : ''}`)
  },

  setCell(userId: string, competencyId: string, level: number) {
    return http<{ userId: string; competencyId: string; level: number; updatedAt: string }>('/matrix/cell', {
      method: 'PATCH',
      body: JSON.stringify({ userId, competencyId, level }),
    })
  },

  setCells(cells: Array<{ userId: string; competencyId: string; level: number }>) {
    return http<{ updated: number }>('/matrix/cells', {
      method: 'PATCH',
      body: JSON.stringify({ cells }),
    })
  },
}
