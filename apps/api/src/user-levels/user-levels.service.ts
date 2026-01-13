import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UserLevelsService {
  constructor(private readonly prisma: PrismaService) {}

  async setLevelsForUser(userId: string, items: { competencyId: string; level: number }[]) {
    // valid competency check (only active)
    const ids = [...new Set(items.map((x) => x.competencyId))]
    const existing = await this.prisma.competency.findMany({
      where: { id: { in: ids }, isDeleted: false, group: { isDeleted: false } },
      select: { id: true },
    })
    if (existing.length !== ids.length) throw new BadRequestException('Invalid competencyId in items')

    // upsert in transaction
    await this.prisma.$transaction(
      items.map((x) =>
        this.prisma.userCompetencyLevel.upsert({
          where: { userId_competencyId: { userId, competencyId: x.competencyId } },
          create: { userId, competencyId: x.competencyId, level: x.level },
          update: { level: x.level },
        }),
      ),
    )

    return this.prisma.userCompetencyLevel.findMany({
      where: { userId, competency: { isDeleted: false, group: { isDeleted: false } } },
      include: { competency: { include: { group: true } } },
      orderBy: [{ competency: { group: { sortOrder: 'asc' } } }, { competency: { sortOrder: 'asc' } }],
    })
  }

  async setCell(actorUserId: string, targetUserId: string, competencyId: string, level: number) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } })
    if (!user) throw new NotFoundException('User not found')

    const comp = await this.prisma.competency.findFirst({
      where: { id: competencyId, isDeleted: false, group: { isDeleted: false } },
      select: { id: true },
    })
    if (!comp) throw new BadRequestException('Invalid competencyId')

    const existing = await this.prisma.userCompetencyLevel.findUnique({
      where: {userId_competencyId: { userId: targetUserId, competencyId } },
      select: { level: true },
    })
    const oldLevel = existing?.level ?? 0
    const newLevel = level

    if (oldLevel === newLevel) {
      return { userId: targetUserId, competencyId, level: newLevel, updateAt: new Date().toISOString() }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const rec = await tx.userCompetencyLevel.upsert({
        where: { userId_competencyId: { userId: targetUserId, competencyId } },
        create: { userId: targetUserId, competencyId, level: newLevel },
        update: { level: newLevel },
        select: { userId: true, competencyId: true, level: true, updatedAt: true },
      })

      await tx.competencyLevelChange.create({
        data: {
          actorUserId,
          targetUserId,
          competencyId,
          oldLevel,
          newLevel,
        }
      })

      return rec
    })

    return result
  }

  async setCells(
    actorUserId: string,
    cells: {userId: string, competencyId: string, level: number}[],
  ) {
    const userIds = [...new Set(cells.map((c) => c.userId))]
    const competencyIds = [...new Set(cells.map((c) => c.competencyId))]

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true }
    })
    if (users.length !== userIds.length) throw new BadRequestException('Invalid userId in cells')

    const comps = await this.prisma.competency.findMany({
      where: { id: { in: competencyIds }, isDeleted: false, group: { isDeleted: false } },
      select: { id: true },
    })
    if (comps.length !== competencyIds.length) throw new BadRequestException('Invalid competencyId in cells')

    const existing = await this.prisma.userCompetencyLevel.findMany({
      where: { userId: { in: userIds }, competencyId: { in: competencyIds } },
      select: { userId: true, competencyId: true, level: true },
    })
    const oldMap = new Map<string, number>()
    for (const e of existing) oldMap.set(`${e.userId}:${e.competencyId}`, e.level)

    const changes = cells
      .map((c) => {
        const oldLevel = oldMap.get(`${c.userId}:${c.competencyId}`) ?? 0
        const newLevel = c.level
        return { ...c, oldLevel, newLevel }
      })
      .filter((x) => x.oldLevel !== x.newLevel)

    await this.prisma.$transaction(async (tx) => {
      // upsert mind
      await Promise.all(
        cells.map((c) =>
          tx.userCompetencyLevel.upsert({
            where: { userId_competencyId: { userId: c.userId, competencyId: c.competencyId } },
            create: { userId: c.userId, competencyId: c.competencyId, level: c.level },
            update: { level: c.level },
          }),
        ),
      )

      if (changes.length) {
        await tx.competencyLevelChange.createMany({
          data: changes.map((x) => ({
            actorUserId,
            targetUserId: x.userId,
            competencyId: x.competencyId,
            oldLevel: x.oldLevel,
            newLevel: x.newLevel,
          })),
        })
      }
    })

    return { updated: cells.length, logged: changes.length }
  }

}
