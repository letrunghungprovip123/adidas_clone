import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';

@Injectable()
export class InventoryDatabase implements OnModuleDestroy {
  readonly pool: Pool;
  constructor() {
    const host = process.env.V2_INVENTORY_DB_HOST;
    const password = process.env.V2_INVENTORY_DB_PASSWORD;
    if (!host || !password) throw new Error('V2_INVENTORY_DB_HOST and V2_INVENTORY_DB_PASSWORD are required');
    this.pool = new Pool({
      host, port: Number(process.env.V2_INVENTORY_DB_PORT || '5432'),
      user: process.env.V2_INVENTORY_DB_USER || 'v2_local',
      password, database: process.env.V2_INVENTORY_DB_NAME || 'inventory_db',
      max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 3000,
      query_timeout: 6000, statement_timeout: 5500,
      application_name: 'adidas-v2-inventory'
    });
    this.pool.on('error', err => console.error('inventory.pool.error', err.message));
  }
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch { /* original error takes precedence */ }
      throw error;
    } finally { client.release(); }
  }
  async query<T extends QueryResultRow>(sql: string, values?: unknown[]) {
    return this.pool.query<T>(sql, values);
  }
  async ready(): Promise<boolean> {
    const r = await this.pool.query<{ok: number}>('SELECT 1 AS ok FROM inventory_stock LIMIT 1');
    return r.rowCount !== null;
  }
  async onModuleDestroy() { await this.pool.end(); }
}
