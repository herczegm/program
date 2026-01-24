import { BadRequestException, Controller, Get, Query, Req, UseGuards, ForbiddenException } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { GrowthService } from './growth.service'

function splitCsv(v?: string): string[] | undefined {
  const s = v?.trim()
  if (!s) return undefined
  return s.split(',').map((x) => x.trim()).filter(Boolean)
}

function parseIsoDate(v?: string): Date | undefined {
  const s = v?.trim()
  if (!s) return undefined
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return undefined
  return d
}

@UseGuards(JwtAuthGuard)
@Controller('growth')
export class GrowthController {
  constructor(private readonly service: GrowthService) {}

  /**
   * GET /growth?days=90&userIds=...&competencyIds=...
   * GET /growth?from=2026-01-01T00:00:00.000Z&to=2026-01-24T00:00:00.000Z&userIds=...&competencyIds=...
   *
   * USER: ha nem ADMIN, csak self userId-t kérhet (vagy ha userIds nincs, automatikusan self)
   */
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'USER')
  @Get()
  async getGrowth(
    @Req() req: Request,
    @Query('days') daysRaw?: string,
    @Query('from') fromRaw?: string,
    @Query('to') toRaw?: string,
    @Query('userIds') userIdsRaw?: string,
    @Query('competencyIds') competencyIdsRaw?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const actorUserId = (req as any).user.userId
    const actorRole = (req as any).user.role

    const includeDel = includeDeleted === '1' || includeDeleted === 'true' || includeDeleted === 'yes'

    const requestedUserIds = splitCsv(userIdsRaw)
    const requestedCompIds = splitCsv(competencyIdsRaw)
    if (!requestedCompIds?.length) {
      throw new BadRequestException('competencyIds is required')
    }

    // USER policy: csak self
    const userIds =
      requestedUserIds?.length ? requestedUserIds : [actorUserId]

    if (actorRole !== 'ADMIN' && userIds.some((id) => id !== actorUserId)) {
      throw new ForbiddenException('USER can only query own growth')
    }

    // időablak
    const now = new Date()
    const days = daysRaw === undefined ? undefined : Number(daysRaw)

    let from: Date
    let to: Date

    if (days !== undefined && (fromRaw || toRaw)) {
      throw new BadRequestException('Use either days OR from/to, not both')
    }

    if (days !== undefined) {
      if (!Number.isFinite(days) || !Number.isInteger(days) || days <= 0 || days > 3660) {
        throw new BadRequestException('days must be a positive integer (max 3660)')
      }
      to = now
      from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
    } else {
      const f = parseIsoDate(fromRaw)
      const t = parseIsoDate(toRaw)
      if (!f || !t) throw new BadRequestException('from and to must be valid ISO dates')
      if (t <= f) throw new BadRequestException('to must be after from')
      from = f
      to = t
    }

    // stabil teljesítmény: limitáljuk a kért méretet (különben U*C túl nagy)
    if (userIds.length > 300) throw new BadRequestException('Too many userIds (max 300)')
    if (requestedCompIds.length > 800) throw new BadRequestException('Too many competencyIds (max 800)')

    return this.service.getGrowth({
      userIds,
      competencyIds: requestedCompIds,
      from,
      to,
      includeDeleted: includeDel,
    })
  }
}
