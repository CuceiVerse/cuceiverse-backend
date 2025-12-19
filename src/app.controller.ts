import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    const timestamp = new Date().toISOString();

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'cuceiverse-backend',
        db: 'connected',
        timestamp,
      };
    } catch (e: any) {
      const isProd = process.env.NODE_ENV === 'production';
      return {
        status: 'degraded',
        service: 'cuceiverse-backend',
        db: 'disconnected',
        timestamp,
        ...(isProd ? {} : { error: String(e?.message ?? e) }),
      };
    }
  }

  @Get()
  root() {
    return 'OK';
  }
}
