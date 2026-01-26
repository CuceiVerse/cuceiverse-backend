import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

type UnknownRecord = Record<string, unknown>;

function redactSecrets(input: unknown): string {
  const s = typeof input === 'string' ? input : String(input);
  // Redacta posibles URIs tipo postgresql://user:pass@host/db
  return s.replace(/(postgres(?:ql)?:\/\/)([^@\s]+)@/gi, '$1***@');
}

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === 'object' && v !== null;
}

function getStringProp(r: UnknownRecord, key: string): string | undefined {
  const v = r[key];
  return typeof v === 'string' ? v : undefined;
}

function getNumberProp(r: UnknownRecord, key: string): number | undefined {
  const v = r[key];
  return typeof v === 'number' ? v : undefined;
}

function toSafeMessage(e: unknown): string {
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  return String(e);
}

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    const timestamp = new Date().toISOString();
    const isProd = process.env.NODE_ENV === 'production';

    try {
      await this.prisma.ping();

      return {
        status: 'ok',
        service: 'cuceiverse-backend',
        db: 'connected',
        timestamp,
        release: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? undefined,
      };
    } catch (e: unknown) {
      const r: UnknownRecord = isRecord(e) ? e : {};

      const codeStr = getStringProp(r, 'code');
      const errnoNum = getNumberProp(r, 'errno');
      const nameStr = getStringProp(r, 'name');

      const dbErrorCode: string =
        codeStr ??
        (errnoNum != null ? String(errnoNum) : undefined) ??
        nameStr ??
        'unknown';

      const dbErrorHint: string | undefined =
        getStringProp(r, 'syscall') ??
        getStringProp(r, 'reason') ??
        getStringProp(r, 'routine') ??
        getStringProp(r, 'severity');

      const rawMsg = toSafeMessage(e);
      const safeMsg = redactSecrets(rawMsg).slice(0, 180);

      return {
        status: 'degraded',
        service: 'cuceiverse-backend',
        db: 'disconnected',
        timestamp,
        release: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? undefined,
        dbErrorCode,
        ...(dbErrorHint ? { dbErrorHint } : {}),
        ...(isProd ? { dbErrorMessage: safeMsg } : { error: safeMsg }),
      };
    }
  }

  @Get()
  root() {
    return 'OK';
  }
}
