import 'reflect-metadata';
import {ConsoleLogger} from '@nestjs/common';
import {NestFactory} from '@nestjs/core';
import {Transport} from '@nestjs/microservices';
import {AppModule} from './app.module';
import {readPort} from '../../../libs/config/src';
import {CatalogDatabase} from './catalog/database';
import {CatalogInventoryBridge} from './catalog/integration';
import {CatalogSearch} from './catalog/search';
function brokerUrl(){
 const user=process.env.V2_CATALOG_RMQ_USER,password=process.env.V2_CATALOG_RMQ_PASSWORD;
 if(!user||!password)throw new Error('Missing V2 Catalog RabbitMQ credentials');
 return 'amqp://'+encodeURIComponent(user)+':'+encodeURIComponent(password)+'@'+
  (process.env.V2_CATALOG_RMQ_HOST||'rabbitmq')+':5672';
}
async function bootstrap(){
 const app=await NestFactory.create(AppModule,{logger:new ConsoleLogger({json:true})});
 const active=process.env.V2_CATALOG_ENABLED==='true';
 const rmq=process.env.V2_CATALOG_RMQ_ENABLED==='true';
 if(rmq&&!active)throw new Error('Catalog RabbitMQ requires enabled Catalog');
 let bridge:CatalogInventoryBridge|undefined;
 if(active)await app.get(CatalogDatabase).ready();
 if(rmq){
  const url=brokerUrl();
  app.connectMicroservice({
   transport:Transport.RMQ,options:{urls:[url],queue:'catalog.commands.q',
    queueOptions:{durable:true,arguments:{'x-dead-letter-exchange':'catalog.dlx',
     'x-dead-letter-routing-key':'catalog.failed'}},noAck:false,prefetchCount:10}
  });
  await app.startAllMicroservices();
 }
 app.enableShutdownHooks();
 await app.listen(readPort(process.env.PORT, 4103),'0.0.0.0');
 if(rmq){
  bridge=new CatalogInventoryBridge(app.get(CatalogDatabase),brokerUrl());
  try{await bridge.start()}catch(e){console.error('Catalog integration will retry next restart: '+(e instanceof Error?e.message:'error'))}
 }
 if(active&&process.env.V2_CATALOG_SEARCH_ENABLED==='true'){
  try{await app.get(CatalogSearch).start()}catch(e){console.error('Catalog ES disabled until available: '+(e instanceof Error?e.message:'error'))}
 }
 if(bridge)process.once('SIGTERM',()=>{void bridge?.close().catch(()=>undefined)});
}
void bootstrap().catch(e=>{console.error('Catalog boot failed: '+(e instanceof Error?e.message:'unknown'));process.exitCode=1});
