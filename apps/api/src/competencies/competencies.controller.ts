import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { CompetenciesService } from './competencies.service'
import { CreateCompetencyDto } from './dto/create-competency.dto'
import { UpdateCompetencyDto } from './dto/update-competency.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { ReorderCompetenciesDto } from './dto/reorder-competencies.dto'

@UseGuards(JwtAuthGuard)
@Controller('competencies')
export class CompetenciesController {
  constructor(private readonly service: CompetenciesService) {}

  // minden bejelentkezett usernek
  @Get()
  findAll() {
    return this.service.findAllActive()
  }

  // admin
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateCompetencyDto) {
    return this.service.create(dto)
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompetencyDto) {
    return this.service.update(id, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.softDelete(id)
  }

  @Get('by-group')
  byGroup(
    @Query('type') type?: 'CORE' | 'CUSTOM',
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const inc =
      includeDeleted === '1' || includeDeleted === 'true' || includeDeleted === 'yes'
    const t = type === 'CORE' || type === 'CUSTOM' ? type : undefined

    return this.service.byGroup({ type: t, includeDeleted: inc })
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/delete')
  softDelete(@Param('id') id: string) {
    return this.service.softDelete(id)
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch('reorder')
  reorder(@Body() dto: ReorderCompetenciesDto) {
    return this.service.reorder(dto.ids)
  }

}
