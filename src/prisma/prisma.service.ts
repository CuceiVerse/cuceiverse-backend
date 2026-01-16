import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Health ping: query mínima para validar conectividad.
   * No depende de modelos; solo requiere conexión viva.
   */
  async ping(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }
}
