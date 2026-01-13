import { Controller, ForbiddenException, Get, Param, Query, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { PrismaService } from '../prisma/prisma.service'
import type { Request } from 'express'

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('q') q?: string) {
    const query = q?.trim()

    return this.prisma.user.findMany({
      where: query
        ? {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { displayName: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      select: { id: true, username: true, displayName: true, email: true, role: true },
      orderBy: [{ username: 'asc' }],
      take: 200,
    })
  }

  @Get(':id/level-changes')
  async levelChanges(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('take') takeStr?: string,
  ) {
    const actorId = (req as any).user?.userId
    const role = (req as any).user?.role

    if (role !== 'ADMIN' && actorId !== id) {
      throw new ForbiddenException('Not allowed')
    }

    const take = Math.min(Math.max(parseInt(takeStr ?? '50', 10) || 50, 1), 200)

    return this.prisma.competencyLevelChange.findMany({
      where: { targetUserId: id },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        createdAt: true,
        oldLevel: true,
        newLevel: true,
        actor: { select: { id: true, username: true, displayName: true } },
        competency: {
          select: {
            id: true,
            name: true,
            type: true,
            group: { select: { id: true, name: true } },
          },
        },
      },
    })
  }
}
