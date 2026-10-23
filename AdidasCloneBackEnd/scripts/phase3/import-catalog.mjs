import {spawnSync} from 'node:child_process';
import pg from 'pg';
const db=process.env.V2_CATALOG_DB_NAME||'catalog_db';
if(!process.env.V2_CATALOG_DB_HOST||!process.env.V2_CATALOG_DB_PASSWORD||db!=='catalog_db')
 throw new Error('Import is only permitted into isolated V2 catalog_db');
const build=spawnSync(process.execPath,['scripts/phase3/seed-catalog.mjs'],{encoding:'utf8'});
if(build.status!==0)throw new Error('Seed validation failed: '+build.stderr);
const pool=new pg.Pool({host:process.env.V2_CATALOG_DB_HOST,
 port:Number(process.env.V2_CATALOG_DB_PORT||5432),
 database:db,user:process.env.V2_CATALOG_DB_USER||'v2_local',password:process.env.V2_CATALOG_DB_PASSWORD,
 connectionTimeoutMillis:3000});
try{
 await pool.query(build.stdout);
 const r=await pool.query(`SELECT
 (SELECT count(*)::integer FROM catalog_categories) AS categories,
 (SELECT count(*)::integer FROM catalog_products) AS products,
 (SELECT count(*)::integer FROM catalog_variants) AS variants,
 (SELECT count(*)::integer FROM catalog_product_images) AS images,
 (SELECT count(*)::integer FROM catalog_reviews) AS reviews`);
 const counts=r.rows[0];
 if(counts.categories!==11||counts.products!==85||counts.variants!==489||
  counts.images!==93||counts.reviews!==5)throw new Error('Post-import count mismatch: '+JSON.stringify(counts));
 console.log('PASS Catalog seed import:',JSON.stringify(counts));
}catch(e){console.error(e);process.exitCode=1}
finally{await pool.end()}
