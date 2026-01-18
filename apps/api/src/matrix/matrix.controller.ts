import { Body, Controller, Get, Patch, UseGuards, Query, Req } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { MatrixService } from './matrix.service'
import { UserLevelsService } from 'src/user-levels/user-levels.service'
import { SetCellLevelDto } from 'src/user-levels/dto/set-cell-level.dto'
import { SetCellsDto } from 'src/user-levels/dto/set-cells.dto'

function splitCsv(v?: string): string[] | undefined {
  const s = v?.trim()
  if (!s) return undefined
  return s.split(',').map((x) => x.trim()).filter(Boolean)
}

@UseGuards(JwtAuthGuard)
@Controller('matrix')
export class MatrixController {
  constructor(
    private readonly service: MatrixService,
    private readonly userLevels: UserLevelsService,
  ) {}

  @Get('fast')
  fast(
    @Query('userIds') userIds?: string,
    @Query('groupIds') groupIds?: string,
    @Query('type') type?: 'CORE' | 'CUSTOM',
    @Query('includeAdmins') includeAdmins?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const ia = includeAdmins === undefined ? undefined : includeAdmins === '1' || includeAdmins === 'true'
    const incDel = includeDeleted === '1' || includeDeleted === 'true' || includeDeleted === 'yes'
    return this.service.getFastMatrix({
      userIds: splitCsv(userIds),
      groupIds: splitCsv(groupIds),
      type: type === 'CORE' || type === 'CUSTOM' ? type : undefined,
      includeAdmins: ia,
      includeDeleted: incDel,
    })
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch('cell')
  setCell(@Req() req: Request, @Body() dto: SetCellLevelDto) {
    const actorUserId = (req as any).user.userId
    return this.userLevels.setCell(actorUserId, dto.userId, dto.competencyId, dto.level)
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch('cells')
  setCells(@Req() req: Request, @Body() dto: SetCellsDto) {
    const actorUserId = (req as any).user.userId
    return this.userLevels.setCells(actorUserId, dto.cells)
  }
}
