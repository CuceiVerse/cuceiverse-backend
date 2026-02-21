import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    // para que JwtModule/JwtStrategy no revienten si se inicializan
    process.env.JWT_SECRET ??= 'test-secret';
    process.env.JWT_EXPIRES_IN ??= '7d';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // cierra conexiones abiertas (evita "open handles")
    await prisma.$disconnect();
    await app.close();
  });

  it('/ (GET) -> OK', async () => {
    await request(app.getHttpServer()).get('/').expect(200).expect('OK');
  });

  it('/health (GET) -> 200', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });
});
