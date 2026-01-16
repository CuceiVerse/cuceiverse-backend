import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

function redactSecrets(input: string): string {
  // Redacta posibles URIs tipo postgresql://user:pass@host/db
  return input.replace(/(postgres(?:ql)?:\/\/)([^@\s]+)@/gi, '$1***@');
}

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    const timestamp = new Date().toISOString();
    const isProd = process.env.NODE_ENV === 'production';

    try {
      // Ping directo al pool (no Prisma raw query)
      await this.prisma.ping();

      return {
        status: 'ok',
        service: 'cuceiverse-backend',
        db: 'connected',
        timestamp,
        release: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? undefined,
      };
    } catch (e: any) {
      const dbErrorCode =
        e?.code ??
        e?.errno ??
        e?.name ??
        'unknown';

      const dbErrorHint =
        e?.syscall ??
        e?.reason ??
        e?.routine ??
        e?.severity ??
        undefined;

      const rawMsg = String(e?.message ?? e);
      const safeMsg = redactSecrets(rawMsg).slice(0, 180);

      return {
        status: 'degraded',
        service: 'cuceiverse-backend',
        db: 'disconnected',
        timestamp,
        release: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? undefined,
        dbErrorCode,
        ...(dbErrorHint ? { dbErrorHint } : {}),
        // En prod damos un mensaje sanitizado y corto (no stack, no secrets)
        ...(isProd ? { dbErrorMessage: safeMsg } : { error: safeMsg }),
      };
    }
  }

  @Get()
  root() {
    return 'OK';
  }
}
