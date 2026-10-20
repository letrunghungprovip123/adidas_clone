import {createHash,randomUUID} from 'node:crypto';
import {Injectable,Logger} from '@nestjs/common';
import {CatalogDatabase} from './database';
import {CatalogError,positiveId,requiredText} from './catalog.types';
import {CatalogService} from './catalog.service';

@Injectable()
export class CatalogMediaReviewsAI {
 private readonly log=new Logger(CatalogMediaReviewsAI.name);
 constructor(private readonly db:CatalogDatabase,private readonly catalog:CatalogService){}
 signedUpload(productId:number){
  positiveId(productId);
  const cloud=process.env.V2_CLOUDINARY_CLOUD_NAME;
  const apiKey=process.env.V2_CLOUDINARY_API_KEY;
  const secret=process.env.V2_CLOUDINARY_API_SECRET;
  if(!cloud||!apiKey||!secret)throw new CatalogError('DEPENDENCY_UNAVAILABLE','Cloudinary not configured');
  const timestamp=Math.floor(Date.now()/1000);
  const folder='catalog-v2/products/'+productId;
  const public_id=randomUUID();
  const params='folder='+folder+'&public_id='+public_id+'&timestamp='+timestamp;
  const signature=createHash('sha1').update(params+secret).digest('hex');
  return {cloud_name:cloud,api_key:apiKey,folder,public_id,timestamp,signature,
    url:'https://api.cloudinary.com/v1_1/'+encodeURIComponent(cloud)+'/image/upload'};
 }
 /** Verify remote asset metadata; never trust image_url supplied by client. */
 async confirmImage(productId:number,publicId:string,altText:string,key:string){
  positiveId(productId);requiredText(publicId,'public_id',300);requiredText(key,'idempotency_key',180);
  const cloud=process.env.V2_CLOUDINARY_CLOUD_NAME;
  const apiKey=process.env.V2_CLOUDINARY_API_KEY,secret=process.env.V2_CLOUDINARY_API_SECRET;
  if(!cloud||!apiKey||!secret)throw new CatalogError('DEPENDENCY_UNAVAILABLE','Cloudinary not configured');
  if(!publicId.startsWith('catalog-v2/products/'+productId+'/'))
   throw new CatalogError('VALIDATION_FAILED','Image belongs to another product');
  if(altText.length>500)throw new CatalogError('VALIDATION_FAILED','Image alt text too long');
  const endpoint='https://api.cloudinary.com/v1_1/'+encodeURIComponent(cloud)+'/resources/image/upload/'+
   publicId.split('/').map(encodeURIComponent).join('/');
  const auth=Buffer.from(apiKey+':'+secret).toString('base64');
  const resp=await fetch(endpoint,{headers:{Authorization:'Basic '+auth},signal:AbortSignal.timeout(5000)});
  if(!resp.ok)throw new CatalogError('DEPENDENCY_UNAVAILABLE','Cloudinary verification failed');
  const asset=await resp.json() as {secure_url?:string;bytes?:number;format?:string;public_id?:string};
  if(asset.public_id!==publicId||!asset.secure_url?.startsWith('https://res.cloudinary.com/')||
    !Number.isFinite(asset.bytes)||asset.bytes!>10*1024*1024||
    !['jpeg','jpg','png','webp'].includes(asset.format??''))throw new CatalogError('VALIDATION_FAILED','Image asset rejected');
  return this.db.transaction(async c=>{
   const existing=await c.query('SELECT * FROM catalog_product_images WHERE provider_id=$1',[publicId]);
   if(existing.rowCount)return existing.rows[0];
   await c.query("SELECT pg_advisory_xact_lock(hashtext('catalog_product_images'))");
   const id=(await c.query<{id:number}>('SELECT coalesce(max(id),0)+1 AS id FROM catalog_product_images')).rows[0].id;
   const product=await c.query('SELECT id FROM catalog_products WHERE id=$1 AND status<>$2 FOR UPDATE',[productId,'ARCHIVED']);
   if(!product.rowCount)throw new CatalogError('CONFLICT','Product missing or archived');
   const existingCount=await c.query<{n:string}>('SELECT count(*) AS n FROM catalog_product_images WHERE product_id=$1',[productId]);
   if(Number(existingCount.rows[0].n)>=20)throw new CatalogError('CONFLICT','Maximum 20 images per product');
   const r=await c.query(`INSERT INTO catalog_product_images
      (id,product_id,image_url,provider_id,alt_text,sort_order,is_primary)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id,productId,asset.secure_url,publicId,altText,Number(existingCount.rows[0].n),Number(existingCount.rows[0].n)===0]);
   const changed=await c.query<{version:string}>(
    'UPDATE catalog_products SET version=version+1,updated_at=clock_timestamp() WHERE id=$1 RETURNING version',[productId]);
   const messageId=randomUUID();
   await c.query('INSERT INTO catalog_outbox(id,topic,envelope) VALUES($1,$2,$3)',[
    messageId,'catalog.product.updated.v1',JSON.stringify({
     message_id:messageId,contract_version:1,correlation_id:String(productId),
     occurred_at:new Date().toISOString(),actor:{kind:'system'},
     payload:{id:productId,version:Number(changed.rows[0].version)}
    })
   ]);
   return r.rows[0];
  });
 }
 /** Only a verified Identity/Order actor may invoke this in a later cutover. */
 async createReview(productId:number,userId:number,rating:number,comment:string,verifiedPurchase:boolean){
  positiveId(productId);positiveId(userId,'user_id');
  if(!verifiedPurchase)throw new CatalogError('FORBIDDEN','Verified-purchase proof required');
  if(!Number.isInteger(rating)||rating<1||rating>5)throw new CatalogError('VALIDATION_FAILED','Rating must be 1–5');
  if(typeof comment!=='string'||comment.length>3000)
    throw new CatalogError('VALIDATION_FAILED','Comment too long');
  return this.db.transaction(async c=>{
   const p=await c.query('SELECT 1 FROM catalog_products WHERE id=$1',[productId]);
   if(!p.rowCount)throw new CatalogError('NOT_FOUND','Product missing');
   await c.query("SELECT pg_advisory_xact_lock(hashtext('catalog_reviews'))");
   const id=(await c.query<{id:number}>('SELECT coalesce(max(id),0)+1 AS id FROM catalog_reviews')).rows[0].id;
   const result=await c.query(`INSERT INTO catalog_reviews
     (id,product_id,user_id,rating,comment,status,legacy_unverified)
     VALUES($1,$2,$3,$4,$5,'VISIBLE',false) RETURNING id,product_id,user_id,rating,comment`,
     [id,productId,userId,rating,comment]);
   return result.rows[0];
  });
 }
 async reviewModerate(reviewId:number,show:boolean){
  positiveId(reviewId);
  const result=await this.db.query(
   "UPDATE catalog_reviews SET status=$2,updated_at=clock_timestamp() WHERE id=$1 RETURNING id,status",
   [reviewId,show?'VISIBLE':'HIDDEN']);
  if(!result.rowCount)throw new CatalogError('NOT_FOUND','Review missing');
  return result.rows[0];
 }
 async suggestions(id:number){
  const product=await this.catalog.detail(id);
  const related=await this.db.query<{id:number;name:string;base_price_vnd:string}>(
   `SELECT id,name,base_price_vnd FROM catalog_products
    WHERE category_id=$1 AND id<>$2 AND status='PUBLISHED' ORDER BY id LIMIT 5`,
   [product.category_id,id]);
  const recommendations=related.rows.map(p=>({product_id:p.id,name:p.name,price_vnd:Number(p.base_price_vnd)}));
  const fallback='Sản phẩm '+product.name+' thuộc danh mục cùng các lựa chọn phù hợp được giới thiệu bên dưới.';
  const apiKey=process.env.V2_GEMINI_API_KEY;
  if(!apiKey)return {text:fallback,recommendations,source:'catalog'};
  try{
   const response=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{
    method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
    body:JSON.stringify({contents:[{parts:[{text:
     'Viết 1 câu gợi ý sản phẩm bằng tiếng Việt dưới 60 từ. Chỉ dùng dữ liệu sau, không phát minh giá, stock, tính năng: '+
     JSON.stringify({name:product.name,description:product.description,related:recommendations.map(x=>x.name)})
    }]}],generationConfig:{maxOutputTokens:160,temperature:0.2}}),
    signal:AbortSignal.timeout(5500)});
   if(!response.ok)throw new Error('AI provider error');
   const body=await response.json() as {candidates?:Array<{content?:{parts?:Array<{text?:string}>}}>};
   const text=body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
   return {text:text?.slice(0,500)||fallback,recommendations,source:text?'gemini':'catalog'};
  }catch{this.log.warn('Gemini unavailable; returning safe Catalog suggestions');
   return {text:fallback,recommendations,source:'catalog'};
  }
 }
}
