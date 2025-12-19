import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    const timestamp = new Date().toISOString();

    try {
await this.prisma.ping();
      return {
        status: 'ok',
        service: 'cuceiverse-backend',
        db: 'connected',
        timestamp,
      };
    } catch (e: any) {
  const isProd = process.env.NODE_ENV === 'production';

  const dbErrorCode =
    e?.code ??
    e?.errno ??
    e?.name ??
    (typeof e === 'object' ? 'unknown_error_object' : 'unknown_error');

  const dbErrorHint =
    e?.reason ||
    e?.syscall ||
    e?.severity ||
    e?.routine ||
    undefined;

  return {
    status: 'degraded',
    service: 'cuceiverse-backend',
    db: 'disconnected',
    timestamp,
    ...(isProd
      ? { dbErrorCode, ...(dbErrorHint ? { dbErrorHint } : {}) }
      : { error: String(e?.message ?? e), dbErrorCode, ...(dbErrorHint ? { dbErrorHint } : {}) }),
  };
}}

  @Get()
  root() {
    return 'OK';
  }
}
