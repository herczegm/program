import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Client } from 'ldapts'
import type { AdProfile } from '../users/users.service'

@Injectable()
export class LdapService {
  constructor(private readonly config: ConfigService) {}

  private normalizeUsername(input: string) {
    const idx = input.indexOf('\\') // DOMAIN\user
    return idx >= 0 ? input.slice(idx + 1) : input
  }

  private bufferToGuid(buf: Buffer): string {
    const hex = buf.toString('hex')
    const swap = (s: string) => s.match(/../g)!.reverse().join('')
    const p1 = swap(hex.slice(0, 8))
    const p2 = swap(hex.slice(8, 12))
    const p3 = swap(hex.slice(12, 16))
    const p4 = hex.slice(16, 20)
    const p5 = hex.slice(20)
    return `${p1}-${p2}-${p3}-${p4}-${p5}`.toLowerCase()
  }

  async authenticate(usernameRaw: string, password: string): Promise<AdProfile> {
    const username = this.normalizeUsername(usernameRaw)

    const url = this.config.get<string>('LDAP_URL')!
    const baseDn = this.config.get<string>('LDAP_BASE_DN')!
    const bindDn = this.config.get<string>('LDAP_BIND_DN')!
    const bindPw = this.config.get<string>('LDAP_BIND_PASSWORD')!
    const filterTemplate =
      this.config.get<string>('LDAP_USER_FILTER') ?? '(sAMAccountName={{username}})'

    const filter = filterTemplate.replaceAll('{{username}}', username)

    // service bind
    const svc = new Client({ url })
    await svc.bind(bindDn, bindPw)

    const res = await svc.search(baseDn, {
      scope: 'sub',
      filter,
      sizeLimit: 2,
      attributes: ['dn', 'sAMAccountName', 'userPrincipalName', 'displayName', 'mail', 'objectGUID', 'memberOf'],
    })

    await svc.unbind()

    const entry: any = res.searchEntries?.[0]
    if (!entry?.dn) throw new UnauthorizedException('Invalid credentials')

    // user bind (password check)
    const u = new Client({ url })
    try {
      await u.bind(entry.dn, password)
    } catch {
      throw new UnauthorizedException('Invalid credentials')
    } finally {
      await u.unbind()
    }

    const guidRaw = entry.objectGUID
    const adGuid =
      Buffer.isBuffer(guidRaw) ? this.bufferToGuid(guidRaw) : String(guidRaw ?? '')

    const memberOf: string[] = Array.isArray(entry.memberOf)
      ? entry.memberOf
      : entry.memberOf
        ? [String(entry.memberOf)]
        : []

    return {
      adGuid,
      username: String(entry.sAMAccountName ?? entry.userPrincipalName ?? username),
      displayName: entry.displayName ? String(entry.displayName) : '',
      email: entry.mail ? String(entry.mail) : '',
      memberOf,
    }
  }
}
