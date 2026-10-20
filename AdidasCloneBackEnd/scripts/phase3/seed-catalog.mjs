import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
// Parses the checked-in *V1 seed*, never contacts its running V1 database.
const sql=readFileSync(resolve('../init-postgres/nike_shop.sql'),'utf8');
const tables=['categories','products','product_variants','product_images','reviews'];
function splitTuple(line){
  const v=line.trim().replace(/[,;]$/,'');
  if(!v.startsWith('(')||!v.endsWith(')'))throw new Error('Invalid tuple');
  let out=[],s='',quoted=false;
  for(let i=1;i<v.length-1;i++){
    const ch=v[i];
    if(ch==="'"){if(quoted&&v[i+1]==="'"){s+="'";i++}else quoted=!quoted;}
    else if(ch===','&&!quoted){out.push(s.trim());s='';}
    else s+=ch;
  }
  if(quoted)throw new Error('Unclosed SQL literal');
  out.push(s.trim());
  return out.map(x=>x==='NULL'?null:x);
}
const rows={};
for(const table of tables){
  const re=new RegExp('INSERT INTO "public"\\."'+table+'"[^\\n]*\\n([\\s\\S]*?);');
  const hit=sql.match(re);
  if(!hit)throw new Error('Missing '+table);
  rows[table]=hit[1].split('\n').map(x=>x.trim())
    .filter(x=>x.startsWith('(')).map(splitTuple);
}
const count={categories:11,products:85,product_variants:489,product_images:93,reviews:5};
for(const [t,n] of Object.entries(count))if(rows[t].length!==n)throw new Error('Seed mismatch '+t);
const unique=(items,name)=>{if(new Set(items).size!==items.length)throw new Error('Duplicate '+name)};
unique(rows.products.map(r=>r[0]),'product id');unique(rows.product_variants.map(r=>r[0]),'variant id');
unique(rows.product_variants.map(r=>r[5]),'sku');
const products=new Set(rows.products.map(r=>r[0])), categories=new Set(rows.categories.map(r=>r[0]));
for(const v of rows.product_variants)if(!products.has(v[1]))throw new Error('Orphan variant');
for(const p of rows.products)if(p[5]!==null&&!categories.has(p[5]))throw new Error('Orphan category');
for(const i of rows.product_images)if(!products.has(i[1]))throw new Error('Orphan image');
for(const r of rows.reviews)if(!products.has(r[2]))throw new Error('Orphan review');
const gender=x=>{const s=x.toLowerCase();return ['men','male','nam'].includes(s)?'MEN':['women','female','nữ'].includes(s)?'WOMEN':'UNISEX'};
console.error('PASS checked immutable seed',JSON.stringify(count));
if(process.argv.includes('--check'))process.exit(0);
const out=[];
const literal=v=>v===null?'NULL':"'"+String(v).replaceAll("'","''")+"'";
const inserts=(table,cols,rs)=>{for(const row of rs){out.push('INSERT INTO '+table+'('+cols.join(',')+') VALUES ('+row.map(literal).join(',')+') ON CONFLICT DO NOTHING;')}};
out.push('BEGIN;');
inserts('catalog_categories',['id','name','slug','description'],rows.categories);
inserts('catalog_products',['id','name','slug','description','base_price_vnd','category_id','brand','gender','attributes','created_at','status'],
 rows.products.map(r=>[...r.slice(0,4),r[4],r[5],r[6],gender(r[7]),r[8],r[9],'PUBLISHED']));
inserts('catalog_variants',['id','product_id','size','color','sku','inventory_sync_status','inventory_status_synced_version'],
 rows.product_variants.map(r=>[r[0],r[1],r[2],r[3],r[5],'SYNCED',1]));
inserts('catalog_product_images',['id','product_id','image_url','alt_text','sort_order','is_primary'],
 rows.product_images.map(r=>[...r,r[0],'false']));
inserts('catalog_reviews',['id','user_id','product_id','rating','comment','created_at','updated_at','legacy_unverified'],
 rows.reviews.map(r=>[...r,'true']));
out.push('COMMIT;');
process.stdout.write(out.join('\n')+'\n');
