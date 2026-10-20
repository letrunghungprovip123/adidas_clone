import {Controller,Logger} from '@nestjs/common';
import {Ctx,MessagePattern,Payload,RmqContext} from '@nestjs/microservices';
import {COMMANDS} from '../../../../libs/contracts/src';
import {CatalogService} from './catalog.service';
import {CatalogMediaReviewsAI} from './media-reviews-ai';
import {CatalogSearch} from './search';
import {CatalogError} from './catalog.types';

type Envelope={contract_version:number;actor?:{kind:string;subject_id?:string};
 payload?:Record<string,unknown>;admin_token?:string;correlation_id?:string};
@Controller()
export class CatalogRmqController {
 private readonly log=new Logger(CatalogRmqController.name);
 constructor(private readonly catalog:CatalogService,
  private readonly media:CatalogMediaReviewsAI,private readonly search:CatalogSearch){}
 private async run(context:RmqContext,input:unknown,write:boolean,fn:(p:Record<string,any>)=>Promise<unknown>){
  const channel=context.getChannelRef(),message=context.getMessage();
  try{
   const env=input as Envelope;
   if(!env||env.contract_version!==1||!env.payload||typeof env.payload!=='object'||Array.isArray(env.payload))
    throw new CatalogError('VALIDATION_FAILED','Expected versioned Catalog envelope');
   if(write){
    const secret=process.env.V2_CATALOG_WRITE_TOKEN;
    if(process.env.V2_CATALOG_WRITES_ENABLED!=='true'||!secret||secret.length<24||
      env.admin_token!==secret||env.actor?.kind!=='admin')
     throw new CatalogError('FORBIDDEN','Catalog admin write authorization required');
   }
   const data=await fn(env.payload);
   channel.ack(message);
   return {ok:true,data,correlation_id:env.correlation_id??null};
  }catch(e){
   if(e instanceof CatalogError){
    channel.ack(message);
    return {ok:false,error:{code:e.code,message:e.message}};
   }
   this.log.error('Catalog transient error to DLQ: '+(e instanceof Error?e.message:'unknown'));
   channel.nack(message,false,false);
   return {ok:false,error:{code:'DEPENDENCY_UNAVAILABLE',message:'Catalog dependency failed'}};
  }
 }
 @MessagePattern({cmd:COMMANDS.catalogProductGet})
 detail(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,false,p=>this.catalog.detail(p.id));
 }
 @MessagePattern({cmd:COMMANDS.catalogProductList})
 list(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,false,p=>this.catalog.list(p));
 }
 @MessagePattern({cmd:COMMANDS.catalogProductSearch})
 searchProducts(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,false,p=>this.search.search(p));
 }
 @MessagePattern({cmd:COMMANDS.catalogCategoriesGet})
 categories(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,false,()=>this.catalog.categories());
 }
 @MessagePattern({cmd:COMMANDS.catalogReviewsGet})
 reviews(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,false,p=>this.catalog.reviews(p.product_id,p.page,p.limit));
 }
 @MessagePattern({cmd:COMMANDS.catalogCheckoutItemsGet})
 checkoutItems(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,false,p=>this.catalog.quote(p.items));
 }
 @MessagePattern({cmd:COMMANDS.catalogProductCreate})
 create(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,true,p=>this.catalog.create(p.data,p.idempotency_key));
 }
 @MessagePattern({cmd:COMMANDS.catalogProductUpdate})
 update(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,true,p=>this.catalog.update(p.id,p.data,p.expected_version,p.idempotency_key));
 }
 @MessagePattern({cmd:COMMANDS.catalogPriceChange})
 price(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,true,p=>this.catalog.priceChange(p.id,p.price_vnd,p.expected_version,
   p.idempotency_key,p.actor_id,p.reason));
 }
 @MessagePattern({cmd:COMMANDS.catalogProductTransition})
 transition(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,true,p=>this.catalog.transition(p.id,p.status,p.expected_version,p.idempotency_key));
 }
 @MessagePattern({cmd:COMMANDS.catalogVariantCreate})
 variant(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,true,p=>this.catalog.createVariant(p.data,p.idempotency_key));
 }
 @MessagePattern({cmd:COMMANDS.catalogVariantUpdate})
 variantUpdate(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,true,p=>this.catalog.updateVariant(p.id,p.data,p.idempotency_key));
 }
 @MessagePattern({cmd:COMMANDS.catalogVariantStatus})
 variantStatus(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,true,p=>this.catalog.variantStatus(p.id,p.status,p.idempotency_key));
 }
 @MessagePattern({cmd:COMMANDS.catalogCategoryCreate})
 categoryCreate(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,true,p=>this.catalog.createCategory(p.data,p.idempotency_key));
 }
 @MessagePattern({cmd:COMMANDS.catalogCategoryStatus})
 categoryStatus(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,true,p=>this.catalog.categoryStatus(p.id,p.status,p.idempotency_key));
 }
 @MessagePattern({cmd:COMMANDS.catalogMediaSign})
 sign(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,true,async p=>this.media.signedUpload(p.product_id));
 }
 @MessagePattern({cmd:COMMANDS.catalogMediaConfirm})
 confirm(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,true,p=>this.media.confirmImage(p.product_id,p.public_id,p.alt_text??'',p.idempotency_key));
 }
 @MessagePattern({cmd:COMMANDS.catalogAiSuggest})
 ai(@Payload() v:unknown,@Ctx() c:RmqContext){
  return this.run(c,v,false,p=>this.media.suggestions(p.product_id));
 }
}
