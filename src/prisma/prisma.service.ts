import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private pool: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set');
    }

    // Supabase + node-postgres: fuerza SSL en prod (evita fallos de cadena/verify).
 const ssl =
  process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : undefined;

const pool = new Pool({
  connectionString,
  ssl,
  max: Number(process.env.DB_POOL_MAX ?? 5),
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});


    super({
      adapter: new PrismaPg(pool),
    });

    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
  async ping(): Promise<void> {
    await this.pool.query('SELECT 1');
  }
}
