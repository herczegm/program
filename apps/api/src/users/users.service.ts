import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from '@prisma/client';

export type AdProfile = {
    adGuid: string;
    username: string;
    displayName: string;
    email: string;
    memberOf: string[];
}

@Injectable()
export class UsersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {}

    async upsertFromAd(profile: AdProfile) {
        const adminGroupDn = this.configService.get<string>('LDAP_ADMIN_GROUP_DN', '');
        const isAdmin = 
            !!adminGroupDn &&
            (profile.memberOf ?? []).some((dn) => dn.toLowerCase() === adminGroupDn.toLowerCase())
        
        return this.prisma.user.upsert({
            where: { adGuid: profile.adGuid },
            create: {
                adGuid: profile.adGuid,
                username: profile.username,
                displayName: profile.displayName,
                email: profile.email,
                role: isAdmin ? Role.ADMIN : Role.USER,
            },
            update: {
                username: profile.username,
                displayName: profile.displayName,
                email: profile.email,
                role: isAdmin ? Role.ADMIN : Role.USER,
            },
        })
    }
}
