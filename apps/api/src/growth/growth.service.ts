import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma } from '@prisma/client'

type GetGrowthInput = {
  userIds: string[]
  competencyIds: string[]
  from: Date
  to: Date
  includeDeleted: boolean
}

@Injectable()
export class GrowthService {
  constructor(private readonly prisma: PrismaService) {}

  async getGrowth(input: GetGrowthInput) {
    const { userIds, competencyIds, from, to, includeDeleted } = input

    // opcionális: kompetencia validáció + includeDeleted policy
    // (jó, ha nem számolunk olyan kompetenciára, ami törölt és includeDeleted=false)
    if (!includeDeleted) {
      const comps = await this.prisma.competency.findMany({
        where: { id: { in: competencyIds }, isDeleted: false, group: { isDeleted: false } },
        select: { id: true },
      })
      if (comps.length !== competencyIds.length) {
        throw new BadRequestException('Some competencyIds are invalid or deleted')
      }
    }

    /**
     * SQL stratégia:
     * - all_pairs: userIds x competencyIds (ennyi output kell, UI-nak ez jellemzően kell)
     * - start_level: last change <= from
     * - end_level: last change <= to
     * - growth = greatest(end - start, 0)
     *
     * DISTINCT ON + ORDER BY ... createdAt DESC → gyors, ha van megfelelő index
     */
    const rows = await this.prisma.$queryRaw<
      Array<{
        userId: string
        competencyId: string
        fromLevel: number | null
        toLevel: number | null
        growth: number
      }>
    >(Prisma.sql`
      WITH
      users AS (
        SELECT UNNEST(${Prisma.join(userIds)}::text[]) AS "userId"
      ),
      comps AS (
        SELECT UNNEST(${Prisma.join(competencyIds)}::text[]) AS "competencyId"
      ),
      pairs AS (
        SELECT u."userId", c."competencyId"
        FROM users u CROSS JOIN comps c
      ),
      start_level AS (
        SELECT DISTINCT ON (clc."targetUserId", clc."competencyId")
          clc."targetUserId" AS "userId",
          clc."competencyId"  AS "competencyId",
          clc."newLevel"      AS "level"
        FROM "CompetencyLevelChange" clc
        WHERE
          clc."targetUserId" = ANY(${Prisma.join(userIds)}::text[])
          AND clc."competencyId" = ANY(${Prisma.join(competencyIds)}::text[])
          AND clc."createdAt" <= ${from}
        ORDER BY clc."targetUserId", clc."competencyId", clc."createdAt" DESC
      ),
      end_level AS (
        SELECT DISTINCT ON (clc."targetUserId", clc."competencyId")
          clc."targetUserId" AS "userId",
          clc."competencyId"  AS "competencyId",
          clc."newLevel"      AS "level"
        FROM "CompetencyLevelChange" clc
        WHERE
          clc."targetUserId" = ANY(${Prisma.join(userIds)}::text[])
          AND clc."competencyId" = ANY(${Prisma.join(competencyIds)}::text[])
          AND clc."createdAt" <= ${to}
        ORDER BY clc."targetUserId", clc."competencyId", clc."createdAt" DESC
      )
      SELECT
        p."userId",
        p."competencyId",
        COALESCE(sl."level", 0) AS "fromLevel",
        COALESCE(el."level", 0) AS "toLevel",
        GREATEST(COALESCE(el."level", 0) - COALESCE(sl."level", 0), 0) AS "growth"
      FROM pairs p
      LEFT JOIN start_level sl
        ON sl."userId" = p."userId" AND sl."competencyId" = p."competencyId"
      LEFT JOIN end_level el
        ON el."userId" = p."userId" AND el."competencyId" = p."competencyId"
      ORDER BY p."userId", p."competencyId"
    `)

    return {
      meta: {
        from: from.toISOString(),
        to: to.toISOString(),
        userIdsCount: userIds.length,
        competencyIdsCount: competencyIds.length,
      },
      items: rows,
    }
  }
}
