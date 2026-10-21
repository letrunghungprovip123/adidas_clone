import {createHash,randomUUID} from 'node:crypto';
import {Injectable} from '@nestjs/common';
import type {PoolClient} from 'pg';
import {CustomerDatabase} from './database';
import {CustomerError,id,text,points,fields,page,holdId as validateHoldId} from './validation';
type Hold={id:string;customer_id:number;checkout_ref:string;status:string;points:string;expires_at:Date};
type Wallet={customer_id:number;posted_points:string;reserved_points:string;version:string};
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
@Injectable()
export class CustomerService {
 constructor(private readonly db:CustomerDatabase){}
 private async event(c:PoolClient,topic:string,payload:Record<string,unknown>){
  const messageId=randomUUID();
  await c.query('INSERT INTO customer_outbox(topic,envelope) VALUES($1,$2)',[topic,JSON.stringify({
   contract_version:1,message_id:messageId,correlation_id:messageId,
   occurred_at:new Date().toISOString(),actor:{kind:'system'},payload
  })]);
 }
 private async op<T>(key:string,payload:unknown,cb:(c:PoolClient)=>Promise<T>):Promise<T>{
  text(key,'idempotency_key');
  const fingerprint=hash(payload);
  return this.db.transaction(async c=>{
   const lock=await c.query(`INSERT INTO customer_operations(operation_key,request_hash,result)
      VALUES($1,$2,'{}'::jsonb) ON CONFLICT DO NOTHING RETURNING operation_key`,[key,fingerprint]);
   if(!lock.rowCount){
    const prev=await c.query<{request_hash:string;result:T}>(`SELECT request_hash,result FROM customer_operations
      WHERE operation_key=$1 FOR UPDATE`,[key]);
    if(!prev.rowCount||prev.rows[0].request_hash!==fingerprint)
     throw new CustomerError('IDEMPOTENCY_CONFLICT','Idempotency key conflicts with another request');
    return prev.rows[0].result;
   }
   const result=await cb(c);
   await c.query('UPDATE customer_operations SET result=$2 WHERE operation_key=$1',
    [key,JSON.stringify(result)]);
   return result;
  });
 }
 private async active(c:PoolClient,customerId:number){
  const a=await c.query('SELECT customer_id FROM customer_profiles WHERE customer_id=$1 AND status=$2 FOR UPDATE',[customerId,'ACTIVE']);
  if(!a.rowCount)throw new CustomerError('NOT_FOUND','Active customer missing');
 }
 async profile(customerId:number){
  id(customerId,'customer_id');
  const r=await this.db.query('SELECT customer_id,display_name,avatar_url,phone,status,version,created_at,updated_at FROM customer_profiles WHERE customer_id=$1',[customerId]);
  if(!r.rowCount)throw new CustomerError('NOT_FOUND','Customer missing');
  return r.rows[0];
 }
 /** Trust only authenticated Identity provisioning, never client-submitted profile creation. */
 async ensureProfile(customerId:number,key:string){
  id(customerId,'customer_id');
  return this.op('profile:ensure:'+key,{customerId},async c=>{
   await c.query('INSERT INTO customer_profiles(customer_id) VALUES($1) ON CONFLICT DO NOTHING',[customerId]);
   await c.query('INSERT INTO loyalty_wallets(customer_id) VALUES($1) ON CONFLICT DO NOTHING',[customerId]);
   const r=await c.query('SELECT customer_id,display_name,status,version FROM customer_profiles WHERE customer_id=$1',[customerId]);
   return r.rows[0];
  });
 }
 async updateProfile(customerId:number,body:unknown,expectedVersion:number,key:string){
  id(customerId,'customer_id');id(expectedVersion,'expected_version');
  const raw=fields(body,['display_name','avatar_url','phone']);
  if(!Object.keys(raw).length)throw new CustomerError('VALIDATION_FAILED','Empty patch');
  const patch:Record<string,string|null>={};
  for(const k of Object.keys(raw)){
   const value=raw[k];
   patch[k]=value===null?null:text(value,k,k==='avatar_url'?700:k==='phone'?20:100);
   if(k==='avatar_url'&&patch[k]&&!patch[k]!.startsWith('https://'))
    throw new CustomerError('VALIDATION_FAILED','Avatar must use HTTPS');
  }
  return this.op('profile:update:'+key,{customerId,expectedVersion,patch},async c=>{
   await this.active(c,customerId);
   const props=Object.keys(patch);
   const values=props.map(k=>patch[k]);
   const clauses=props.map((k,i)=>k+'=$'+(i+2)).join(',');
   const r=await c.query(
    'UPDATE customer_profiles SET '+clauses+',version=version+1,updated_at=clock_timestamp() WHERE customer_id=$1 AND version=$'+
      (values.length+2)+' RETURNING customer_id,display_name,avatar_url,phone,status,version,updated_at',
    [customerId,...values,expectedVersion]);
   if(!r.rowCount)throw new CustomerError('CONFLICT','Stale customer profile');
   await this.event(c,'customer.profile.updated.v1',{customer_id:customerId});
   return r.rows[0];
  });
 }
 private addressBody(body:unknown){
  const v=fields(body,['receiver_name','phone','address_line','city','district','is_default']);
  return {receiver_name:text(v.receiver_name,'receiver_name',100),phone:text(v.phone,'phone',20),
   address_line:text(v.address_line,'address_line',500),city:text(v.city,'city',100),
   district:text(v.district,'district',100),is_default:v.is_default===true};
 }
 async addresses(customerId:number){
  id(customerId,'customer_id');
  const r=await this.db.query(`SELECT id,customer_id,receiver_name,phone,address_line,city,district,is_default,version,created_at
   FROM customer_addresses WHERE customer_id=$1 AND deleted_at IS NULL ORDER BY is_default DESC,id`,[customerId]);
  return r.rows;
 }
 private async newAddressId(c:PoolClient){
  await c.query("SELECT pg_advisory_xact_lock(hashtext('customer_addresses'))");
  const r=await c.query<{n:number}>('SELECT coalesce(max(id),0)+1 AS n FROM customer_addresses');
  return r.rows[0].n;
 }
 async createAddress(customerId:number,body:unknown,key:string){
  id(customerId,'customer_id');
  const v=this.addressBody(body);
  return this.op('address:create:'+key,{customerId,v},async c=>{
   await this.active(c,customerId);
   const count=await c.query<{n:string}>('SELECT count(*) n FROM customer_addresses WHERE customer_id=$1 AND deleted_at IS NULL',[customerId]);
   if(Number(count.rows[0].n)>=20)throw new CustomerError('CONFLICT','Address limit reached');
   const isDefault=v.is_default||Number(count.rows[0].n)===0;
   if(isDefault)await c.query('UPDATE customer_addresses SET is_default=false WHERE customer_id=$1 AND deleted_at IS NULL AND is_default=true',[customerId]);
   const aid=await this.newAddressId(c);
   const r=await c.query(`INSERT INTO customer_addresses
    (id,customer_id,receiver_name,phone,address_line,city,district,is_default)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [aid,customerId,v.receiver_name,v.phone,v.address_line,v.city,v.district,isDefault]);
   await this.event(c,'customer.address.created.v1',{customer_id:customerId,address_id:aid});
   return r.rows[0];
  });
 }
 async updateAddress(customerId:number,addressId:number,body:unknown,expectedVersion:number,key:string){
  id(customerId,'customer_id');id(addressId,'address_id');id(expectedVersion,'expected_version');
  const v=fields(body,['receiver_name','phone','address_line','city','district']);
  if(!Object.keys(v).length)throw new CustomerError('VALIDATION_FAILED','Empty address patch');
  const patch=Object.fromEntries(Object.entries(v).map(([k,value])=>[k,text(value,k,k==='address_line'?500:k==='phone'?20:100)]));
  return this.op('address:update:'+key,{customerId,addressId,patch,expectedVersion},async c=>{
   await this.active(c,customerId);
   const values=Object.values(patch),sets=Object.keys(patch).map((k,i)=>k+'=$'+(i+3)).join(',');
   const r=await c.query('UPDATE customer_addresses SET '+sets+
    ',version=version+1,updated_at=clock_timestamp() WHERE id=$1 AND customer_id=$2 AND deleted_at IS NULL AND version=$'+
    (values.length+3)+' RETURNING *',[addressId,customerId,...values,expectedVersion]);
   if(!r.rowCount)throw new CustomerError('NOT_FOUND','Address missing or stale version');
   return r.rows[0];
  });
 }
 async defaultAddress(customerId:number,addressId:number,key:string){
  id(customerId,'customer_id');id(addressId,'address_id');
  return this.op('address:default:'+key,{customerId,addressId},async c=>{
   await this.active(c,customerId);
   const target=await c.query('SELECT 1 FROM customer_addresses WHERE id=$1 AND customer_id=$2 AND deleted_at IS NULL',[addressId,customerId]);
   if(!target.rowCount)throw new CustomerError('NOT_FOUND','Address not owned');
   await c.query('UPDATE customer_addresses SET is_default=false WHERE customer_id=$1 AND deleted_at IS NULL AND is_default',[customerId]);
   const result=await c.query(`UPDATE customer_addresses SET is_default=true,version=version+1,
    updated_at=clock_timestamp() WHERE id=$1 AND customer_id=$2 RETURNING *`,[addressId,customerId]);
   return result.rows[0];
  });
 }
 async deleteAddress(customerId:number,addressId:number,key:string){
  id(customerId,'customer_id');id(addressId,'address_id');
  return this.op('address:delete:'+key,{customerId,addressId},async c=>{
   await this.active(c,customerId);
   const prev=await c.query<{is_default:boolean;customer_id:number;deleted_at:Date|null}>(`SELECT customer_id,is_default,deleted_at
    FROM customer_addresses WHERE id=$1 FOR UPDATE`,[addressId]);
   if(!prev.rowCount||prev.rows[0].customer_id!==customerId)
    throw new CustomerError('NOT_FOUND','Address not owned');
   if(prev.rows[0].deleted_at)return {deleted:false};
   await c.query(`UPDATE customer_addresses SET deleted_at=clock_timestamp(),is_default=false,
    version=version+1 WHERE id=$1 AND customer_id=$2`,[addressId,customerId]);
   if(prev.rows[0].is_default){
    const next=await c.query<{id:number}>(`SELECT id FROM customer_addresses WHERE customer_id=$1 AND deleted_at IS NULL ORDER BY id LIMIT 1`,[customerId]);
    if(next.rowCount)await c.query('UPDATE customer_addresses SET is_default=true,version=version+1 WHERE id=$1',[next.rows[0].id]);
   }
   return {deleted:true};
  });
 }
 async shippingAddress(customerId:number,addressId:number){
  id(customerId,'customer_id');id(addressId,'address_id');
  const r=await this.db.query(`SELECT id AS address_id,customer_id,receiver_name,phone,address_line,city,district
    FROM customer_addresses WHERE id=$1 AND customer_id=$2 AND deleted_at IS NULL`,[addressId,customerId]);
  if(!r.rowCount)throw new CustomerError('NOT_FOUND','Shipping address not owned');
  return r.rows[0];
 }
 async wishlist(customerId:number,pg:unknown=1,limit:unknown=20){
  id(customerId,'customer_id');const p=page(pg,1,100000),n=page(limit,20,50);
  const r=await this.db.query(`SELECT product_id,created_at FROM customer_wishlists
   WHERE customer_id=$1 ORDER BY created_at DESC,product_id LIMIT $2 OFFSET $3`,[customerId,n,(p-1)*n]);
  return {data:r.rows,page:p,limit:n};
 }
 async wishlistAdd(customerId:number,productId:number,key:string){
  id(customerId,'customer_id');id(productId,'product_id');
  return this.op('wishlist:add:'+key,{customerId,productId},async c=>{
   await this.active(c,customerId);
   const exists=await c.query('SELECT 1 FROM customer_wishlists WHERE customer_id=$1 AND product_id=$2',[customerId,productId]);
   if(!exists.rowCount){
    const count=await c.query<{n:string}>('SELECT count(*) n FROM customer_wishlists WHERE customer_id=$1',[customerId]);
    if(Number(count.rows[0].n)>=200)throw new CustomerError('CONFLICT','Wishlist limit reached');
    await c.query('INSERT INTO customer_wishlists(customer_id,product_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[customerId,productId]);
   }
   return {customer_id:customerId,product_id:productId,added:true};
  });
 }
 async wishlistRemove(customerId:number,productId:number,key:string){
  id(customerId,'customer_id');id(productId,'product_id');
  return this.op('wishlist:remove:'+key,{customerId,productId},async c=>{
   await this.active(c,customerId);
   await c.query('DELETE FROM customer_wishlists WHERE customer_id=$1 AND product_id=$2',[customerId,productId]);
   return {customer_id:customerId,product_id:productId,removed:true};
  });
 }
 private async wallet(c:PoolClient,customerId:number){
  await this.active(c,customerId);
  await c.query('INSERT INTO loyalty_wallets(customer_id) VALUES($1) ON CONFLICT DO NOTHING',[customerId]);
  const r=await c.query<Wallet>('SELECT * FROM loyalty_wallets WHERE customer_id=$1 FOR UPDATE',[customerId]);
  return r.rows[0];
 }
 async balance(customerId:number){
  id(customerId,'customer_id');
  const r=await this.db.query<Wallet>('SELECT * FROM loyalty_wallets WHERE customer_id=$1',[customerId]);
  if(!r.rowCount)throw new CustomerError('NOT_FOUND','Wallet missing');
  const x=r.rows[0];
  return {customer_id:customerId,posted_points:x.posted_points,reserved_points:x.reserved_points,
   available_points:(BigInt(x.posted_points)-BigInt(x.reserved_points)).toString(),version:x.version};
 }
 async ledger(customerId:number,pg:unknown=1,limit:unknown=20){
  id(customerId,'customer_id');const p=page(pg,1,100000),n=page(limit,20,50);
  const r=await this.db.query(`SELECT id,entry_kind,delta_points,source_type,source_ref,reason,created_at
   FROM loyalty_ledger WHERE customer_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,
   [customerId,n,(p-1)*n]);
  return {data:r.rows,page:p,limit:n};
 }
 async hold(customerId:number,amount:number,checkoutRef:string,key:string,ttl=900){
  id(customerId,'customer_id');points(amount);text(checkoutRef,'checkout_ref');text(key,'idempotency_key');
  if(!Number.isInteger(ttl)||ttl<60||ttl>1800)
   throw new CustomerError('VALIDATION_FAILED','TTL outside 60-1800');
  const payload={customerId,amount,checkoutRef,ttl};
  return this.op('loyalty:hold:'+key,payload,async c=>{
   await this.wallet(c,customerId);
   const prior=await c.query('SELECT id FROM loyalty_holds WHERE checkout_ref=$1',[checkoutRef]);
   if(prior.rowCount)throw new CustomerError('IDEMPOTENCY_CONFLICT','Checkout hold already exists');
   const update=await c.query(`UPDATE loyalty_wallets SET reserved_points=reserved_points+$2,
     version=version+1,updated_at=clock_timestamp()
     WHERE customer_id=$1 AND posted_points-reserved_points >=$2 RETURNING customer_id`,[customerId,amount]);
   if(!update.rowCount)throw new CustomerError('INSUFFICIENT_POINTS','Not enough available points');
   const r=await c.query<Hold>(`INSERT INTO loyalty_holds
    (customer_id,checkout_ref,idempotency_key,request_hash,points,status,expires_at)
    VALUES ($1,$2,$3,$4,$5,'ACTIVE',clock_timestamp()+($6::integer*interval '1 second')) RETURNING *`,
    [customerId,checkoutRef,key,hash(payload),amount,ttl]);
   await this.event(c,'customer.loyalty.held.v1',{customer_id:customerId,hold_id:r.rows[0].id,points:amount});
   return {id:r.rows[0].id,customer_id:customerId,checkout_ref:checkoutRef,
    points:amount,status:'ACTIVE',expires_at:r.rows[0].expires_at.toISOString()};
  });
 }
 private async finalize(c:PoolClient,hold:Hold,action:'COMMITTED'|'RELEASED'|'EXPIRED'){
  // Wallet lock first provides deterministic ordering with Hold creation and awards.
  await this.wallet(c,hold.customer_id);
  const check=await c.query<Hold>('SELECT * FROM loyalty_holds WHERE id=$1 FOR UPDATE',[hold.id]);
  if(!check.rowCount)throw new CustomerError('NOT_FOUND','Hold missing');
  const now=check.rows[0];
  if(now.status!=='ACTIVE'){
   if(now.status!==action)throw new CustomerError('CONFLICT','Hold already finalized: '+now.status);
   return {id:now.id,customer_id:now.customer_id,status:now.status,points:Number(now.points)};
  }
  if(action==='COMMITTED'){
   const expired=await c.query('SELECT 1 FROM loyalty_holds WHERE id=$1 AND expires_at<=clock_timestamp()',[now.id]);
   if(expired.rowCount)throw new CustomerError('CONFLICT','Hold expired');
   const ok=await c.query(`UPDATE loyalty_wallets SET posted_points=posted_points-$2,
     reserved_points=reserved_points-$2,version=version+1,updated_at=clock_timestamp()
     WHERE customer_id=$1 AND reserved_points>=$2 AND posted_points>=$2 RETURNING customer_id`,[now.customer_id,now.points]);
   if(!ok.rowCount)throw new CustomerError('CONFLICT','Wallet is inconsistent');
   await c.query(`INSERT INTO loyalty_ledger(customer_id,entry_kind,delta_points,source_type,source_ref,reason)
    VALUES($1,'REDEEM',-$2,'ORDER',$3,'Checkout loyalty redemption')`,[now.customer_id,now.points,now.checkout_ref]);
  }else{
   const ok=await c.query(`UPDATE loyalty_wallets SET reserved_points=reserved_points-$2,version=version+1,
    updated_at=clock_timestamp() WHERE customer_id=$1 AND reserved_points>=$2 RETURNING customer_id`,[now.customer_id,now.points]);
   if(!ok.rowCount)throw new CustomerError('CONFLICT','Reserved balance inconsistent');
  }
  await c.query('UPDATE loyalty_holds SET status=$2,finalized_at=clock_timestamp() WHERE id=$1',[now.id,action]);
  await this.event(c,'customer.loyalty.'+action.toLowerCase()+'.v1',{customer_id:now.customer_id,hold_id:now.id});
  return {id:now.id,customer_id:now.customer_id,status:action,points:Number(now.points)};
 }
 async changeHold(holdId:string,action:'COMMITTED'|'RELEASED'){
  validateHoldId(holdId);
  if(!['COMMITTED','RELEASED'].includes(action))throw new CustomerError('VALIDATION_FAILED','Invalid action');
  return this.db.transaction(async c=>{
   const r=await c.query<Hold>('SELECT * FROM loyalty_holds WHERE id=$1',[holdId]);
   if(!r.rowCount)throw new CustomerError('NOT_FOUND','Hold missing');
   return this.finalize(c,r.rows[0],action);
  });
 }
 async holdStatus(holdId:string){
  text(holdId,'hold_id',36);
  const r=await this.db.query<Hold>('SELECT id,customer_id,checkout_ref,status,points,expires_at FROM loyalty_holds WHERE id=$1',[holdId]);
  if(!r.rowCount)throw new CustomerError('NOT_FOUND','Hold missing');
  return { ...r.rows[0],expires_at:r.rows[0].expires_at.toISOString()};
 }
 async expire(limit=20){
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new CustomerError('VALIDATION_FAILED','Invalid limit');
  let count=0;
  // Process in deterministic wallet/hold order, one transaction per candidate.
  const r=await this.db.query<{id:string}>(
   `SELECT id FROM loyalty_holds WHERE status='ACTIVE' AND expires_at<=clock_timestamp()
    ORDER BY expires_at,id LIMIT $1`,[limit]);
  for(const row of r.rows){
   try{
    const expired=await this.db.transaction(async c=>{
     const h=await c.query<Hold>('SELECT * FROM loyalty_holds WHERE id=$1',[row.id]);
     if(!h.rowCount||h.rows[0].status!=='ACTIVE')return false;
     const due=await c.query('SELECT 1 FROM loyalty_holds WHERE id=$1 AND expires_at<=clock_timestamp()',[row.id]);
     if(!due.rowCount)return false;
     await this.finalize(c,h.rows[0],'EXPIRED');return true;
    });
    if(expired)count++;
   }catch(e){if(!(e instanceof CustomerError&&e.code==='CONFLICT'))throw e}
  }
  return count;
 }
 /** Trusted Order/Refund/Admin internal command only. Source idempotency is enforced by the ledger. */
 async adjustPoints(customerId:number,delta:number,sourceType:'ORDER'|'REFUND'|'ADMIN',sourceRef:string,key:string,reason:string){
  id(customerId,'customer_id');text(sourceRef,'source_ref');text(reason,'reason',250);
  if(!Number.isSafeInteger(delta)||delta===0||Math.abs(delta)>1000000000)
   throw new CustomerError('VALIDATION_FAILED','Invalid adjustment');
  if(!['ORDER','REFUND','ADMIN'].includes(sourceType))throw new CustomerError('VALIDATION_FAILED','Invalid source');
  const kind=delta>0?'EARN':'ADJUSTMENT';
  return this.op('loyalty:adjust:'+key,{customerId,delta,sourceType,sourceRef,reason},async c=>{
   await this.wallet(c,customerId);
   const old=await c.query('SELECT 1 FROM loyalty_ledger WHERE source_type=$1 AND source_ref=$2 AND entry_kind=$3',
    [sourceType,sourceRef,kind]);
   if(old.rowCount)throw new CustomerError('IDEMPOTENCY_CONFLICT','Business source already applied');
   const update=await c.query(`UPDATE loyalty_wallets SET posted_points=posted_points+$2,version=version+1,
    updated_at=clock_timestamp() WHERE customer_id=$1 AND posted_points+$2 >= reserved_points AND posted_points+$2>=0
    RETURNING posted_points`,[customerId,delta]);
   if(!update.rowCount)throw new CustomerError('CONFLICT','Would undercut reserved or posted balance');
   await c.query(`INSERT INTO loyalty_ledger(customer_id,entry_kind,delta_points,source_type,source_ref,reason)
    VALUES($1,$2,$3,$4,$5,$6)`,[customerId,kind,delta,sourceType,sourceRef,reason]);
   await this.event(c,'customer.loyalty.adjusted.v1',{customer_id:customerId,source_ref:sourceRef,delta_points:delta});
   return {customer_id:customerId,posted_points:update.rows[0].posted_points};
  });
 }
}
