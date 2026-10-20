import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import pg from 'pg';
const db=process.env.V2_CATALOG_DB_NAME||'catalog_db';
if(!process.env.V2_CATALOG_DB_HOST||!process.env.V2_CATALOG_DB_PASSWORD)
 throw new Error('Only isolated V2 catalog_db supported, missing V2 credentials');
if(db!=='catalog_db')throw new Error('Refusing non-catalog target');
const pool=new pg.Pool({host:process.env.V2_CATALOG_DB_HOST,
 port:Number(process.env.V2_CATALOG_DB_PORT||5432),database:db,
 user:process.env.V2_CATALOG_DB_USER||'v2_local',password:process.env.V2_CATALOG_DB_PASSWORD,
 connectionTimeoutMillis:3000});
try{
 await pool.query(readFileSync(resolve('apps/catalog-service/migrations/001_catalog.sql'),'utf8'));
 console.log('PASS catalog migration 001');
}catch(e){console.error(e);process.exitCode=1}
finally{await pool.end()}
