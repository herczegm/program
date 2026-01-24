import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CompetencyType, Role } from '@prisma/client'

type Column = {
  id: string
  name: string
  type: 'CORE' | 'CUSTOM'
  groupId: string
  groupName: string
  sortOrder: number
  groupSortOrder: number
}

type GroupHeader = {
  groupId: string
  groupName: string
  start: number // column index
  span: number  // hány oszlop tartozik ide
}

type Row = {
  userId: string
  username: string
  displayName: string | null
  role: 'USER' | 'ADMIN'
  levelsDense: number[] // columns[] sorrendjében, default 0
}

export type FastMatrixFilters = {
  userIds?: string[]
  groupIds?: string[]
  type?: 'CORE' | 'CUSTOM'
  includeAdmins?: boolean
  includeDeleted?: boolean
  levelCompetencyId?: string
  minLevel?: number
  exactLevel?: number
}

@Injectable()
export class MatrixService {
  constructor(private readonly prisma: PrismaService) {}

  async getFastMatrix(filters: FastMatrixFilters = {}) {
    const includeAdmins = filters.includeAdmins ?? true
    const includeDeleted = !!filters.includeDeleted

    // 1) Kompetenciák (oszlopok) fix sorrendben
    const competencies = await this.prisma.competency.findMany({
      where: { 
        ...(includeDeleted ? {} : { isDeleted: false }),
        ...(includeDeleted ? {} : { group: { isDeleted: false } }),
        ...(filters.groupIds?.length ? { groupId: { in: filters.groupIds } } : {}),
        ...(filters.type ? { type: filters.type as CompetencyType } : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        sortOrder: true,
        groupId: true,
        group: { select: { name: true, sortOrder: true } },
      },
      orderBy: [
        { group: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    })

    const columns: Column[] = competencies.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      groupId: c.groupId,
      groupName: c.group.name,
      sortOrder: c.sortOrder,
      groupSortOrder: c.group.sortOrder,
    }))

    // colIndexById: gyors indexeléshez
    const colIndexById: Record<string, number> = {}
    for (let i = 0; i < columns.length; i++) colIndexById[columns[i].id] = i

    // groupHeaders: UI fejléchez (colspan)
    const groupHeaders: GroupHeader[] = []
    let i = 0
    while (i < columns.length) {
      const gId = columns[i].groupId
      const gName = columns[i].groupName
      const start = i
      while (i < columns.length && columns[i].groupId === gId) i++
      groupHeaders.push({ groupId: gId, groupName: gName, start, span: i - start })
    }

    // 2) Userek (sorok)
    const hasLevelFilter = !!filters.levelCompetencyId && (filters.minLevel !== undefined || filters.exactLevel !== undefined)

    // base where
    const userWhere: any = {
      ...(filters.userIds?.length ? { id: { in: filters.userIds } } : {}),
      ...(includeAdmins ? {} : { role: Role.USER }),
    }

    if (hasLevelFilter) {
      const competencyId = filters.levelCompetencyId!

      // exactLevel = 0: include users with no record OR record level 0.
      if (filters.exactLevel === 0) {
        const nonZero = await this.prisma.userCompetencyLevel.findMany({
          where: { competencyId, level: { gt: 0 } },
          select: { userId: true },
          distinct: ['userId'],
        })
        const nonZeroIds = nonZero.map((x) => x.userId)

        // combine with existing in-filter if any
        if (userWhere.id?.in) {
          const base: string[] = userWhere.id.in
          const nonZeroSet = new Set(nonZeroIds)
          userWhere.id.in = base.filter((id: string) => !nonZeroSet.has(id))
        } else {
          userWhere.id = { ...(userWhere.id ?? {}), notIn: nonZeroIds }
        }
      } else {
        const levelWhere =
          filters.exactLevel !== undefined
            ? { level: filters.exactLevel }
            : { level: { gte: filters.minLevel! } }

        const matches = await this.prisma.userCompetencyLevel.findMany({
          where: { competencyId, ...levelWhere },
          select: { userId: true },
          distinct: ['userId'],
        })
        const matchIds = matches.map((x) => x.userId)

        // intersection with base userIds if provided
        if (userWhere.id?.in) {
          const base: string[] = userWhere.id.in
          const matchSet = new Set(matchIds)
          userWhere.id.in = base.filter((id: string) => matchSet.has(id))
        } else {
          userWhere.id = { ...(userWhere.id ?? {}), in: matchIds }
        }
      }
    }

    // EARLY RETURN: ha >=N vagy exact>0 szűrésre nincs egyetlen user sem
    if (hasLevelFilter && filters.exactLevel !== 0 && Array.isArray(userWhere.id?.in) && userWhere.id.in.length === 0) {
      return {
        meta: {
          defaultLevel: 0,
          levelRange: [0, 1, 2, 3],
          rowsCount: 0,
          columnsCount: columns.length,
          filters: {
            userIds: filters.userIds ?? null,
            groupIds: filters.groupIds ?? null,
            type: filters.type ?? null,
            includeAdmins,
            includeDeleted,
            levelCompetencyId: filters.levelCompetencyId ?? null,
            minLevel: filters.minLevel ?? null,
            exactLevel: filters.exactLevel ?? null,
          },
        },
        groupHeaders,
        columns,
        colIndexById,
        rows: [],
      }
    }

    const users = await this.prisma.user.findMany({
      where: userWhere,
      select: { id: true, username: true, displayName: true, role: true },
      orderBy: [{ username: 'asc' }],
    })


    // 3) Szintek – csak a releváns competencyId-kre kérjük le (gyorsabb + kevesebb adat)
    const competencyIds = columns.map((c) => c.id)
    const userIds = users.map((u) => u.id)

    const levels = competencyIds.length
      ? await this.prisma.userCompetencyLevel.findMany({
          where: {
            userId: { in: userIds },
            competencyId: { in: competencyIds }
          },
          select: { userId: true, competencyId: true, level: true },
        })
      : []

    // 4) userId -> dense array
    const denseByUser = new Map<string, number[]>()
    const makeDense = () => Array.from({ length: columns.length }, () => 0)

    for (const u of users) denseByUser.set(u.id, makeDense())

    for (const l of levels) {
      const arr = denseByUser.get(l.userId)
      if (!arr) continue
      const idx = colIndexById[l.competencyId]
      if (idx === undefined) continue
      arr[idx] = l.level
    }

    const rows: Row[] = users.map((u) => ({
      userId: u.id,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      levelsDense: denseByUser.get(u.id) ?? makeDense(),
    }))

    return {
      meta: {
        defaultLevel: 0,
        levelRange: [0, 1, 2, 3],
        rowsCount: rows.length,
        columnsCount: columns.length,
        filters: {
          userIds: filters.userIds ?? null,
          groupIds: filters.groupIds ?? null,
          type: filters.type ?? null,
          includeAdmins,
          includeDeleted,
          levelCompetencyId: filters.levelCompetencyId ?? null,
          minLevel: filters.minLevel ?? null,
          exactLevel: filters.exactLevel ?? null,
        },
      },
      groupHeaders,
      columns,
      colIndexById,
      rows,
    }
  }
}
