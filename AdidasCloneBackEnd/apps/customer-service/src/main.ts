import 'reflect-metadata';
import {ConsoleLogger} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {Transport} from '@nestjs/microservices';
import {AppModule} from './app.module';
import {readPort} from '../../../libs/config/src';
import {CustomerDatabase} from './customer/database';
import {CustomerOutbox} from './customer/workers';
async function bootstrap(){
 const app=await NestFactory.create(AppModule,{logger:new ConsoleLogger({json:true})});
 const active=process.env.V2_CUSTOMER_ENABLED==='true';
 const rmq=process.env.V2_CUSTOMER_RMQ_ENABLED==='true';
 if(rmq&&!active)throw new Error('Customer broker requires active domain');
 let outbox:CustomerOutbox|undefined;
 if(active)await app.get(CustomerDatabase).ready();
 if(rmq){
  if((process.env.V2_CUSTOMER_INTERNAL_TOKEN||'').length<32)throw new Error('Customer internal token of at least 32 characters is required');
  const user=process.env.V2_CUSTOMER_RMQ_USER,password=process.env.V2_CUSTOMER_RMQ_PASSWORD;
  if(!user||!password)throw new Error('Customer RabbitMQ credentials missing');
  const uri='amqp://'+encodeURIComponent(user)+':'+encodeURIComponent(password)+'@'+
   (process.env.V2_CUSTOMER_RMQ_HOST||'rabbitmq')+':5672';
  outbox=await CustomerOutbox.start(app.get(CustomerDatabase),uri);
  app.connectMicroservice({transport:Transport.RMQ,options:{
   urls:[uri],queue:'customer.commands.q',queueOptions:{durable:true,arguments:{
    'x-dead-letter-exchange':'customer.dlx','x-dead-letter-routing-key':'customer.failed'
   }},noAck:false,prefetchCount:10
  }});
  await app.startAllMicroservices();
 }
 app.enableShutdownHooks();
 await app.listen(readPort(process.env.PORT, 4102),'0.0.0.0');
 if(outbox)process.once('SIGTERM',()=>{void outbox?.close().catch(()=>undefined)});
}
void bootstrap().catch(e=>{console.error('Customer bootstrap failure: '+(e instanceof Error?e.message:'error'));process.exitCode=1});
