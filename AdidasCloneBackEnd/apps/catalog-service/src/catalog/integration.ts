import {Logger} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import {ClientProxyFactory,Transport} from '@nestjs/microservices';
import {lastValueFrom,timeout} from 'rxjs';
import amqp from 'amqplib';
import type {ChannelModel,ConfirmChannel,Channel,ConsumeMessage} from 'amqplib';
import {COMMANDS} from '../../../../libs/contracts/src';
import {CatalogDatabase} from './database';
type StockPayload={variant_id:number;on_hand_qty:number;reserved_qty:number;
 available_qty:number;stock_version:number;status:'ACTIVE'|'DISABLED'};
type Envelope={message_id:string;contract_version:number;payload:StockPayload};
export class CatalogInventoryBridge {
 private readonly logger=new Logger('CatalogInventoryBridge');
 private client?:ReturnType<typeof ClientProxyFactory.create>;
 private conn?:ChannelModel; private channel?:ConfirmChannel; private consumer?:Channel;
 private timer?:NodeJS.Timeout;private busy=false;private round=0;
 constructor(private readonly db:CatalogDatabase,private readonly uri:string){}
 private async command(cmd:string,payload:Record<string,unknown>){
  if(!this.client)throw new Error('Catalog Inventory transport disconnected');
  const message={contract_version:1,message_id:randomUUID(),correlation_id:randomUUID(),
    occurred_at:new Date().toISOString(),actor:{kind:'system'},payload};
  const result=await lastValueFrom(this.client.send({cmd},message).pipe(timeout(5000)));
  if(!result?.ok)throw new Error('Inventory command failed: '+(result?.error?.code??'unknown'));
  return result.data;
 }
 async receiveStock(topic:string,event:Envelope){
  if(topic!=='inventory.stock-changed.v1'||event.contract_version!==1||
    !/^[0-9a-f-]{36}$/i.test(String(event.message_id)))throw new Error('Invalid inventory stock event');
  const v=event.payload;
  if(!v||!Number.isSafeInteger(v.variant_id)||v.variant_id<1||
    !Number.isSafeInteger(v.stock_version)||v.stock_version<0||
    !Number.isSafeInteger(v.on_hand_qty)||!Number.isSafeInteger(v.reserved_qty)||
    !Number.isSafeInteger(v.available_qty)||!['ACTIVE','DISABLED'].includes(v.status))
     throw new Error('Invalid stock event body');
  await this.db.transaction(async c=>{
   const record=await c.query('INSERT INTO catalog_inbox(message_id,topic) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING message_id',[event.message_id,topic]);
   if(!record.rowCount)return;
   const changed=await c.query(
    `INSERT INTO catalog_inventory_projection
     (variant_id,on_hand_qty,reserved_qty,available_qty,stock_status,stock_version)
     VALUES($1,$2,$3,$4,$5,$6)
     ON CONFLICT(variant_id) DO UPDATE SET
       on_hand_qty=excluded.on_hand_qty,reserved_qty=excluded.reserved_qty,
       available_qty=excluded.available_qty,stock_status=excluded.stock_status,
       stock_version=excluded.stock_version,updated_at=clock_timestamp()
     WHERE catalog_inventory_projection.stock_version < excluded.stock_version
     RETURNING variant_id`,
    [v.variant_id,v.on_hand_qty,v.reserved_qty,v.available_qty,v.status,v.stock_version]);
   if(changed.rowCount){
    await c.query(`UPDATE catalog_search_sync_state SET indexed_version=-1
     WHERE product_id=(SELECT product_id FROM catalog_variants WHERE id=$1)`,[v.variant_id]);
   }
  });
 }
 async start(){
  this.client=ClientProxyFactory.create({transport:Transport.RMQ,options:{
   urls:[this.uri],queue:'inventory.commands.q',
   queueOptions:{durable:true,arguments:{
    'x-dead-letter-exchange':'inventory.dlx','x-dead-letter-routing-key':'inventory.failed'
   }}
  }});
  this.conn=await amqp.connect(this.uri);
  this.channel=await this.conn.createConfirmChannel();
  await this.channel.assertExchange('commerce.events','topic',{durable:true});
  await this.channel.assertExchange('catalog.dlx','direct',{durable:true});
  await this.channel.assertQueue('catalog.events.dlq',{durable:true});
  await this.channel.bindQueue('catalog.events.dlq','catalog.dlx','catalog.failed');
  this.consumer=await this.conn.createChannel();
  await this.consumer.assertQueue('catalog.inventory-stock.q',{durable:true,arguments:{
   'x-dead-letter-exchange':'catalog.dlx','x-dead-letter-routing-key':'catalog.failed'
  }});
  await this.consumer.bindQueue('catalog.inventory-stock.q','commerce.events','inventory.stock-changed.v1');
  await this.consumer.prefetch(10);
  await this.consumer.consume('catalog.inventory-stock.q',m=>{void this.dispatch(m)},{noAck:false});
  this.timer=setInterval(()=>{void this.tick()},2000);this.timer.unref();
  this.logger.log('Catalog stock projection, outbox and provisioning workers started');
 }
 private async dispatch(m:ConsumeMessage|null){
  if(!m||!this.consumer)return;
  try{
   const data=JSON.parse(m.content.toString()) as Envelope;
   await this.receiveStock(m.fields.routingKey,data);
   this.consumer.ack(m);
  }catch(e){
   this.logger.error('Catalog stock event sent to DLQ: '+(e instanceof Error?e.message:'unknown'));
   this.consumer.nack(m,false,false);
  }
 }
 private async tick(){
  if(this.busy||!this.channel)return;
  this.busy=true;
  try{
   // Send pending events only after RabbitMQ publisher confirms.
   await this.db.transaction(async c=>{
    const rows=await c.query<{id:string;topic:string;envelope:unknown}>(
     `SELECT id,topic,envelope FROM catalog_outbox WHERE published_at IS NULL
      ORDER BY created_at,id LIMIT 25 FOR UPDATE SKIP LOCKED`);
    for(const v of rows.rows)this.channel!.publish('commerce.events',v.topic,
     Buffer.from(JSON.stringify(v.envelope)),{persistent:true,contentType:'application/json',messageId:v.id});
    if(rows.rowCount)await this.channel!.waitForConfirms();
    for(const v of rows.rows)await c.query('UPDATE catalog_outbox SET published_at=clock_timestamp() WHERE id=$1',[v.id]);
   });
   await this.provision(10);
   await this.reconcile(15);
  }catch(e){this.logger.warn('Catalog integration retry: '+(e instanceof Error?e.message:'error'))}
  finally{this.busy=false}
 }
 async provision(limit=10){
  const rs=await this.db.query<{id:number;sku:string;version:string;status:string;product_status:string}>(
   `SELECT v.id,v.sku,v.version,v.status,p.status AS product_status
    FROM catalog_variants v JOIN catalog_products p ON p.id=v.product_id
    WHERE v.inventory_sync_status<>'SYNCED' OR v.inventory_status_synced_version<v.version
    ORDER BY v.created_at DESC,v.id ASC LIMIT $1`,[limit]);
  for(const v of rs.rows){
   try{
    await this.command(COMMANDS.inventoryVariantEnsure,{variant_id:v.id,sku:v.sku});
    const status=v.status==='ACTIVE'&&v.product_status==='PUBLISHED'?'ACTIVE':'DISABLED';
    await this.command(COMMANDS.inventoryVariantSetStatus,{variant_id:v.id,status});
    await this.db.query(`UPDATE catalog_variants SET inventory_sync_status='SYNCED',
      inventory_status_synced_version=$2
     WHERE id=$1 AND version=$2`,[v.id,v.version]);
   }catch{
    this.logger.warn('Variant registration/status propagation retry '+v.id);
   }
  }
 }
 /** Bounded ongoing reconciliation, independent of event delivery. */
 async reconcile(limit=15){
  const offset=this.round*limit;
  const variants=await this.db.query<{id:number}>(
   'SELECT id FROM catalog_variants ORDER BY id LIMIT $1 OFFSET $2',[limit,offset]);
  this.round=variants.rows.length<limit?0:this.round+1;
  for(const v of variants.rows){
   try{
    const result=await this.command(COMMANDS.inventoryAvailabilityGet,{variant_id:v.id});
    if(!Number.isSafeInteger(Number(result.stock_version)))continue;
    await this.receiveStock('inventory.stock-changed.v1',{
      message_id:randomUUID(),contract_version:1,payload:{
       variant_id:v.id,on_hand_qty:result.on_hand_qty,reserved_qty:result.reserved_qty,
       available_qty:result.available_qty,stock_version:Number(result.stock_version),status:result.status
      }
    });
   }catch{ /* Future reconciliation rounds retry independently. */ }
  }
 }
 async close(){
  if(this.timer)clearInterval(this.timer);
  await this.client?.close();
  await this.consumer?.close();
  await this.channel?.close();
  await this.conn?.close();
 }
}
