import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();

    await this.$executeRawUnsafe(`
      SELECT setval(
        pg_get_serial_sequence('"users"', 'id'),
        COALESCE((SELECT MAX(id) FROM "users"), 0) + 1,
        false
      );
    `);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
