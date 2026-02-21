import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // <=32 chars
  const siiauCode = `e2e_${Math.random().toString(36).slice(2, 10)}`;
  const password = '123456';

  beforeAll(async () => {
    // requerido por JwtStrategy / JwtModule
    process.env.JWT_SECRET ??= 'test-secret';
    process.env.JWT_EXPIRES_IN ??= '7d';
    process.env.BCRYPT_SALT_ROUNDS ??= '10';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // emula main.ts (al menos lo esencial)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { siiauCode: { startsWith: 'e2e_' } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it('POST /auth/register -> 201 + token + user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ siiauCode, password, displayName: 'E2E User' })
      .expect(201);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.siiauCode).toBe(siiauCode);
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('POST /auth/register duplicate -> 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ siiauCode, password, displayName: 'E2E User' })
      .expect(409);
  });

  it('POST /auth/login -> 200 + token + user', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ siiauCode, password })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.siiauCode).toBe(siiauCode);
  });

  it('POST /auth/login wrong password -> 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ siiauCode, password: 'wrongpass' })
      .expect(401);
  });

  it('GET /auth/me -> 200 with Bearer', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ siiauCode, password })
      .expect(200);

    const token = login.body.accessToken as string;

    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(me.body.siiauCode).toBe(siiauCode);
    expect(me.body).not.toHaveProperty('passwordHash');
  });

  it('GET /auth/me without token -> 401', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
