// import { Injectable } from '@nestjs/common'
// import { JwtService } from '@nestjs/jwt'
// import { LdapService } from '../ldap/ldap.service'
// import { UsersService } from '../users/users.service'

// @Injectable()
// export class AuthService {
//   constructor(
//     private readonly ldap: LdapService,
//     private readonly users: UsersService,
//     private readonly jwt: JwtService,
//   ) {}

//   async login(username: string, password: string) {
//     const ad = await this.ldap.authenticate(username, password)
//     const user = await this.users.upsertFromAd(ad)

//     const access_token = await this.jwt.signAsync({
//       sub: user.id,
//       role: user.role,
//     })

//     return { access_token }
//   }
// }

import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import { Role } from '@prisma/client'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  private normalizeUsername(input: string) {
    // DOMAIN\user -> user
    const idx = input.indexOf('\\')
    const u = idx >= 0 ? input.slice(idx + 1) : input
    return u.trim().toLowerCase()
  }

  private isDevAdmin(username: string) {
    const list = (this.cfg.get<string>('DEV_ADMIN_USERS', '') || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    return list.includes(username)
  }

  async login(usernameRaw: string, password: string) {
    const mode = this.cfg.get<string>('AUTH_MODE', 'dev')

    if (mode !== 'dev') {
      throw new UnauthorizedException('AUTH_MODE is not dev (LDAP not configured yet).')
    }

    const username = this.normalizeUsername(usernameRaw)

    const devPassword = this.cfg.get<string>('DEV_PASSWORD')
    if (devPassword && password !== devPassword) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // adGuid nálad kötelező és unique — dev-ben generálunk stabilat
    const adGuid = `dev:${username}`

    const role = this.isDevAdmin(username) ? Role.ADMIN : Role.USER

    const user = await this.prisma.user.upsert({
      where: { adGuid },
      create: {
        adGuid,
        username,
        role,
        displayName: usernameRaw.trim(),
      },
      update: {
        username,
        role,
        displayName: usernameRaw.trim(),
      },
    })

    const access_token = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
    })

    return { access_token }
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, displayName: true, role: true },
    })
  }
}
