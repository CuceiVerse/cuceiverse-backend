import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    // Cast defensivo: ESLint/TS está tipando Prisma como `error` y marca unsafe-call.
    const connect = this.$connect as unknown as () => Promise<void>;
    await connect();
    this.logger.log('Prisma connected');
  }

  async onModuleDestroy(): Promise<void> {
    const disconnect = this.$disconnect as unknown as () => Promise<void>;
    await disconnect();
  }

  async ping(): Promise<void> {
    // Evitamos el template tag ($queryRaw`...`) porque también cae en no-unsafe-call
    const queryRawUnsafe = this.$queryRawUnsafe as unknown as (
      query: string,
      ...values: unknown[]
    ) => Promise<unknown>;

    await queryRawUnsafe('SELECT 1');
  }
}
