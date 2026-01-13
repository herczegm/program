import { Body, Controller, Post, UseGuards, Get } from '@nestjs/common'
import { IsString } from 'class-validator'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { CurrentUser } from './current-user.decorator'
import type { CurrentUserPayload } from './current-user.decorator'

class LoginDto {
  @IsString()
  username!: string

  @IsString()
  password!: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.username, body.password)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: CurrentUserPayload) {
    return this.auth.me(user.userId)
  }
}
