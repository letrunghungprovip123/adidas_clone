import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryDatabase } from './database';
import { randomUUID } from 'node:crypto';
import amqp from 'amqplib';
import type { ConfirmChannel, ChannelModel } from 'amqplib';

@Injectable()
export class ExpiryWorker implements OnModuleInit,OnModuleDestroy {
  private timer?:NodeJS.Timeout;
  private busy=false;
  private readonly logger=new Logger(ExpiryWorker.name);
  constructor(private readonly svc:InventoryService){}
  onModuleInit() {
    const interval=Number(process.env.V2_INVENTORY_EXPIRY_INTERVAL_MS||'5000');
    if(!Number.isSafeInteger(interval)||interval<1000||interval>60000) throw new Error('Invalid expiry interval');
    this.timer=setInterval(()=>{void this.tick();},interval);
    this.timer.unref();
  }
  private async tick() {
    if(this.busy) return;
    this.busy=true;
    try { await this.svc.expireBatch(20); }
    catch(e) { this.logger.error('expiry worker failed: '+(e instanceof Error?e.message:'error')); }
    finally { this.busy=false; }
  }
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
}

/** At-least-once publisher. Outbox rows are locked until RabbitMQ confirms; consumers dedupe message_id. */
export class InventoryOutboxPublisher {
  private timer?: NodeJS.Timeout;
  private busy=false;
  private readonly logger=new Logger(InventoryOutboxPublisher.name);
  private constructor(private readonly db: InventoryDatabase,
    private readonly channel:ConfirmChannel,private readonly connection:ChannelModel){}
  static async start(db:InventoryDatabase,uri:string) {
    const connection=await amqp.connect(uri);
    const channel=await connection.createConfirmChannel();
    await channel.assertExchange('commerce.events','topic',{durable:true});
    await channel.assertExchange('inventory.dlx','direct',{durable:true});
    await channel.assertQueue('inventory.commands.dlq',{durable:true});
    await channel.bindQueue('inventory.commands.dlq','inventory.dlx','inventory.failed');
    const p=new InventoryOutboxPublisher(db,channel,connection);
    p.timer=setInterval(()=>{void p.tick();},1000);
    p.timer.unref();
    return p;
  }
  private async tick(){
    if(this.busy)return;
    this.busy=true;
    try{
      await this.db.transaction(async client=>{
        const r=await client.query<{id:string;topic:string;envelope:unknown}>(
          `SELECT id,topic,envelope FROM inventory_outbox
           WHERE published_at IS NULL ORDER BY created_at,id LIMIT 20 FOR UPDATE SKIP LOCKED`);
        for(const row of r.rows) {
          const wire=Buffer.from(JSON.stringify(row.envelope));
          this.channel.publish('commerce.events',row.topic,wire,{
            contentType:'application/json',persistent:true,messageId:row.id
          });
        }
        if(r.rows.length)await this.channel.waitForConfirms();
        for(const row of r.rows) {
          await client.query('UPDATE inventory_outbox SET published_at=clock_timestamp() WHERE id=$1',[row.id]);
        }
      });
    }catch(e){this.logger.error('outbox publish retry: '+(e instanceof Error?e.message:'error'))}
    finally{this.busy=false;}
  }
  async close(){if(this.timer)clearInterval(this.timer);await this.channel.close();await this.connection.close();}
}
