import { Module } from '@nestjs/common';
import { MatrixService } from './matrix.service';
import { MatrixController } from './matrix.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserLevelsService } from 'src/user-levels/user-levels.service';
import { UserLevelsModule } from 'src/user-levels/user-levels.module';

@Module({
  imports: [PrismaModule, UserLevelsModule],
  providers: [MatrixService, UserLevelsService],
  controllers: [MatrixController]
})
export class MatrixModule {}
