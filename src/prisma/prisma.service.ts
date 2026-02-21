import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, type PoolConfig } from 'pg';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor() {
    const connectionString = requireEnv('DATABASE_URL');

    const ssl: PoolConfig['ssl'] | undefined =
      process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined;

    const pool = new Pool({ connectionString, ssl });
    const adapter = new PrismaPg(pool);

    super({ adapter });

    this.pool = pool;
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect().catch(() => undefined);
    await this.pool.end().catch(() => undefined);
  }

  async ping(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }
}
