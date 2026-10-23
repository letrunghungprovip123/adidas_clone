import {spawnSync} from 'node:child_process';
import pg from 'pg';
if(process.env.V2_CUSTOMER_DB_NAME!=='customer_db'||!process.env.V2_CUSTOMER_DB_HOST||
 !process.env.V2_CUSTOMER_DB_PASSWORD)throw new Error('Customer importer only permits V2 customer_db');
const parsed=spawnSync(process.execPath,['scripts/phase4/seed-customer.mjs'],{encoding:'utf8',maxBuffer:1024*1024});
if(parsed.status!==0)throw new Error('Seed parser rejected source: '+parsed.stderr.replaceAll(/[^\n]+/g,'[redacted]'));
const pool=new pg.Pool({host:process.env.V2_CUSTOMER_DB_HOST,
 port:Number(process.env.V2_CUSTOMER_DB_PORT||5432),user:process.env.V2_CUSTOMER_DB_USER||'v2_local',
 password:process.env.V2_CUSTOMER_DB_PASSWORD,database:'customer_db',connectionTimeoutMillis:3000});
try{
 await pool.query(parsed.stdout);
 const r=await pool.query(`SELECT
  (SELECT count(*)::integer FROM customer_profiles) profiles,
  (SELECT count(*)::integer FROM customer_addresses) addresses,
  (SELECT count(*)::integer FROM customer_wishlists) wishlists,
  (SELECT count(*)::integer FROM customer_seed_loyalty_rows) legacy_loyalty,
  (SELECT count(*)::integer FROM loyalty_wallets) wallets,
  (SELECT coalesce(sum(points),0)::bigint FROM customer_seed_loyalty_rows) original_points,
  (SELECT coalesce(sum(delta_points),0)::bigint FROM loyalty_ledger WHERE entry_kind='OPENING') imported_points`);
 const x=r.rows[0];
 if(x.profiles!==19||x.addresses!==20||x.wishlists!==1||x.legacy_loyalty!==7||
  x.wallets!==19||x.original_points!==x.imported_points)throw new Error('Seed reconciliation mismatch');
 console.log('PASS Customer seed counts: 19 profiles, 20 addresses, 1 wishlist, 7 source rows belonging to 4 customers, 19 wallets total; ledger totals match');
}catch(e){console.error('Customer import failed: '+(e?.code||'validation failure'));process.exitCode=1}finally{await pool.end()}
