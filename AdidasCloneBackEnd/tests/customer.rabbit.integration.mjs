import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
const require=createRequire(import.meta.url);
const amqp=require('amqplib');
const {ClientProxyFactory,Transport}=require('@nestjs/microservices');
const {lastValueFrom,timeout}=require('rxjs');
const {COMMANDS}=require('../dist/libs/contracts/src/index.js');
const url='amqp://'+encodeURIComponent(process.env.V2_CUSTOMER_RMQ_USER)+':'+
 encodeURIComponent(process.env.V2_CUSTOMER_RMQ_PASSWORD)+'@127.0.0.1:5672';
const token=process.env.V2_CUSTOMER_INTERNAL_TOKEN;
test('Customer RabbitMQ: authorization, saga holds, idempotency and outbox event',async()=>{
 const conn=await amqp.connect(url),ch=await conn.createChannel();
 await ch.assertExchange('commerce.events','topic',{durable:true});
 const {queue}=await ch.assertQueue('',{exclusive:true,autoDelete:true});
 await ch.bindQueue(queue,'commerce.events','customer.loyalty.held.v1');
 const catalog=spawn(process.execPath,['dist/apps/catalog-service/src/main.js'],{
  env:{...process.env,V2_CATALOG_ENABLED:'true',V2_CATALOG_RMQ_ENABLED:'true',
   V2_CATALOG_RMQ_HOST:'127.0.0.1',V2_CATALOG_SEARCH_ENABLED:'false',PORT:'4103'},
  stdio:['ignore','pipe','pipe']});
 const child=spawn(process.execPath,['dist/apps/customer-service/src/main.js'],{
  env:{...process.env,V2_CUSTOMER_ENABLED:'true',V2_CUSTOMER_RMQ_ENABLED:'true',
   V2_CUSTOMER_RMQ_HOST:'127.0.0.1',PORT:'4102'},stdio:['ignore','pipe','pipe']});
 let logs='';for(const stream of [child.stdout,child.stderr,catalog.stdout,catalog.stderr])
  stream.on('data',v=>{logs+=String(v);if(logs.length>6000)logs=logs.slice(-6000)});
 let proxy;
 try{
  let started=false;
  for(let i=0;i<80;i++){
   try{const r=await fetch('http://127.0.0.1:4102/health/ready',{signal:AbortSignal.timeout(650)});
    if(r.ok){started=true;break}}catch{}
   if(child.exitCode!==null)break;
   await sleep(250);
  }
  assert.ok(started,'Customer should run real PostgreSQL/RabbitMQ: '+logs);
  let catalogReady=false;
  for(let i=0;i<80;i++){
   try{const r=await fetch('http://127.0.0.1:4103/health/ready',{signal:AbortSignal.timeout(650)});
    if(r.ok){catalogReady=true;break}}catch{}
   await sleep(250);
  }
  assert.ok(catalogReady,'Catalog must serve Wishlist product validation: '+logs);
  proxy=ClientProxyFactory.create({transport:Transport.RMQ,options:{urls:[url],
   queue:'customer.commands.q',queueOptions:{durable:true,arguments:{
    'x-dead-letter-exchange':'customer.dlx','x-dead-letter-routing-key':'customer.failed'}}}});
  await proxy.connect();
  const send=(cmd,payload,actor={kind:'system'},secret=token)=>lastValueFrom(proxy.send({cmd},{
   contract_version:1,message_id:randomUUID(),correlation_id:randomUUID(),
   occurred_at:new Date().toISOString(),actor,internal_token:secret,payload
  }).pipe(timeout(9000)));
  const a=1700000000+Math.floor(Math.random()*10000000),b=a+1;
  const provision=await send(COMMANDS.customerProfileEnsure,{customer_id:a,idempotency_key:randomUUID()});
  assert.equal(provision.ok,true);
  await send(COMMANDS.customerProfileEnsure,{customer_id:b,idempotency_key:randomUUID()});
  const noToken=await send(COMMANDS.customerProfileGet,{customer_id:a},{kind:'customer',subject_id:String(a)},'invalid');
  assert.equal(noToken.error.code,'UNAUTHORIZED');
  const other=await send(COMMANDS.customerProfileGet,{customer_id:b},{kind:'customer',subject_id:String(a)});
  assert.equal(other.error.code,'FORBIDDEN');
  const own=await send(COMMANDS.customerProfileGet,{customer_id:a},{kind:'customer',subject_id:String(a)});
  assert.equal(own.ok,true);
  const wishlistKey=randomUUID();
  const wished=await send(COMMANDS.customerWishlistAdd,{customer_id:a,product_id:1,idempotency_key:wishlistKey},
   {kind:'customer',subject_id:String(a)});
  assert.equal(wished.ok,true);
  const wishRetry=await send(COMMANDS.customerWishlistAdd,{customer_id:a,product_id:1,idempotency_key:wishlistKey},
   {kind:'customer',subject_id:String(a)});
  assert.equal(wishRetry.ok,true);
  const absent=await send(COMMANDS.customerWishlistAdd,{customer_id:a,product_id:1999999999,idempotency_key:randomUUID()},
   {kind:'customer',subject_id:String(a)});
  assert.equal(absent.error.code,'CONFLICT');
  const unauthWishlist=await send(COMMANDS.customerWishlistGet,{customer_id:a},
   {kind:'customer',subject_id:String(b)});
  assert.equal(unauthWishlist.error.code,'FORBIDDEN');
  const unauthorized=await send(COMMANDS.customerLoyaltyHoldCreate,{
   customer_id:a,points:100,checkout_ref:'x',idempotency_key:randomUUID()
  },{kind:'customer',subject_id:String(a)});
  assert.equal(unauthorized.error.code,'FORBIDDEN');
  const disabled=await send(COMMANDS.customerLoyaltyAdjust,{
   customer_id:a,delta_points:250,source_type:'ORDER',source_ref:'order:'+a,
   idempotency_key:randomUUID(),reason:'Confirmed order'
  });
  assert.equal(disabled.error.code,'FORBIDDEN');
  // Seed a disposable wallet using business domain, never production V1.
  const {CustomerDatabase}=require('../dist/apps/customer-service/src/customer/database.js');
  const {CustomerService}=require('../dist/apps/customer-service/src/customer/customer.service.js');
  const db=new CustomerDatabase();
  try{await new CustomerService(db).adjustPoints(a,500,'ORDER','rmq:seed:'+a,randomUUID(),'CI test credit')}
  finally{await db.onModuleDestroy()}
  const holdKey=randomUUID(),checkout='rmq:'+randomUUID();
  const h=await send(COMMANDS.customerLoyaltyHoldCreate,{customer_id:a,points:200,
   checkout_ref:checkout,idempotency_key:holdKey});
  assert.equal(h.ok,true);
  const repeated=await send(COMMANDS.customerLoyaltyHoldCreate,{customer_id:a,points:200,
   checkout_ref:checkout,idempotency_key:holdKey});
  assert.equal(repeated.data.id,h.data.id);
  const committed=await send(COMMANDS.customerLoyaltyHoldCommit,{hold_id:h.data.id});
  assert.equal(committed.data.status,'COMMITTED');
  const spent=await send(COMMANDS.customerLoyaltyBalanceGet,{customer_id:a},{kind:'customer',subject_id:String(a)});
  assert.equal(spent.data.posted_points,'300');assert.equal(spent.data.reserved_points,'0');
  let received=false;
  for(let i=0;i<40;i++){
   const msg=await ch.get(queue,{noAck:false});
   if(msg){
    const e=JSON.parse(msg.content.toString());ch.ack(msg);
    if(e.payload?.hold_id===h.data.id){received=true;break}
   }
   await sleep(250);
  }
  assert.ok(received,'Customer outbox should publish held event');
 }finally{
  if(proxy)await proxy.close().catch(()=>{});
  child.kill('SIGTERM');catalog.kill('SIGTERM');await sleep(750);
  if(child.exitCode===null)child.kill('SIGKILL');
  if(catalog.exitCode===null)catalog.kill('SIGKILL');
  await ch.close();await conn.close();
 }
});
