import {Controller,Get,Logger,ServiceUnavailableException} from '@nestjs/common';
import {Ctx,MessagePattern,Payload,RmqContext,ClientProxyFactory,Transport} from '@nestjs/microservices';
import {lastValueFrom,timeout} from 'rxjs';
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {COMMANDS} from '../../../../libs/contracts/src';
import {CustomerService} from './customer.service';
import {CustomerDatabase} from './database';
import {CustomerError,id} from './validation';
type Actor={kind:'customer'|'admin'|'system'|'guest';subject_id?:string};
type Envelope={contract_version:number;actor:Actor;payload:Record<string,unknown>;
 internal_token?:string;correlation_id?:string};
@Controller('health')
export class CustomerHealthController{
 constructor(private readonly db:CustomerDatabase){}
 @Get('live')live(){return{status:'ok'}}
 @Get('ready')async ready(){
  try{await this.db.ready();return{status:'ok',info:{postgres:{status:'up'}}}}
  catch{throw new ServiceUnavailableException('Customer PostgreSQL unavailable')}
 }
}
@Controller()
export class CustomerRmqController{
 private readonly logger=new Logger(CustomerRmqController.name);
 constructor(private readonly svc:CustomerService){}
 private authenticated(env:Envelope,privileged:boolean,customerId?:number){
  const expected=process.env.V2_CUSTOMER_INTERNAL_TOKEN||'';
  const actual=typeof env?.internal_token==='string'?env.internal_token:'';
  if(expected.length<32||actual.length!==expected.length||
    !timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))
    throw new CustomerError('UNAUTHORIZED','Trusted internal transport required');
  if(!env.actor||!['customer','admin','system'].includes(env.actor.kind))
    throw new CustomerError('FORBIDDEN','Actor unavailable');
  if(privileged){
   if(env.actor.kind!=='system')throw new CustomerError('FORBIDDEN','Internal saga/identity service required');
  }else if(env.actor.kind==='customer'){
   if(customerId===undefined||env.actor.subject_id!==String(customerId))
    throw new CustomerError('FORBIDDEN','Customer cannot access another account');
  }else if(env.actor.kind!=='system'){
   throw new CustomerError('FORBIDDEN','Customer or internal service required');
  }
 }
 private async handle(ctx:RmqContext,payload:unknown,privileged:boolean,
  fn:(v:Record<string,unknown>)=>Promise<unknown>,target='customer_id'){
  const ch=ctx.getChannelRef(),message=ctx.getMessage();
  try{
   const env=payload as Envelope;
   if(!env||env.contract_version!==1||!env.payload||typeof env.payload!=='object'||Array.isArray(env.payload))
    throw new CustomerError('VALIDATION_FAILED','Versioned envelope and object payload required');
   let customerId:number|undefined;
   if(target==='customer_id')customerId=id(env.payload.customer_id,'customer_id');
   this.authenticated(env,privileged,customerId);
   const result=await fn(env.payload);
   ch.ack(message);
   return {ok:true,data:result,correlation_id:env.correlation_id??null};
  }catch(e){
   if(e instanceof CustomerError){
    ch.ack(message);return{ok:false,error:{code:e.code,message:e.message}};
   }
   this.logger.error('Unexpected Customer processing failure; moved to DLQ');
   ch.nack(message,false,false);
   return {ok:false,error:{code:'DEPENDENCY_UNAVAILABLE',message:'Customer service unavailable'}};
  }
 }
 @MessagePattern({cmd:COMMANDS.customerProfileGet})
 profile(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,false,x=>this.svc.profile(x.customer_id as number));
 }
 @MessagePattern({cmd:COMMANDS.customerProfileEnsure})
 ensure(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,true,x=>this.svc.ensureProfile(x.customer_id as number,x.idempotency_key as string));
 }
 @MessagePattern({cmd:COMMANDS.customerProfileUpdate})
 update(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,false,x=>this.svc.updateProfile(x.customer_id as number,x.data,x.expected_version as number,x.idempotency_key as string));
 }
 @MessagePattern({cmd:COMMANDS.customerAddressList})
 addresses(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,false,x=>this.svc.addresses(x.customer_id as number));
 }
 @MessagePattern({cmd:COMMANDS.customerAddressCreate})
 createAddress(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,false,x=>this.svc.createAddress(x.customer_id as number,x.data,x.idempotency_key as string));
 }
 @MessagePattern({cmd:COMMANDS.customerAddressUpdate})
 updateAddress(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,false,x=>this.svc.updateAddress(x.customer_id as number,x.address_id as number,
   x.data,x.expected_version as number,x.idempotency_key as string));
 }
 @MessagePattern({cmd:COMMANDS.customerAddressDefault})
 default(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,false,x=>this.svc.defaultAddress(x.customer_id as number,x.address_id as number,x.idempotency_key as string));
 }
 @MessagePattern({cmd:COMMANDS.customerAddressDelete})
 delete(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,false,x=>this.svc.deleteAddress(x.customer_id as number,x.address_id as number,x.idempotency_key as string));
 }
 @MessagePattern({cmd:COMMANDS.customerShippingAddressGet})
 shipping(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,false,x=>this.svc.shippingAddress(x.customer_id as number,x.address_id as number));
 }
 @MessagePattern({cmd:COMMANDS.customerWishlistGet})
 wishlist(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,false,x=>this.svc.wishlist(x.customer_id as number,x.page,x.limit));
 }
 @MessagePattern({cmd:COMMANDS.customerWishlistAdd})
 wishlistAdd(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,false,async x=>{
   // Catalog is authoritative for saleable products. Never query catalog_db directly.
   const user=process.env.V2_CUSTOMER_RMQ_USER,password=process.env.V2_CUSTOMER_RMQ_PASSWORD;
   if(!user||!password)throw new Error('Catalog client broker credentials required');
   const url='amqp://'+encodeURIComponent(user)+':'+encodeURIComponent(password)+'@'+
    (process.env.V2_CUSTOMER_RMQ_HOST||'rabbitmq')+':5672';
   const client=ClientProxyFactory.create({transport:Transport.RMQ,options:{urls:[url],
    queue:'catalog.commands.q',queueOptions:{durable:true,arguments:{
     'x-dead-letter-exchange':'catalog.dlx','x-dead-letter-routing-key':'catalog.failed'
    }}}});
   try{
    const product=await lastValueFrom(client.send({cmd:COMMANDS.catalogProductGet},{
     contract_version:1,message_id:randomUUID(),correlation_id:randomUUID(),
     occurred_at:new Date().toISOString(),actor:{kind:'system'},payload:{id:x.product_id}
    }).pipe(timeout(3500)));
    if(!product?.ok||product.data?.status!=='PUBLISHED')
     throw new CustomerError('CONFLICT','Product is not published');
   }finally{await client.close()}
   return this.svc.wishlistAdd(x.customer_id as number,x.product_id as number,x.idempotency_key as string);
  });
 }
 @MessagePattern({cmd:COMMANDS.customerWishlistRemove})
 wishlistRemove(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,false,x=>this.svc.wishlistRemove(x.customer_id as number,x.product_id as number,x.idempotency_key as string));
 }
 @MessagePattern({cmd:COMMANDS.customerLoyaltyBalanceGet})
 balance(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,false,x=>this.svc.balance(x.customer_id as number));
 }
 @MessagePattern({cmd:COMMANDS.customerLoyaltyLedgerGet})
 ledger(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,false,x=>this.svc.ledger(x.customer_id as number,x.page,x.limit));
 }
 @MessagePattern({cmd:COMMANDS.customerLoyaltyHoldCreate})
 hold(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,true,x=>this.svc.hold(x.customer_id as number,x.points as number,
   x.checkout_ref as string,x.idempotency_key as string,x.ttl_seconds as number|undefined));
 }
 @MessagePattern({cmd:COMMANDS.customerLoyaltyHoldCommit})
 commit(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,true,x=>this.svc.changeHold(x.hold_id as string,'COMMITTED'),'none');
 }
 @MessagePattern({cmd:COMMANDS.customerLoyaltyHoldRelease})
 release(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,true,x=>this.svc.changeHold(x.hold_id as string,'RELEASED'),'none');
 }
 @MessagePattern({cmd:COMMANDS.customerLoyaltyHoldStatusGet})
 status(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,true,x=>this.svc.holdStatus(x.hold_id as string),'none');
 }
 @MessagePattern({cmd:COMMANDS.customerLoyaltyAdjust})
 adjust(@Payload() p:unknown,@Ctx() c:RmqContext){
  return this.handle(c,p,true,x=>{
   if(process.env.V2_CUSTOMER_REWARDS_ENABLED!=='true')
    throw new CustomerError('FORBIDDEN','Rewards mutations disabled pending Order/Identity integration');
   return this.svc.adjustPoints(x.customer_id as number,x.delta_points as number,
    x.source_type as 'ORDER'|'REFUND'|'ADMIN',x.source_ref as string,x.idempotency_key as string,x.reason as string);
  });
 }
}
