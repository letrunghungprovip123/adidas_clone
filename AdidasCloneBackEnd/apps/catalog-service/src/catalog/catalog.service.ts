import {createHash,randomUUID} from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolClient} from 'pg';
import {CatalogDatabase} from './database';
import {CatalogError,requiredText,positiveId,priceVnd,safeSlug,normalizeGender,
 assertInputFields,normalizeAttributes,boundedPage} from './catalog.types';

const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
type ProductRow={id:number;name:string;slug:string;description:string|null;base_price_vnd:string;
 category_id:number|null;brand:string|null;gender:string;status:string;version:string;attributes:unknown};
type VariantRow={id:number;product_id:number;sku:string;size:string;color:string;status:string;inventory_sync_status:string;version:string};
@Injectable()
export class CatalogService{
 constructor(private readonly db:CatalogDatabase){}
 private async publishEvent(c:PoolClient,topic:string,payload:Record<string,unknown>){
  const id=randomUUID();
  const envelope={message_id:id,contract_version:1,correlation_id:String(payload.id??id),
   occurred_at:new Date().toISOString(),actor:{kind:'system'},payload};
  await c.query('INSERT INTO catalog_outbox(id,topic,envelope) VALUES ($1,$2,$3)',
   [id,topic,JSON.stringify(envelope)]);
 }
 private async op<T>(key:string,fingerprint:unknown,fn:(c:PoolClient)=>Promise<T>):Promise<T>{
  requiredText(key,'idempotency_key',180);
  const h=hash(fingerprint);
  return this.db.transaction(async c=>{
   const ins=await c.query('INSERT INTO catalog_operations(operation_key,request_hash) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING operation_key',[key,h]);
   if(!ins.rowCount){
    const prev=await c.query<{request_hash:string;result:T}>('SELECT request_hash,result FROM catalog_operations WHERE operation_key=$1 FOR UPDATE',[key]);
    if(!prev.rows.length||prev.rows[0].request_hash!==h)throw new CatalogError('IDEMPOTENCY_CONFLICT','Operation conflict');
    return prev.rows[0].result;
   }
   const result=await fn(c);
   await c.query('UPDATE catalog_operations SET result=$2 WHERE operation_key=$1',[key,JSON.stringify(result)]);
   return result;
  });
 }
 private async newId(c:PoolClient,table:'catalog_products'|'catalog_variants'|'catalog_product_images'|'catalog_reviews'){
  // Advisory transaction lock covers ID allocation across multiple app instances.
  await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[table]);
  const x=await c.query<{id:number}>('SELECT coalesce(max(id),0)+1 AS id FROM '+table);
  return x.rows[0].id;
 }
 private async one(c:PoolClient,id:number,lock=false){
  const r=await c.query<ProductRow>('SELECT * FROM catalog_products WHERE id=$1'+(lock?' FOR UPDATE':''),[id]);
  if(!r.rows.length)throw new CatalogError('NOT_FOUND','Product missing');
  return r.rows[0];
 }
 async create(input:unknown,key:string){
  const v=assertInputFields(input,['name','slug','description','base_price_vnd','category_id','brand','gender','attributes']);
  const data={
   name:requiredText(v.name,'name'),slug:safeSlug(v.slug),description:v.description===undefined?null:
     (v.description===null?null:requiredText(v.description,'description',10000)),
   price:priceVnd(v.base_price_vnd),category:positiveId(v.category_id,'category_id'),
   brand: v.brand===undefined||v.brand===null?null:requiredText(v.brand,'brand',100),
   gender:normalizeGender(v.gender??'UNISEX'),attributes:normalizeAttributes(v.attributes)
  };
  return this.op('product:create:'+key,data,async c=>{
   const category=await c.query('SELECT id FROM catalog_categories WHERE id=$1 AND status=$2',[data.category,'ACTIVE']);
   if(!category.rowCount)throw new CatalogError('VALIDATION_FAILED','Inactive or missing category');
   const id=await this.newId(c,'catalog_products');
   const r=await c.query<ProductRow>(
    `INSERT INTO catalog_products(id,name,slug,description,base_price_vnd,category_id,brand,gender,attributes)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [id,data.name,data.slug,data.description,data.price,data.category,data.brand,data.gender,JSON.stringify(data.attributes)]);
   await this.publishEvent(c,'catalog.product.created.v1',{id,version:1});
   return r.rows[0];
  });
 }
 async update(id:number,input:unknown,expectedVersion:number,key:string){
  positiveId(id);positiveId(expectedVersion,'expected_version');
  const v=assertInputFields(input,['name','slug','description','category_id','brand','gender','attributes']);
  if(!Object.keys(v).length)throw new CatalogError('VALIDATION_FAILED','No attributes to update');
  const data:Record<string,unknown>={};
  if(v.name!==undefined)data.name=requiredText(v.name,'name');
  if(v.slug!==undefined)data.slug=safeSlug(v.slug);
  if(v.description!==undefined)data.description=v.description===null?null:requiredText(v.description,'description',10000);
  if(v.category_id!==undefined)data.category_id=positiveId(v.category_id,'category_id');
  if(v.brand!==undefined)data.brand=v.brand===null?null:requiredText(v.brand,'brand',100);
  if(v.gender!==undefined)data.gender=normalizeGender(v.gender);
  if(v.attributes!==undefined)data.attributes=normalizeAttributes(v.attributes);
  return this.op('product:update:'+key,{id,expectedVersion,data},async c=>{
   const old=await this.one(c,id,true);
   if(old.status==='ARCHIVED')throw new CatalogError('CONFLICT','Archived product immutable');
   if(Number(old.version)!==expectedVersion)throw new CatalogError('CONFLICT','Stale product version');
   if(data.category_id!==undefined){
    const check=await c.query('SELECT 1 FROM catalog_categories WHERE id=$1 AND status=$2',[data.category_id,'ACTIVE']);
    if(!check.rowCount)throw new CatalogError('VALIDATION_FAILED','Inactive category');
   }
   const patch=Object.entries(data),args=patch.map(([_,val])=>typeof val==='object'&&val!==null?JSON.stringify(val):val);
   const sets=patch.map(([key],i)=>key+'=$'+(i+1));
   const r=await c.query<ProductRow>(
    'UPDATE catalog_products SET '+sets.join(',')+',version=version+1,updated_at=clock_timestamp() WHERE id=$'+(args.length+1)+' RETURNING *',
    [...args,id]);
   await this.publishEvent(c,'catalog.product.updated.v1',{id,version:Number(r.rows[0].version)});
   return r.rows[0];
  });
 }
 async priceChange(id:number,newPrice:unknown,expectedVersion:number,key:string,actorId:string,reason:string){
  positiveId(id);positiveId(expectedVersion,'expected_version');requiredText(actorId,'actor_id',180);
  requiredText(reason,'reason',250);
  const price=priceVnd(newPrice);
  return this.op('product:price:'+key,{id,price,expectedVersion,actorId,reason},async c=>{
   const old=await this.one(c,id,true);
   if(old.status==='ARCHIVED'||Number(old.version)!==expectedVersion)
    throw new CatalogError('CONFLICT','Archived or stale product');
   const previous=Number(old.base_price_vnd);
   if(previous===price)throw new CatalogError('CONFLICT','Price unchanged');
   const r=await c.query<ProductRow>(
    'UPDATE catalog_products SET base_price_vnd=$2,version=version+1,updated_at=clock_timestamp() WHERE id=$1 RETURNING *',[id,price]);
   await c.query(`INSERT INTO catalog_price_history
    (id,product_id,old_price_vnd,new_price_vnd,product_version,actor_id,reason)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [randomUUID(),id,previous,price,r.rows[0].version,actorId,reason]);
   await this.publishEvent(c,'catalog.product.updated.v1',{id,version:Number(r.rows[0].version),price_changed:true});
   return r.rows[0];
  });
 }
 async transition(id:number,action:'PUBLISHED'|'DRAFT'|'ARCHIVED',expectedVersion:number,key:string){
  positiveId(id);positiveId(expectedVersion,'expected_version');
  if(!['PUBLISHED','DRAFT','ARCHIVED'].includes(action))
    throw new CatalogError('VALIDATION_FAILED','Invalid status');
  return this.op('product:transition:'+key,{id,action,expectedVersion},async c=>{
   const current=await this.one(c,id,true);
   if(Number(current.version)!==expectedVersion)
    throw new CatalogError('CONFLICT','Stale product version');
   if(current.status==='ARCHIVED')throw new CatalogError('CONFLICT','Archived product immutable');
   if(current.status===action)throw new CatalogError('CONFLICT','Already in requested state');
   if(action==='PUBLISHED'){
    const active=await c.query(`SELECT 1 FROM catalog_variants
      WHERE product_id=$1 AND status='ACTIVE' AND inventory_sync_status='SYNCED' LIMIT 1`,[id]);
    if(!active.rowCount)throw new CatalogError('CONFLICT','Publishing requires synchronized active variant');
    const cat=await c.query('SELECT 1 FROM catalog_categories WHERE id=$1 AND status=$2',[current.category_id,'ACTIVE']);
    if(!cat.rowCount)throw new CatalogError('CONFLICT','Publishing requires active category');
   }
   const r=await c.query<ProductRow>(
    `UPDATE catalog_products SET status=$2,version=version+1,updated_at=clock_timestamp(),
     published_at=CASE WHEN $2='PUBLISHED' THEN clock_timestamp() ELSE published_at END,
     archived_at=CASE WHEN $2='ARCHIVED' THEN clock_timestamp() ELSE archived_at END
     WHERE id=$1 RETURNING *`,[id,action]);
   await this.publishEvent(c,action==='ARCHIVED'?'catalog.product.deleted.v1':'catalog.product.updated.v1',
    {id,version:Number(r.rows[0].version),status:action});
   return r.rows[0];
  });
 }
 async createVariant(input:unknown,key:string){
  const v=assertInputFields(input,['product_id','sku','size','color']);
  const data={product_id:positiveId(v.product_id,'product_id'),sku:requiredText(v.sku,'sku',100),
   size:requiredText(v.size,'size',30),color:requiredText(v.color,'color',80)};
  return this.op('variant:create:'+key,data,async c=>{
   const prod=await this.one(c,data.product_id,true);
   if(prod.status==='ARCHIVED')throw new CatalogError('CONFLICT','Product archived');
   const id=await this.newId(c,'catalog_variants');
   const r=await c.query<VariantRow>(`INSERT INTO catalog_variants(id,product_id,sku,size,color)
     VALUES($1,$2,$3,$4,$5) RETURNING *`,[id,data.product_id,data.sku,data.size,data.color]);
   await this.publishEvent(c,'catalog.variant.created.v1',{id,product_id:data.product_id,sku:data.sku,version:1});
   return r.rows[0];
  });
 }
 async variantStatus(id:number,action:'ACTIVE'|'DISABLED',key:string){
  positiveId(id);if(!['ACTIVE','DISABLED'].includes(action))throw new CatalogError('VALIDATION_FAILED','Invalid variant status');
  return this.op('variant:status:'+key,{id,action},async c=>{
   const r=await c.query<VariantRow>('SELECT * FROM catalog_variants WHERE id=$1 FOR UPDATE',[id]);
   if(!r.rowCount)throw new CatalogError('NOT_FOUND','Variant missing');
   if(r.rows[0].status===action)return r.rows[0];
   const changed=await c.query<VariantRow>(
    'UPDATE catalog_variants SET status=$2,version=version+1,updated_at=clock_timestamp() WHERE id=$1 RETURNING *',[id,action]);
   await this.publishEvent(c,'catalog.variant.status-changed.v1',{id,status:action,version:Number(changed.rows[0].version)});
   return changed.rows[0];
  });
 }
 async detail(id:number){
  positiveId(id);const product=await this.db.query<ProductRow>('SELECT * FROM catalog_products WHERE id=$1',[id]);
  if(!product.rowCount)throw new CatalogError('NOT_FOUND','Product missing');
  const [variants,images,rating]=await Promise.all([
   this.db.query(`SELECT v.*,p.available_qty,p.stock_version,p.updated_at AS stock_updated_at
    FROM catalog_variants v LEFT JOIN catalog_inventory_projection p ON p.variant_id=v.id
    WHERE v.product_id=$1 ORDER BY v.id`,[id]),
   this.db.query('SELECT * FROM catalog_product_images WHERE product_id=$1 ORDER BY sort_order,id',[id]),
   this.db.query(`SELECT count(*)::integer AS review_count,coalesce(round(avg(rating)::numeric,2),0) AS average_rating
    FROM catalog_reviews WHERE product_id=$1 AND status='VISIBLE'`,[id])]);
  return {...product.rows[0],variants:variants.rows,images:images.rows,rating:rating.rows[0]};
 }
 async list(input:unknown){
  const q=assertInputFields(input,['page','limit','category_id','brand','gender','price_min','price_max','sort','include_drafts']);
  const page=boundedPage(q.page,1,100000),limit=boundedPage(q.limit,12,100);
  const clauses=['p.status='+ (q.include_drafts===true?"p.status":"'PUBLISHED'")];
  const args:unknown[]=[];const add=(sql:string,value:unknown)=>{args.push(value);clauses.push(sql.replace('?',String(args.length)))};
  if(q.category_id!==undefined)add('p.category_id=$?',positiveId(q.category_id,'category_id'));
  if(q.brand!==undefined)add('lower(p.brand)=lower($?)',requiredText(q.brand,'brand',100));
  if(q.gender!==undefined)add('p.gender=$?',normalizeGender(q.gender));
  if(q.price_min!==undefined)add('p.base_price_vnd >= $?',priceVnd(q.price_min));
  if(q.price_max!==undefined)add('p.base_price_vnd <= $?',priceVnd(q.price_max));
  const sort={newest:'p.created_at DESC,p.id DESC',price_asc:'p.base_price_vnd ASC,p.id ASC',
    price_desc:'p.base_price_vnd DESC,p.id DESC',name:'p.name ASC,p.id ASC'} as const;
  const key=q.sort===undefined?'newest':String(q.sort);
  if(!(key in sort))throw new CatalogError('VALIDATION_FAILED','Unsupported sort');
  const where=clauses.join(' AND ');
  const count=await this.db.query<{total:string}>('SELECT count(*) AS total FROM catalog_products p WHERE '+where,args);
  const rows=await this.db.query<ProductRow>('SELECT p.* FROM catalog_products p WHERE '+where+
    ' ORDER BY '+sort[key as keyof typeof sort]+' LIMIT $'+(args.length+1)+' OFFSET $'+(args.length+2),
    [...args,limit,(page-1)*limit]);
  return {data:rows.rows,meta:{total:Number(count.rows[0].total),page,limit}};
 }
 async quote(items:unknown){
  if(!Array.isArray(items)||!items.length||items.length>50)
    throw new CatalogError('VALIDATION_FAILED','Quote requires 1-50 items');
  const sum=new Map<number,number>();
  for(const x of items){
   const row=assertInputFields(x,['variant_id','quantity']);
   const id=positiveId(row.variant_id,'variant_id'),qty=positiveId(row.quantity,'quantity');
   if(qty>10000)throw new CatalogError('VALIDATION_FAILED','Quantity too high');
   sum.set(id,(sum.get(id)||0)+qty);
   if(sum.get(id)!>10000)throw new CatalogError('VALIDATION_FAILED','Total quantity too high');
  }
  const ids=[...sum.keys()];
  const found=await this.db.query<VariantRow & {name:string;base_price_vnd:string;product_version:string;product_status:string}>(
   `SELECT v.id,v.product_id,v.sku,v.size,v.color,v.status,v.inventory_sync_status,
    p.name,p.base_price_vnd,p.version AS product_version,p.status AS product_status
    FROM catalog_variants v JOIN catalog_products p ON p.id=v.product_id WHERE v.id=ANY($1::integer[])`,[ids]);
  if(found.rows.length!==ids.length)throw new CatalogError('NOT_FOUND','Some variants missing');
  const valid=found.rows.map(v=>{
   if(v.status!=='ACTIVE'||v.inventory_sync_status!=='SYNCED'||v.product_status!=='PUBLISHED')
     throw new CatalogError('CONFLICT','Variant unavailable: '+v.id);
   return {product_id:v.product_id,variant_id:v.id,sku:v.sku,name:v.name,quantity:sum.get(v.id)!,
    unit_price_vnd:Number(v.base_price_vnd),currency:'VND',product_version:Number(v.product_version)};
  }).sort((a,b)=>a.variant_id-b.variant_id);
  return {items:valid,subtotal_vnd:valid.reduce((a,x)=>a+x.quantity*x.unit_price_vnd,0)};
 }
 async reviews(productId:number,page:unknown=1,limit:unknown=12){
  positiveId(productId);const p=boundedPage(page,1,100000),n=boundedPage(limit,12,50);
  const rows=await this.db.query(`SELECT id,product_id,user_id,rating,comment,created_at
   FROM catalog_reviews WHERE product_id=$1 AND status='VISIBLE'
   ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,[productId,n,(p-1)*n]);
  return {data:rows.rows,page:p,limit:n};
 }
 async categories(){
  const r=await this.db.query('SELECT * FROM catalog_categories WHERE status=$1 ORDER BY name,id',['ACTIVE']);
  return r.rows;
 }
 async createCategory(input:unknown,key:string){
  const v=assertInputFields(input,['name','slug','description']);
  const data={name:requiredText(v.name,'name',100),slug:safeSlug(v.slug),
   description:v.description==null?null:requiredText(v.description,'description',10000)};
  return this.op('category:create:'+key,data,async c=>{
   const id=await this.newCategoryId(c);
   const result=await c.query('INSERT INTO catalog_categories(id,name,slug,description) VALUES($1,$2,$3,$4) RETURNING *',
    [id,data.name,data.slug,data.description]);
   return result.rows[0];
  });
 }
 private async newCategoryId(c:PoolClient){
  await c.query("SELECT pg_advisory_xact_lock(hashtext('catalog_categories'))");
  const r=await c.query<{id:number}>('SELECT coalesce(max(id),0)+1 AS id FROM catalog_categories');
  return r.rows[0].id;
 }
 async categoryStatus(id:number,status:'ACTIVE'|'INACTIVE',key:string){
  positiveId(id);if(!['ACTIVE','INACTIVE'].includes(status))
    throw new CatalogError('VALIDATION_FAILED','Invalid category status');
  return this.op('category:status:'+key,{id,status},async c=>{
   if(status==='INACTIVE'){
    const inUse=await c.query(
     "SELECT 1 FROM catalog_products WHERE category_id=$1 AND status='PUBLISHED' LIMIT 1",[id]);
    if(inUse.rowCount)throw new CatalogError('CONFLICT','Category has published products');
   }
   const r=await c.query('UPDATE catalog_categories SET status=$2 WHERE id=$1 RETURNING *',[id,status]);
   if(!r.rowCount)throw new CatalogError('NOT_FOUND','Category missing');
   return r.rows[0];
  });
 }
 async updateVariant(id:number,input:unknown,key:string){
  positiveId(id);
  const v=assertInputFields(input,['size','color','sku']);
  if(!Object.keys(v).length)throw new CatalogError('VALIDATION_FAILED','Empty variant patch');
  const fields:Record<string,string>={};
  if(v.size!==undefined)fields.size=requiredText(v.size,'size',30);
  if(v.color!==undefined)fields.color=requiredText(v.color,'color',80);
  if(v.sku!==undefined)fields.sku=requiredText(v.sku,'sku',100);
  return this.op('variant:update:'+key,{id,fields},async c=>{
   const old=await c.query<VariantRow>('SELECT * FROM catalog_variants WHERE id=$1 FOR UPDATE',[id]);
   if(!old.rowCount)throw new CatalogError('NOT_FOUND','Variant missing');
   if(fields.sku&&fields.sku!==old.rows[0].sku&&old.rows[0].inventory_sync_status==='SYNCED')
    throw new CatalogError('CONFLICT','Changing SKU after Inventory registration requires a separate coordinated operation');
   const patch=Object.entries(fields),args=patch.map(x=>x[1]);
   const sets=patch.map(([key],i)=>key+'=$'+(i+1)).join(',');
   const updated=await c.query<VariantRow>(
    'UPDATE catalog_variants SET '+sets+',version=version+1,updated_at=clock_timestamp() WHERE id=$'+(args.length+1)+' RETURNING *',
    [...args,id]);
   await this.publishEvent(c,'catalog.variant.updated.v1',{id,product_id:updated.rows[0].product_id});
   return updated.rows[0];
  });
 }
 async priceHistory(productId:number){
  positiveId(productId);
  const rows=await this.db.query(
   'SELECT old_price_vnd,new_price_vnd,product_version,actor_id,reason,created_at FROM catalog_price_history WHERE product_id=$1 ORDER BY created_at DESC LIMIT 100',
   [productId]);
  return rows.rows;
 }

}
