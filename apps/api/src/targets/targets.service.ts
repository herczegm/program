import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TargetsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(targetUserId: string) {
    // user létezik?
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } })
    if (!user) throw new NotFoundException('User not found')

    return this.prisma.userCompetencyTarget.findMany({
      where: {
        userId: targetUserId,
        competency: { isDeleted: false, group: { isDeleted: false } },
      },
      include: {
        competency: { include: { group: true } },
      },
      orderBy: [{ updatedAt: 'desc' }],
    })
  }

  async upsertTarget(targetUserId: string, competencyId: string, targetLevel: number, deadline?: string) {
    // competency valid? (csak aktív)
    const comp = await this.prisma.competency.findFirst({
      where: { id: competencyId, isDeleted: false, group: { isDeleted: false } },
      select: { id: true },
    })
    if (!comp) throw new BadRequestException('Invalid competencyId')

    // user valid?
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } })
    if (!user) throw new NotFoundException('User not found')

    const deadlineDt = deadline ? new Date(deadline) : null
    if (deadline && Number.isNaN(deadlineDt!.getTime())) {
      throw new BadRequestException('deadline must be a valid date')
    }

    return this.prisma.userCompetencyTarget.upsert({
      where: { userId_competencyId: { userId: targetUserId, competencyId } },
      create: {
        userId: targetUserId,
        competencyId,
        targetLevel,
        deadline: deadlineDt,
      },
      update: {
        targetLevel,
        deadline: deadlineDt,
      },
      include: {
        competency: { include: { group: true } },
      },
    })
  }

  async deleteTarget(targetUserId: string, competencyId: string) {
    // ha nincs, legyen 404 (CRUD-érzet)
    const existing = await this.prisma.userCompetencyTarget.findUnique({
      where: { userId_competencyId: { userId: targetUserId, competencyId } },
      select: { userId: true, competencyId: true },
    })
    if (!existing) throw new NotFoundException('Target not found')

    await this.prisma.userCompetencyTarget.delete({
      where: { userId_competencyId: { userId: targetUserId, competencyId } },
    })

    return { ok: true }
  }
}
