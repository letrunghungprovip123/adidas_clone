import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import pg from 'pg';

// Reads only the checked-in demo seed; this script never connects to a V1 runtime.
const source = readFileSync(resolve('../init-postgres/nike_shop.sql'), 'utf8');
const marker = 'INSERT INTO "public"."users"';
const begin = source.indexOf(marker);
if (begin < 0) throw new Error('Checked-in user seed is missing');
const valuesStart = source.indexOf('VALUES', begin);
const valuesEnd = source.indexOf(';', valuesStart);
if (valuesStart < 0 || valuesEnd < 0) throw new Error('Checked-in user seed is malformed');

function parseTuple(line) {
  const raw = line.trim().replace(/[,;]$/, '');
  if (!raw.startsWith('(') || !raw.endsWith(')')) throw new Error('Bad seed tuple');
  const result = [];
  let value = '';
  let quoted = false;
  for (let i = 1; i < raw.length - 1; i++) {
    const ch = raw[i];
    if (ch === "'") {
      if (quoted && raw[i + 1] === "'") { value += "'"; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      result.push(value.trim()); value = '';
    } else value += ch;
  }
  if (quoted) throw new Error('Unclosed seed literal');
  result.push(value.trim());
  return result.map(v => v === 'NULL' ? null : v);
}

const valuesText = source.slice(valuesStart + 'VALUES'.length, valuesEnd);
const tuples = valuesText.split('\n').map(line => line.trim()).filter(line => line.startsWith('('));
const users = tuples.map(parseTuple);
if (users.length !== 19) throw new Error('Expected 19 checked-in legacy demo accounts');
const ids = new Set();
const emails = new Set();
const accounts = users.map(row => {
  if (row.length < 14) throw new Error('Legacy user tuple shape changed');
  const id = Number(row[0]);
  const email = String(row[1] || '').trim().toLowerCase();
  if (!Number.isSafeInteger(id) || id < 1 || !email || ids.has(id) || emails.has(email)) {
    throw new Error('Duplicate or invalid seed identity');
  }
  ids.add(id); emails.add(email);
  // Source password_hash values are demo placeholders. Never import them as credentials.
  return {
    id, email,
    roles: row[8] === 't' ? ['ADMIN'] : ['CUSTOMER'],
    verifiedAt: row[7] === 't' ? row[9] : null,
    createdAt: row[9]
  };
});

if (process.argv.includes('--check')) {
  console.log('PASS Identity seed shape: 19 demo accounts; passwords and OTPs excluded; no PII emitted');
  process.exit(0);
}

if (process.argv.includes('--sql')) {
  // Emit an idempotent SQL script for psql inside the private V2 PostgreSQL container.
  // Existing accounts with the same ID/email are preserved; ID/email conflicts fail closed.
  const lit = value => "'" + String(value).replaceAll("'", "''") + "'";
  const values = accounts.map(account =>
    '(' + account.id + ', ' + lit(account.email) + ', ARRAY[' +
    account.roles.map(lit).join(',') + ']::TEXT[], ' +
    (account.verifiedAt === null ? 'NULL::timestamptz' : lit(account.verifiedAt) + '::timestamptz') +
    ', ' + lit(account.createdAt) + '::timestamptz)'
  ).join(',\n');
  const sql = [
    'BEGIN;',
    'DO $identity_seed$',
    'DECLARE seed_row RECORD;',
    'BEGIN',
    '  FOR seed_row IN',
    '    SELECT * FROM (VALUES',
    values,
    '    ) AS legacy_seed(id,email,roles,email_verified_at,created_at)',
    '  LOOP',
    '    IF EXISTS (SELECT 1 FROM identity_accounts WHERE id=seed_row.id) THEN',
    '      IF NOT EXISTS (SELECT 1 FROM identity_accounts WHERE id=seed_row.id AND email=seed_row.email) THEN',
    "        RAISE EXCEPTION 'Identity seed ID/email conflict';",
    '      END IF;',
    '    ELSE',
    '      INSERT INTO identity_accounts(id,email,password_hash,roles,status,email_verified_at,',
    '        password_reset_required,token_version,provisioning_state,created_at,updated_at)',
    "      VALUES(seed_row.id,seed_row.email,NULL,seed_row.roles,'ACTIVE',seed_row.email_verified_at,",
    "        true,1,'PENDING',seed_row.created_at,clock_timestamp()) ON CONFLICT(id) DO NOTHING;",
    '      IF NOT EXISTS (SELECT 1 FROM identity_accounts WHERE id=seed_row.id AND email=seed_row.email',
    '        AND password_hash IS NULL AND password_reset_required IS TRUE) THEN',
    "        RAISE EXCEPTION 'Identity seed safe-password reconciliation failed';",
    '      END IF;',
    '    END IF;',
    '  END LOOP;',
    "  PERFORM setval(pg_get_serial_sequence('identity_accounts','id')::regclass,",
    '    GREATEST((SELECT COALESCE(MAX(id),1) FROM identity_accounts),1), true);',
    'END',
    '$identity_seed$;',
    'COMMIT;'
  ].join('\n');
  process.stdout.write(sql + '\n');
  process.exit(0);
}

if (process.env.V2_IDENTITY_DB_NAME !== 'identity_db' ||
    !process.env.V2_IDENTITY_DB_HOST || !process.env.V2_IDENTITY_DB_PASSWORD) {
  throw new Error('Identity seed import only permits the isolated V2 identity_db');
}
const pool = new pg.Pool({
  host: process.env.V2_IDENTITY_DB_HOST,
  port: Number(process.env.V2_IDENTITY_DB_PORT || 5432),
  user: process.env.V2_IDENTITY_DB_USER || 'v2_local',
  password: process.env.V2_IDENTITY_DB_PASSWORD,
  database: 'identity_db',
  connectionTimeoutMillis: 3000,
  application_name: 'adidas-v2-identity-seed'
});
try {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const known = await client.query(
      'SELECT id,email FROM identity_accounts WHERE id=ANY($1::integer[]) FOR UPDATE',
      [accounts.map(account => account.id)]
    );
    const knownById = new Map(known.rows.map(row => [Number(row.id), row.email]));
    const newlyImported = new Set();
    for (const account of accounts) {
      const existingEmail = knownById.get(account.id);
      if (existingEmail !== undefined) {
        if (existingEmail !== account.email) throw new Error('Legacy identity ID/email conflict');
        continue;
      }
      const inserted = await client.query(
        "INSERT INTO identity_accounts(id,email,password_hash,roles,status,email_verified_at," +
        "password_reset_required,token_version,provisioning_state,created_at,updated_at) " +
        "VALUES($1,$2,NULL,$3,'ACTIVE',$4,true,1,'PENDING',$5,clock_timestamp()) " +
        "ON CONFLICT(id) DO NOTHING RETURNING id",
        [account.id, account.email, account.roles, account.verifiedAt, account.createdAt]
      );
      if (inserted.rowCount) newlyImported.add(account.id);
      const saved = await client.query('SELECT email FROM identity_accounts WHERE id=$1', [account.id]);
      if (!saved.rowCount || saved.rows[0].email !== account.email) {
        throw new Error('Legacy identity seed ID/email conflict');
      }
    }
    await client.query(
      "SELECT setval(pg_get_serial_sequence('identity_accounts','id')::regclass, " +
      "GREATEST((SELECT COALESCE(MAX(id),1) FROM identity_accounts),1), true)"
    );
    for (const id of newlyImported) {
      const saved = await client.query(
        'SELECT password_hash,password_reset_required FROM identity_accounts WHERE id=$1', [id]
      );
      if (!saved.rowCount || saved.rows[0].password_hash !== null ||
          saved.rows[0].password_reset_required !== true) {
        throw new Error('Legacy identity safe-password reconciliation failed');
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
    throw error;
  } finally { client.release(); }

  console.log('PASS Identity legacy seed: stable IDs/emails, new accounts reset-required; existing credentials preserved');
} catch (error) {
  console.error('Identity seed import failed: ' + (error?.code || 'validation failure'));
  process.exitCode = 1;
} finally {
  await pool.end();
}
