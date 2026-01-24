import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module';
import { LdapModule } from './ldap/ldap.module';
import { AuthModule } from './auth/auth.module';
import { CompetencyGroupModule } from './competency-group/competency-group.module';
import { CompetenciesModule } from './competencies/competencies.module';
import { UserLevelsModule } from './user-levels/user-levels.module';
import { MatrixModule } from './matrix/matrix.module';
import { TargetsModule } from './targets/targets.module';
import { GrowthModule } from './growth/growth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    // LdapModule,
    AuthModule,
    CompetencyGroupModule,
    CompetenciesModule,
    UserLevelsModule,
    MatrixModule,
    TargetsModule,
    GrowthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
