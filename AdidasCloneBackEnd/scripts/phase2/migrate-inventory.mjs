import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
const pool=new pg.Pool({
  host:process.env.V2_INVENTORY_DB_HOST,
  port:Number(process.env.V2_INVENTORY_DB_PORT||5432),
  user:process.env.V2_INVENTORY_DB_USER||'v2_local',
  password:process.env.V2_INVENTORY_DB_PASSWORD,
  database:process.env.V2_INVENTORY_DB_NAME||'inventory_db',
  connectionTimeoutMillis:3000, max:1
});
try {
  if(!process.env.V2_INVENTORY_DB_HOST || !process.env.V2_INVENTORY_DB_PASSWORD)
    throw new Error('Missing isolated V2 Inventory database connection settings');
  const sql=readFileSync(resolve('apps/inventory-service/migrations/001_inventory.sql'),'utf8');
  await pool.query(sql);
  console.log('PASS Inventory SQL migration 001');
} catch(error) {
  console.error(error instanceof Error?error.message:'Migration failure');
  process.exitCode=1;
} finally {await pool.end();}
