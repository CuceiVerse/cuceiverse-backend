import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  const prismaMock = {
    ping: () => Promise.resolve(),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: prismaMock }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "OK"', () => {
      expect(appController.root()).toBe('OK');
    });
  });

  describe('health', () => {
    it('should return ok when db ping succeeds', async () => {
      await expect(appController.health()).resolves.toMatchObject({
        status: 'ok',
        service: 'cuceiverse-backend',
        db: 'connected',
      });
    });
  });
});
