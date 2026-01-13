import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CompetencyGroupsController } from './competency-group.controller';
import { CompetencyGroupsService } from './competency-group.service'

@Module({
  imports: [PrismaModule],
  controllers: [CompetencyGroupsController],
  providers: [CompetencyGroupsService],
})
export class CompetencyGroupModule {}
