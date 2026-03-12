import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

function randStudentCode(): string {
  const n = Date.now() % 1_000_000_000;
  return String(n).padStart(9, '0');
}

type AuthTokenBody = {
  accessToken?: string;
  access_token?: string;
  token?: string;
  jwt?: string;
  data?: {
    accessToken?: string;
    access_token?: string;
  };
};

function pickToken(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;

  const tokenBody = body as AuthTokenBody;
  return (
    tokenBody.accessToken ??
    tokenBody.access_token ??
    tokenBody.token ??
    tokenBody.jwt ??
    tokenBody.data?.accessToken ??
    tokenBody.data?.access_token
  );
}

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.SIIAU_MODE = 'fixture';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('register -> login -> me', async () => {
    const siiauCode = randStudentCode();
    const password = 'TestPassw0rd!';

    // REGISTER
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ siiauCode, password })
      .expect((res) => {
        if (![200, 201].includes(res.status)) {
          throw new Error(
            `Expected 200/201, got ${res.status}: ${JSON.stringify(res.body)}`,
          );
        }
      });

    // LOGIN
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ siiauCode, password })
      .expect(200);

    const token = pickToken(login.body);
    expect(typeof token).toBe('string');

    // ME
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(me.body).toBeTruthy();
    // si tu /me expone siiauCode, lo validamos
    const meBody = me.body as { siiauCode?: string };
    if (meBody.siiauCode) {
      expect(meBody.siiauCode).toBe(siiauCode);
    }
  });

  it('me without token -> 401', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
