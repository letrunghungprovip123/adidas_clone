import {Injectable,Logger,OnModuleInit,OnModuleDestroy} from '@nestjs/common';
import amqp from 'amqplib';
import type {ConfirmChannel,ChannelModel} from 'amqplib';
import {CustomerService} from './customer.service';
import {CustomerDatabase} from './database';
@Injectable()
export class LoyaltyExpiryWorker implements OnModuleInit,OnModuleDestroy{
 private timer?:NodeJS.Timeout;private busy=false;
 private readonly log=new Logger(LoyaltyExpiryWorker.name);
 constructor(private readonly svc:CustomerService){}
 onModuleInit(){if(process.env.V2_CUSTOMER_ENABLED!=='true')return;
  this.timer=setInterval(()=>{void this.tick()},5000);this.timer.unref();
 }
 private async tick(){if(this.busy)return;this.busy=true;
  try{await this.svc.expire(20)}catch{this.log.error('Loyalty expiry retry scheduled')}
  finally{this.busy=false}
 }
 onModuleDestroy(){if(this.timer)clearInterval(this.timer)}
}
export class CustomerOutbox{
 private timer?:NodeJS.Timeout;private busy=false;
 private readonly log=new Logger(CustomerOutbox.name);
 private constructor(private readonly db:CustomerDatabase,
  private readonly conn:ChannelModel,private readonly ch:ConfirmChannel){}
 static async start(db:CustomerDatabase,uri:string){
  const conn=await amqp.connect(uri);
  const ch=await conn.createConfirmChannel();
  await ch.assertExchange('commerce.events','topic',{durable:true});
  await ch.assertExchange('customer.dlx','direct',{durable:true});
  await ch.assertQueue('customer.commands.dlq',{durable:true});
  await ch.bindQueue('customer.commands.dlq','customer.dlx','customer.failed');
  const w=new CustomerOutbox(db,conn,ch);
  w.timer=setInterval(()=>{void w.tick()},1000);w.timer.unref();
  return w;
 }
 private async tick(){
  if(this.busy)return;this.busy=true;
  try{await this.db.transaction(async c=>{
   const r=await c.query<{id:string;topic:string;envelope:unknown}>(`SELECT id,topic,envelope
    FROM customer_outbox WHERE published_at IS NULL ORDER BY created_at,id LIMIT 20 FOR UPDATE SKIP LOCKED`);
   for(const row of r.rows)this.ch.publish('commerce.events',row.topic,
    Buffer.from(JSON.stringify(row.envelope)),{persistent:true,contentType:'application/json',messageId:row.id});
   if(r.rowCount)await this.ch.waitForConfirms();
   for(const row of r.rows)await c.query('UPDATE customer_outbox SET published_at=clock_timestamp() WHERE id=$1',[row.id]);
  })}catch{this.log.warn('Customer outbox publisher will retry')}
  finally{this.busy=false}
 }
 async close(){if(this.timer)clearInterval(this.timer);await this.ch.close();await this.conn.close()}
}
