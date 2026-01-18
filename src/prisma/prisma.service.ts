import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      // Falla explícita y entendible (evita el error críptico de Prisma)
      throw new Error('DATABASE_URL is required to initialize PrismaClient');
    }

    // Supabase (pooler) típicamente requiere TLS; sin sslmode en la URL,
    // forzamos SSL cuando detectamos supabase.com o si DATABASE_SSL=true.
    const useSsl =
      process.env.DATABASE_SSL === 'true' || /supabase\.com/i.test(connectionString);

    const pool = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    });

    super({
      adapter: new PrismaPg(pool),
      // Si quieres logs, actívalos después; primero dejemos que arranque estable.
      // log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
    });

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pool.end();
  }

  /**
   * Health ping: query mínima para validar conectividad.
   * No depende de modelos; solo requiere conexión viva.
   */
  async ping(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }
}
