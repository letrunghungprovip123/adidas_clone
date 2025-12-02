import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Connected to database');
    await this.resetAllSequences(); // 👈 Tự động reset khi app start
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * 🔁 Tự động reset sequence cho tất cả các bảng có autoincrement ID
   */
  async resetAllSequences() {
    const sequences = [
      'products_id_seq',
      'categories_id_seq',
      'discount_codes_id_seq',
      'orders_id_seq',
      'order_items_id_seq',
      'users_id_seq',
    ];

    for (const seq of sequences) {
      try {
        await this.$executeRawUnsafe(`
          SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM ${seq.replace('_id_seq', '')}), 0) + 1);
        `);
        this.logger.log(`✅ Sequence ${seq} has been reset`);
      } catch (err) {
        this.logger.warn(`⚠️ Could not reset sequence ${seq}: ${err.message}`);
      }
    }
  }

  /**
   * ⚙️ Reset riêng lẻ 1 bảng (nếu cần)
   */
  async resetSequenceFor(table: string) {
    const seq = `${table}_id_seq`;
    try {
      await this.$executeRawUnsafe(`
        SELECT setval('${seq}', COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1);
      `);
      this.logger.log(`✅ Reset sequence for table: ${table}`);
    } catch (err) {
      this.logger.error(
        `❌ Failed to reset sequence for ${table}: ${err.message}`,
      );
    }
  }
}
