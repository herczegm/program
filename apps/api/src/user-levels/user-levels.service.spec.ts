import { Test, TestingModule } from '@nestjs/testing';
import { UserLevelsService } from './user-levels.service';

describe('UserLevelsService', () => {
  let service: UserLevelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserLevelsService],
    }).compile();

    service = module.get<UserLevelsService>(UserLevelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
