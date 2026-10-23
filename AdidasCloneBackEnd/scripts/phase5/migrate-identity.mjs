import {readFileSync} from 'node:fs';
import pg from 'pg';

if (process.env.V2_IDENTITY_DB_NAME !== 'identity_db' ||
    !process.env.V2_IDENTITY_DB_HOST || !process.env.V2_IDENTITY_DB_PASSWORD) {
  throw new Error('Identity migration only permits isolated V2 identity_db');
}
const pool = new pg.Pool({
  host: process.env.V2_IDENTITY_DB_HOST,
  port: Number(process.env.V2_IDENTITY_DB_PORT || 5432),
  user: process.env.V2_IDENTITY_DB_USER || 'v2_local',
  password: process.env.V2_IDENTITY_DB_PASSWORD,
  database: 'identity_db',
  connectionTimeoutMillis: 3000,
  application_name: 'adidas-v2-identity-migration'
});
try {
  await pool.query(readFileSync('apps/identity-service/migrations/001_identity.sql', 'utf8'));
  console.log('PASS Identity migration');
} catch (error) {
  console.error('Identity migration failed: ' + (error?.code || 'migration error'));
  process.exitCode = 1;
} finally {
  await pool.end();
}
