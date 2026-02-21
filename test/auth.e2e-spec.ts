import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

type AuthUser = {
  id: string;
  siiauCode: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Parameters<typeof request>[0];

  const siiauCode = `e2e_${Math.random().toString(36).slice(2, 10)}`;
  const password = '123456';

  beforeAll(async () => {
    process.env.JWT_SECRET ??= 'test-secret';
    process.env.JWT_EXPIRES_IN ??= '7d';
    process.env.BCRYPT_SALT_ROUNDS ??= '10';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);
    server = app.getHttpServer() as unknown as Parameters<typeof request>[0];
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { siiauCode: { startsWith: 'e2e_' } },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it('POST /auth/register -> 201 + token + user', async () => {
    const res = await request(server)
      .post('/auth/register')
      .send({ siiauCode, password, displayName: 'E2E User' })
      .expect(201);

    const body = res.body as unknown as AuthResponse;

    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('user');
    expect(body.user.siiauCode).toBe(siiauCode);
    expect(body.user).not.toHaveProperty('passwordHash');
  });

  it('POST /auth/register duplicate -> 409', async () => {
    await request(server)
      .post('/auth/register')
      .send({ siiauCode, password, displayName: 'E2E User' })
      .expect(409);
  });

  it('POST /auth/login -> 200 + token + user', async () => {
    const res = await request(server)
      .post('/auth/login')
      .send({ siiauCode, password })
      .expect(200);

    const body = res.body as unknown as AuthResponse;

    expect(body).toHaveProperty('accessToken');
    expect(body.user.siiauCode).toBe(siiauCode);
  });

  it('POST /auth/login wrong password -> 401', async () => {
    await request(server)
      .post('/auth/login')
      .send({ siiauCode, password: 'wrongpass' })
      .expect(401);
  });

  it('GET /auth/me -> 200 with Bearer', async () => {
    const login = await request(server)
      .post('/auth/login')
      .send({ siiauCode, password })
      .expect(200);

    const loginBody = login.body as unknown as AuthResponse;
    const token = loginBody.accessToken;

    const me = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const user = me.body as unknown as AuthUser;

    expect(user.siiauCode).toBe(siiauCode);
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('GET /auth/me without token -> 401', async () => {
    await request(server).get('/auth/me').expect(401);
  });
});
