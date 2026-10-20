import 'reflect-metadata';
import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { readPort } from '../../../libs/config/src';
import { InventoryDatabase } from './inventory/database';
import { InventoryOutboxPublisher } from './inventory/workers';

function amqpUrl():string {
  const username=process.env.V2_INVENTORY_RMQ_USER;
  const password=process.env.V2_INVENTORY_RMQ_PASSWORD;
  const host=process.env.V2_INVENTORY_RMQ_HOST||'rabbitmq';
  if(!username||!password)throw new Error('RabbitMQ credentials required');
  return 'amqp://'+encodeURIComponent(username)+':'+encodeURIComponent(password)+'@'+host+':5672';
}
async function bootstrap(){
  const app=await NestFactory.create(AppModule,{logger:new ConsoleLogger({json:true})});
  const active=process.env.V2_INVENTORY_ENABLED==='true';
  const rmq=process.env.V2_INVENTORY_RMQ_ENABLED==='true';
  if(rmq&&!active)throw new Error('RabbitMQ requires V2_INVENTORY_ENABLED=true');
  let publisher:InventoryOutboxPublisher|undefined;
  if(rmq) {
    const url=amqpUrl();
    const db=app.get(InventoryDatabase);
    await db.ready();
    publisher=await InventoryOutboxPublisher.start(db,url);
    app.connectMicroservice({
      transport:Transport.RMQ,
      options:{
        urls:[url],queue:'inventory.commands.q',queueOptions:{
          durable:true,arguments:{'x-dead-letter-exchange':'inventory.dlx','x-dead-letter-routing-key':'inventory.failed'}
        },noAck:false,prefetchCount:10
      }
    });
    await app.startAllMicroservices();
  }
  app.enableShutdownHooks();
  const server=await app.listen(readPort(process.env.PORT,4104),'0.0.0.0');
  if(publisher){
    const cleanup=()=>{void publisher.close().catch(()=>undefined)};
    process.once('SIGTERM',cleanup);
    process.once('SIGINT',cleanup);
  }
  return server;
}
void bootstrap().catch(e=>{console.error('inventory bootstrap failed: '+(e instanceof Error?e.message:'unknown'));process.exitCode=1});
