import { Module } from '@nestjs/common'
import { CompetenciesService } from './competencies.service'
import { CompetenciesController } from './competencies.controller'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [CompetenciesController],
  providers: [CompetenciesService],
})
export class CompetenciesModule {}
