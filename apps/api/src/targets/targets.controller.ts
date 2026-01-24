import { BadRequestException, Body, Controller, Delete, Get, Put, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { TargetsService } from './targets.service'
import { SetTargetDto } from './dto/set-target.dto'
import { SetSelfTargetDto } from './dto/set-self-target.dto'

@UseGuards(JwtAuthGuard)
@Controller('targets')
export class TargetsController {
  constructor(private readonly service: TargetsService) {}

  // list: ADMIN bárkit, USER csak magát (ha userId nincs, akkor self)
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'USER')
  @Get()
  list(@Req() req: Request, @Query('userId') userId?: string) {
    const actorUserId = (req as any).user.userId
    const actorRole = (req as any).user.role

    const targetUserId = (userId?.trim() || actorUserId)

    if (actorRole !== 'ADMIN' && targetUserId !== actorUserId) {
      throw new ForbiddenException('USER can only access own targets')
    }

    return this.service.listForUser(targetUserId)
  }

  // UPSERT cell: admin bárki, user csak self
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'USER')
  @Put('cell')
  upsert(@Req() req: Request, @Body() dto: SetTargetDto) {
    const actorUserId = (req as any).user.userId
    const actorRole = (req as any).user.role

    if (actorRole !== 'ADMIN' && dto.userId !== actorUserId) {
      throw new ForbiddenException('USER can only edit own targets')
    }

    return this.service.upsertTarget(dto.userId, dto.competencyId, dto.targetLevel, dto.deadline)
  }

  // UPSERT self (kényelmi)
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'USER')
  @Put('self/cell')
  upsertSelf(@Req() req: Request, @Body() dto: SetSelfTargetDto) {
    const actorUserId = (req as any).user.userId
    return this.service.upsertTarget(actorUserId, dto.competencyId, dto.targetLevel, dto.deadline)
  }

  // DELETE cell: admin bárki, user csak self
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'USER')
  @Delete('cell')
  remove(@Req() req: Request, @Query('userId') userId?: string, @Query('competencyId') competencyId?: string) {
    const actorUserId = (req as any).user.userId
    const actorRole = (req as any).user.role

    const targetUserId = userId?.trim()
    const compId = competencyId?.trim()

    if (!targetUserId || !compId) throw new BadRequestException('userId and competencyId are required')

    if (actorRole !== 'ADMIN' && targetUserId !== actorUserId) {
      throw new ForbiddenException('USER can only delete own targets')
    }

    return this.service.deleteTarget(targetUserId, compId)
  }

  // DELETE self
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'USER')
  @Delete('self/cell')
  removeSelf(@Req() req: Request, @Query('competencyId') competencyId?: string) {
    const actorUserId = (req as any).user.userId
    const compId = competencyId?.trim()
    if (!compId) throw new BadRequestException('competencyId is required')
    return this.service.deleteTarget(actorUserId, compId)
  }
}
