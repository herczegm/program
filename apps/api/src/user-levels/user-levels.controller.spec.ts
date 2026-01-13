import { Test, TestingModule } from '@nestjs/testing';
import { UserLevelsController } from './user-levels.controller';

describe('UserLevelsController', () => {
  let controller: UserLevelsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserLevelsController],
    }).compile();

    controller = module.get<UserLevelsController>(UserLevelsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
