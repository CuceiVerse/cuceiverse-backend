import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

type HealthOk = {
  status: 'ok';
  service: 'cuceiverse-backend';
  db: 'connected';
  timestamp: string;
  release?: string;
};

type HealthDegraded = {
  status: 'degraded';
  service: 'cuceiverse-backend';
  db: 'disconnected';
  timestamp: string;
  release?: string;
  dbErrorCode: string;
  dbErrorHint?: string;
  dbErrorMessage?: string;
  error?: string;
};

type HealthResponse = HealthOk | HealthDegraded;

function redactSecrets(input: string): string {
  // Redacta posibles URIs tipo postgresql://user:pass@host/db
  return input.replace(/(postgres(?:ql)?:\/\/)([^@\s]+)@/gi, '$1***@');
}

function toRecord(err: unknown): Record<string, unknown> | null {
  return typeof err === 'object' && err !== null
    ? (err as Record<string, unknown>)
    : null;
}

function pickString(
  rec: Record<string, unknown> | null,
  key: string,
): string | undefined {
  const v = rec?.[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

function safeMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;

  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health(): Promise<HealthResponse> {
    const timestamp = new Date().toISOString();
    const isProd = process.env.NODE_ENV === 'production';
    const release = process.env.RENDER_GIT_COMMIT?.slice(0, 7);

    try {
      await this.prisma.ping();

      return {
        status: 'ok',
        service: 'cuceiverse-backend',
        db: 'connected',
        timestamp,
        ...(release ? { release } : {}),
      };
    } catch (err: unknown) {
      const rec = toRecord(err);

      const dbErrorCode =
        pickString(rec, 'code') ??
        pickString(rec, 'errno') ??
        pickString(rec, 'name') ??
        'unknown';

      const dbErrorHint =
        pickString(rec, 'syscall') ??
        pickString(rec, 'reason') ??
        pickString(rec, 'routine') ??
        pickString(rec, 'severity');

      const rawMsg = safeMessage(err);
      const safeMsg = redactSecrets(rawMsg).slice(0, 180);

      return {
        status: 'degraded',
        service: 'cuceiverse-backend',
        db: 'disconnected',
        timestamp,
        ...(release ? { release } : {}),
        dbErrorCode,
        ...(dbErrorHint ? { dbErrorHint } : {}),
        ...(isProd ? { dbErrorMessage: safeMsg } : { error: safeMsg }),
      };
    }
  }

  @Get()
  root(): string {
    return 'OK';
  }
}
