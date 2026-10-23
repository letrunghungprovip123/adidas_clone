import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
// This reads the checked-in V1 seed and never connects to V1 runtime.
const src=readFileSync(resolve('../init-postgres/nike_shop.sql'),'utf8');
const names=['users','addresses','wishlists','loyalty_points'];
function values(row){
 const raw=row.trim().replace(/[,;]$/,'');let a=[],s='',inside=false;
 if(raw[0]!=='('||raw.at(-1)!==')')throw new Error('Bad SQL tuple');
 for(let i=1;i<raw.length-1;i++){
  const ch=raw[i];
  if(ch==="'"){if(inside&&raw[i+1]==="'"){s+="'";i++}else inside=!inside}
  else if(ch===','&&!inside){a.push(s.trim());s=''}else s+=ch;
 }
 if(inside)throw new Error('Unclosed literal');a.push(s.trim());
 return a.map(x=>x==='NULL'?null:x);
}
const rows={};
for(const name of names){
 const expr=new RegExp('INSERT INTO "public"\\."'+name+'"[^\\n]*\\n([\\s\\S]*?);');
 const m=src.match(expr);if(!m)throw new Error('Missing source table '+name);
 rows[name]=m[1].split('\n').map(x=>x.trim()).filter(x=>x.startsWith('(')).map(values);
}
const expected={users:19,addresses:20,wishlists:1,loyalty_points:7};
for(const [table,count] of Object.entries(expected))if(rows[table].length!==count)throw new Error('Unexpected '+table+' seed row count');
const userIds=new Set(rows.users.map(x=>x[0]));
for(const table of ['addresses','wishlists','loyalty_points'])
 for(const r of rows[table])if(!userIds.has(r[1]))throw new Error('Orphan '+table);
const groups=new Map();
for(const row of rows.loyalty_points){
 const uid=Number(row[1]),n=Number(row[2]??0);
 if(!Number.isSafeInteger(n)||n<0)throw new Error('Invalid legacy balance');
 groups.set(uid,(groups.get(uid)||0)+n);
}
if(groups.size!==4)throw new Error('Unexpected loyalty owner count');
console.error('PASS checked Customer legacy shape (no PII emitted)',JSON.stringify({...expected,wallets:groups.size}));
if(process.argv.includes('--check'))process.exit(0);
const lit=x=>x===null?'NULL':"'"+String(x).replaceAll("'","''")+"'";
const q=(tab,columns,items)=>items.map(row=>'INSERT INTO '+tab+'('+columns.join(',')+') VALUES('+row.map(lit).join(',')+') ON CONFLICT DO NOTHING;');
const s=['BEGIN;'];
s.push(...q('customer_profiles',['customer_id','display_name','avatar_url','phone','created_at'],
 rows.users.map(r=>[r[0],r[3],r[4],r[5],r[9]])));
s.push(...q('customer_addresses',['id','customer_id','receiver_name','phone','address_line','city','district','is_default','created_at'],
 rows.addresses.map(r=>[r[0],r[1],r[2]??'Legacy recipient',r[3]??'',r[4]??'',r[5]??'',r[6]??'',r[7]==='true',r[8]])));
// Existing V1 seed has no default addresses: select oldest active address deterministically.
s.push(`WITH first_addresses AS (
 SELECT customer_id,min(id) AS first_id FROM customer_addresses
 WHERE deleted_at IS NULL GROUP BY customer_id HAVING NOT bool_or(is_default)
) UPDATE customer_addresses a SET is_default=true
FROM first_addresses x WHERE a.id=x.first_id;`);
s.push(...q('customer_wishlists',['customer_id','product_id','created_at'],
 rows.wishlists.map(r=>[r[1],r[2],r[3]])));
s.push(...q('customer_seed_loyalty_rows',['source_id','customer_id','points','source_updated_at'],
 rows.loyalty_points.map(r=>r)));
s.push(...q('loyalty_wallets',['customer_id','posted_points'],rows.users.map(r=>[r[0],groups.get(Number(r[0]))??0])));
for(const [id,n] of groups){
 if(!n)continue;
 s.push('INSERT INTO loyalty_ledger(customer_id,entry_kind,delta_points,source_type,source_ref,reason) VALUES ('+
  [lit(id),"'OPENING'",lit(n),"'MIGRATION'",lit('v1-seed:'+id),"'V1 seed total; legacy rows preserved'"].join(',')+
  ') ON CONFLICT DO NOTHING;');
}
s.push('COMMIT;');process.stdout.write(s.join('\n')+'\n');
