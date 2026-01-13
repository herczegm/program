import { Module } from '@nestjs/common';
import { UserLevelsService } from './user-levels.service';
import { UserLevelsController } from './user-levels.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UserLevelsService],
  controllers: [UserLevelsController],
  exports: [UserLevelsService],
})
export class UserLevelsModule {}
