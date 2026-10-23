import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const sql=readFileSync(resolve('../init-postgres/nike_shop.sql'),'utf8');
const block=sql.match(/INSERT INTO "public"\."product_variants"[\s\S]*?;/)?.[0];
if(!block)throw new Error('Original seed SQL has no product_variants rows');
const rows=block.split('\n').map(x=>x.trim()).filter(x=>/^\(\d+,/.test(x));
const parsed=rows.map(x=>{
  const match=x.match(/^\((\d+),\s*(\d+|NULL),\s*'[^']*',\s*'[^']*',\s*(-?\d+|NULL),\s*('[^']*'|NULL)\)[,;]?$/);
  if(!match)throw new Error('Unexpected variant seed format: '+x.slice(0,80));
  return {id:Number(match[1]),stock:Number(match[3]),sku:match[4]};
});
if(parsed.some(x=>!Number.isSafeInteger(x.stock)||x.stock<0))throw new Error('Invalid stock in seed');
if(new Set(parsed.map(x=>x.id)).size!==parsed.length)throw new Error('Duplicate variant IDs in seed');
if(process.argv.includes('--check')) {
  console.log('PASS parsed '+parsed.length+' unique seed variants; no changes applied');
} else {
  console.error('Preparing '+parsed.length+' seed variants for isolated V2 inventory_db');
  process.stdout.write('BEGIN;\n');
  for(const row of parsed){
    const key='seed:'+row.id;
    process.stdout.write(`WITH created AS (
      INSERT INTO inventory_stock(variant_id,sku,on_hand_qty) VALUES
      (${row.id},${row.sku},${row.stock}) ON CONFLICT DO NOTHING RETURNING variant_id
    )
    INSERT INTO inventory_stock_movements
    (id,variant_id,operation_key,movement_type,delta_on_hand,delta_reserved)
    SELECT gen_random_uuid(), variant_id, '${key}', 'INITIAL', ${row.stock}, 0
    FROM created;\n`);
  }
  process.stdout.write('COMMIT;\n');
}
