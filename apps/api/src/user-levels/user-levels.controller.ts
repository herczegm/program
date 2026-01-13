import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { SetLevelsDto } from './dto/set-levels.dto'
import { UserLevelsService } from './user-levels.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('users')
export class UserLevelsController {
  constructor(private readonly service: UserLevelsService) {}

  @Patch(':id/levels')
  setLevels(@Param('id') userId: string, @Body() dto: SetLevelsDto) {
    return this.service.setLevelsForUser(userId, dto.items)
  }
}
