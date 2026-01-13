import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { CreateCompetencyGroupDto } from './dto/create-competency-group.dto'
import { UpdateCompetencyGroupDto } from './dto/update-competency-group.dto'
import { ReorderCompetencyGroupsDto } from './dto/reorder-competency-groups.dto'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { RolesGuard } from '../auth/roles.guard'
import { Roles } from '../auth/roles.decorator'
import { CompetencyGroupsService } from './competency-group.service'

@UseGuards(JwtAuthGuard)
@Controller('competency-groups')
export class CompetencyGroupsController {
  constructor(private readonly service: CompetencyGroupsService) {}

  // Minden bejelentkezett usernek
  @Get()
  findAll() {
    return this.service.findAllActive()
  }

  // Admin
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateCompetencyGroupDto) {
    return this.service.create(dto)
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch('reorder')
  reorder(@Body() dto: ReorderCompetencyGroupsDto) {
    return this.service.reorder(dto.ids)
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCompetencyGroupDto) {
    return this.service.update(id, dto)
  }

  // @UseGuards(RolesGuard)
  // @Roles('ADMIN')
  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.service.softDelete(id)
  // }

  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/delete')
  softDelete(@Param('id') id: string) {
    return this.service.softDelete(id)
  }

  @Get('tree')
  tree(
    @Query('type') type?: 'CORE' | 'CUSTOM',
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const inc = 
      includeDeleted === '1' || includeDeleted === 'true' || includeDeleted === 'yes'
    const t = type === 'CORE' || type === 'CUSTOM' ? type : undefined

    return this.service.getTree({ type: t, includeDeleted: inc })
  }

}
