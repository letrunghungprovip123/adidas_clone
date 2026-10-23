import {Logger} from '@nestjs/common';
import {CatalogDatabase} from './database';
import {CatalogError,assertInputFields,boundedPage,requiredText,priceVnd,normalizeGender,positiveId} from './catalog.types';
type ProductRecord={id:number;name:string;slug:string;description:string|null;brand:string|null;
 gender:string;category_id:number|null;base_price_vnd:string;status:string;version:string;created_at:Date};
export class CatalogSearch{
 private timer?:NodeJS.Timeout;private busy=false;private activeIndex='catalog_products_v1';
 private readonly log=new Logger(CatalogSearch.name);
 constructor(private readonly db:CatalogDatabase,private readonly endpoint:string){}
 // Elasticsearch JSON responses have provider-specific dynamic shapes validated at use sites.
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
 private async call(path:string,init:RequestInit={}):Promise<any>{
  const response=await fetch(this.endpoint+path,{...init,
    headers:{'content-type':'application/json',...(init.headers||{})},signal:AbortSignal.timeout(4000)});
  if(!response.ok)throw new Error('Elasticsearch '+response.status+' '+path);
  const txt=await response.text();return txt?JSON.parse(txt):{};
 }
 private readonly mapping={
  settings:{analysis:{analyzer:{text_folded:{tokenizer:'standard',filter:['lowercase','asciifolding']}}}},
  mappings:{dynamic:'strict',properties:{
   id:{type:'integer'},name:{type:'text',analyzer:'text_folded',fields:{keyword:{type:'keyword'}}},
   suggest:{type:'search_as_you_type',analyzer:'text_folded'},
   slug:{type:'keyword'},description:{type:'text',analyzer:'text_folded'},
   brand:{type:'keyword'},gender:{type:'keyword'},category_id:{type:'integer'},
   price_vnd:{type:'scaled_float',scaling_factor:100},created_at:{type:'date'},available:{type:'boolean'},
   variants:{type:'nested',properties:{variant_id:{type:'integer'},sku:{type:'keyword'},
    size:{type:'keyword'},color:{type:'keyword'},available_qty:{type:'integer'}}}
  }}
 };
 async ensureIndex(){
  const exists=await fetch(this.endpoint+'/'+this.activeIndex,{method:'HEAD',signal:AbortSignal.timeout(4000)});
  if(exists.status===404)await this.call('/'+this.activeIndex,{method:'PUT',body:JSON.stringify(this.mapping)});
  else if(!exists.ok)throw new Error('ES HEAD failed');
  const alias=await fetch(this.endpoint+'/_alias/catalog-products-read',{signal:AbortSignal.timeout(4000)});
  if(alias.status===404){
   await this.call('/_aliases',{method:'POST',body:JSON.stringify({actions:[
    {add:{index:this.activeIndex,alias:'catalog-products-read'}}
   ]})});
  }else if(alias.ok){
   const map=await alias.json() as Record<string,unknown>;
   this.activeIndex=Object.keys(map)[0]||this.activeIndex;
  }else throw new Error('Cannot read Catalog search alias');
 }
 async start(){
  if(this.timer)return;
  // Keep retrying index bootstrap even when ES is unavailable at process startup.
  this.timer=setInterval(()=>{void this.tick()},2500);
  this.timer.unref();
  await this.tick();
 }
 private initialized=false;
 private async tick(){
  if(this.busy)return;
  this.busy=true;
  try{
   if(!this.initialized){await this.ensureIndex();this.initialized=true;}
   await this.syncBatch(20);
  }catch(e){
   this.initialized=false;
   this.log.warn('Catalog search will retry: '+(e instanceof Error?e.message:'unknown'));
  }finally{this.busy=false}
 }
 private async indexedDocument(id:number){
  const row=await this.db.query<ProductRecord>('SELECT * FROM catalog_products WHERE id=$1',[id]);
  if(!row.rowCount)throw new Error('Missing product');
  const prod=row.rows[0];
  const variants=await this.db.query<{id:number;sku:string;size:string;color:string;available_qty:number|null}>(
   `SELECT v.id,v.sku,v.size,v.color,
     CASE WHEN v.status='ACTIVE' AND v.inventory_sync_status='SYNCED' THEN i.available_qty ELSE 0 END AS available_qty
    FROM catalog_variants v LEFT JOIN catalog_inventory_projection i ON i.variant_id=v.id
    WHERE v.product_id=$1`,[id]);
  const doc={id:prod.id,name:prod.name,suggest:prod.name,slug:prod.slug,description:prod.description??'',
   brand:prod.brand??'',gender:prod.gender,category_id:prod.category_id,
   price_vnd:Number(prod.base_price_vnd),created_at:prod.created_at,
   available:variants.rows.some(v=>Number(v.available_qty)>0),
   variants:variants.rows.map(v=>({variant_id:v.id,sku:v.sku,size:v.size,color:v.color,available_qty:Number(v.available_qty??0)}))
  };
  return {doc,version:Number(prod.version),status:prod.status};
 }
 async syncBatch(limit=20){
  const r=await this.db.query<{id:number;version:string}>(
   `SELECT p.id,p.version FROM catalog_products p
    LEFT JOIN catalog_search_sync_state s ON s.product_id=p.id
    WHERE s.product_id IS NULL OR s.indexed_version<p.version
    ORDER BY p.id LIMIT $1`,[limit]);
  for(const x of r.rows){
   const source=await this.indexedDocument(x.id);
   const version=source.version;
   if(source.status==='PUBLISHED'){
    await this.call('/'+this.activeIndex+'/_doc/'+x.id+
      '?version='+version+'&version_type=external_gte',{method:'PUT',body:JSON.stringify(source.doc)});
   }else{
    const d=await fetch(this.endpoint+'/'+this.activeIndex+'/_doc/'+x.id+
      '?version='+version+'&version_type=external_gte',{method:'DELETE',signal:AbortSignal.timeout(4000)});
    if(!d.ok&&d.status!==404)throw new Error('ES delete failed '+d.status);
   }
   // compare version again: a concurrent mutation cannot incorrectly mark an older index current.
   await this.db.query(`INSERT INTO catalog_search_sync_state(product_id,indexed_version,indexed_at)
    VALUES($1,$2,clock_timestamp()) ON CONFLICT(product_id) DO UPDATE
    SET indexed_version=excluded.indexed_version,indexed_at=excluded.indexed_at,last_error=NULL
    WHERE catalog_search_sync_state.indexed_version<$2`,[x.id,version]);
  }
  return r.rows.length;
 }
 async rebuild(){
  const index='catalog_products_v'+Date.now();
  await this.call('/'+index,{method:'PUT',body:JSON.stringify(this.mapping)});
  let last=0,number=0;
  for(;;){
   const r=await this.db.query<{id:number}>(
    'SELECT id FROM catalog_products WHERE id>$1 ORDER BY id LIMIT 100',[last]);
   if(!r.rows.length)break;
   for(const row of r.rows){
    const source=await this.indexedDocument(row.id);
    if(source.status==='PUBLISHED'){
     await this.call('/'+index+'/_doc/'+row.id,
      {method:'PUT',body:JSON.stringify(source.doc)});number++;
    }
    last=row.id;
   }
  }
  // Catch-up writes need a short follow-up sync after alias switch.
  const current=await this.call('/_alias/catalog-products-read');
  const actions=Object.keys(current).map(old=>({remove:{index:old,alias:'catalog-products-read'}}) as object);
  actions.push({add:{index,alias:'catalog-products-read'}});
  await this.call('/_aliases',{method:'POST',body:JSON.stringify({actions})});
  this.activeIndex=index;
  await this.db.query('UPDATE catalog_search_sync_state SET indexed_version=-1');
  return {index,count:number};
 }
 async search(input:unknown){
  const q=assertInputFields(input,['q','page','limit','category_id','brand','gender','price_min','price_max','size','color','in_stock']);
  const text=requiredText(q.q,'q',160),page=boundedPage(q.page,1,10000),limit=boundedPage(q.limit,12,50);
  const filter:unknown[]=[{term:{}}];
  filter.pop();
  if(q.category_id!==undefined)filter.push({term:{category_id:Number(q.category_id)}});
  if(q.brand!==undefined)filter.push({term:{brand:requiredText(q.brand,'brand',100)}});
  if(q.gender!==undefined)filter.push({term:{gender:normalizeGender(q.gender)}});
  if(q.in_stock===true||q.in_stock==='true')filter.push({term:{available:true}});
  const range:Record<string,number>={};
  if(q.price_min!==undefined)range.gte=Number(priceVnd(q.price_min));
  if(q.price_max!==undefined)range.lte=Number(priceVnd(q.price_max));
  if(Object.keys(range).length)filter.push({range:{price_vnd:range}});
  if(q.size||q.color){
   const term:unknown[]=[];
   if(q.size)term.push({term:{'variants.size':requiredText(q.size,'size',30)}});
   if(q.color)term.push({term:{'variants.color':requiredText(q.color,'color',80)}});
   filter.push({nested:{path:'variants',query:{bool:{filter:term}}}});
  }
  try{
   const raw=await this.call('/catalog-products-read/_search',{method:'POST',body:JSON.stringify({
    from:(page-1)*limit,size:limit,
    query:{bool:{must:[{multi_match:{query:text,type:'bool_prefix',
     fields:['suggest','suggest._2gram','suggest._3gram','name^3','description']}}],filter}},
    sort:[{_score:'desc'},{created_at:'desc'},{id:'asc'}]
   })});
   const hits=(raw.hits?.hits??[]) as Array<{_source:{id:number}}>;
   const ids=hits.map(h=>h._source.id);
   // Never return stale deleted/unpublished documents from Elasticsearch.
   const authoritative=ids.length?await this.db.query<ProductRecord>(
    'SELECT * FROM catalog_products WHERE status=$1 AND id=ANY($2::integer[])',['PUBLISHED',ids]):{rows:[]};
   const map=new Map(authoritative.rows.map(x=>[x.id,x]));
   return {data:ids.filter(id=>map.has(id)).map(id=>map.get(id)),meta:{
    total:Number(raw.hits?.total?.value??0),page,limit,source:'elasticsearch'}};
  }catch{
   this.log.warn('ES unavailable; using bounded PostgreSQL fallback');
   const conditions=["p.status='PUBLISHED'",
     "(p.name ILIKE $1 ESCAPE '!' OR p.brand ILIKE $1 ESCAPE '!' OR p.description ILIKE $1 ESCAPE '!')"];
   const pattern='%'+text.replaceAll('!','!!').replaceAll('%','!%').replaceAll('_','!_')+'%';
   const args:unknown[]=[pattern];
   const bind=(template:(param:string)=>string,value:unknown)=>{
    args.push(value);conditions.push(template('$'+args.length));
   };
   if(q.category_id!==undefined)bind(x=>'p.category_id='+x,positiveId(q.category_id,'category_id'));
   if(q.brand!==undefined)bind(x=>'lower(p.brand)=lower('+x+')',requiredText(q.brand,'brand',100));
   if(q.gender!==undefined)bind(x=>'p.gender='+x,normalizeGender(q.gender));
   if(q.price_min!==undefined)bind(x=>'p.base_price_vnd>='+x,priceVnd(q.price_min));
   if(q.price_max!==undefined)bind(x=>'p.base_price_vnd<='+x,priceVnd(q.price_max));
   const available=q.in_stock===true||q.in_stock==='true';
   const soldOut=q.in_stock===false||q.in_stock==='false';
   if(q.in_stock!==undefined&&!available&&!soldOut)
    throw new CatalogError('VALIDATION_FAILED','in_stock must be boolean');
   if(q.size!==undefined||q.color!==undefined||available||soldOut){
    const variantConditions=['v.product_id=p.id',"v.status='ACTIVE'","v.inventory_sync_status='SYNCED'"];
    if(q.size!==undefined){args.push(requiredText(q.size,'size',30));variantConditions.push('v.size=$'+args.length);}
    if(q.color!==undefined){args.push(requiredText(q.color,'color',80));variantConditions.push('v.color=$'+args.length);}
    if(available)variantConditions.push('ip.available_qty>0');
    if(soldOut)variantConditions.push('(ip.available_qty IS NULL OR ip.available_qty=0)');
    const exists="EXISTS(SELECT 1 FROM catalog_variants v LEFT JOIN catalog_inventory_projection ip ON ip.variant_id=v.id WHERE "+
      variantConditions.join(' AND ')+')';
    conditions.push(exists);
   }
   const where=conditions.join(' AND ');
   const count=await this.db.query<{total:string}>('SELECT count(*) AS total FROM catalog_products p WHERE '+where,args);
   const records=await this.db.query<ProductRecord>(
    'SELECT p.* FROM catalog_products p WHERE '+where+
    ' ORDER BY p.created_at DESC,p.id DESC LIMIT $'+(args.length+1)+' OFFSET $'+(args.length+2),
    [...args,limit,(page-1)*limit]);
   return {data:records.rows,meta:{total:Number(count.rows[0].total),page,limit,
    source:'postgres_fallback',degraded:true}};
  }
 }
 async close(){if(this.timer)clearInterval(this.timer)}
}
