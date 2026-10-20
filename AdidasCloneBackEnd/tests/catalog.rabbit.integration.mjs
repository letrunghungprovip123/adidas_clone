import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
const require=createRequire(import.meta.url);
const pg=require('pg');
const {ClientProxyFactory,Transport}=require('@nestjs/microservices');
const {lastValueFrom,timeout}=require('rxjs');
const {COMMANDS}=require('../dist/libs/contracts/src/index.js');
const url='amqp://'+encodeURIComponent(process.env.V2_CATALOG_RMQ_USER)+':'+
 encodeURIComponent(process.env.V2_CATALOG_RMQ_PASSWORD)+'@127.0.0.1:5672';

test('Catalog/Inventory live RabbitMQ: guarded writes, provisioning and stock projections',async()=>{
 const pool=new pg.Pool({host:process.env.V2_CATALOG_DB_HOST,user:process.env.V2_CATALOG_DB_USER,
  password:process.env.V2_CATALOG_DB_PASSWORD,database:process.env.V2_CATALOG_DB_NAME});
 const invPool=new pg.Pool({host:process.env.V2_INVENTORY_DB_HOST,user:process.env.V2_INVENTORY_DB_USER,
  password:process.env.V2_INVENTORY_DB_PASSWORD,database:process.env.V2_INVENTORY_DB_NAME});
 const env={...process.env,V2_INVENTORY_DB_HOST:'127.0.0.1',V2_INVENTORY_RMQ_HOST:'127.0.0.1',
  V2_INVENTORY_ENABLED:'true',V2_INVENTORY_RMQ_ENABLED:'true'};
 const run=(cmd,vars)=>spawn(process.execPath,['dist/apps/'+cmd+'-service/src/main.js'],
  {env:{...env,...vars},stdio:['ignore','pipe','pipe']});
 const inv=run('inventory',{PORT:'4104'});
 const cat=run('catalog',{PORT:'4103',V2_CATALOG_ENABLED:'true',
  V2_CATALOG_RMQ_ENABLED:'true',V2_CATALOG_RMQ_HOST:'127.0.0.1',
  V2_CATALOG_SEARCH_ENABLED:'false'});
 let logs='';
 for(const child of [inv,cat])for(const stream of [child.stdout,child.stderr])
  stream.on('data',v=>{logs+=String(v);if(logs.length>15000)logs=logs.slice(-15000)});
 const wait=async port=>{
  for(let n=0;n<80;n++){
   try{
    const r=await fetch('http://127.0.0.1:'+port+'/health/ready',{signal:AbortSignal.timeout(700)});
    if(r.ok)return;
   }catch{}
   if(cat.exitCode!==null||inv.exitCode!==null)break;
   await sleep(250);
  }
  throw new Error('Service readiness failed '+port+': '+logs.slice(-3000));
 };
 let proxy;
 try{
  await wait(4104);await wait(4103);
  proxy=ClientProxyFactory.create({transport:Transport.RMQ,options:{urls:[url],
   queue:'catalog.commands.q',queueOptions:{durable:true,arguments:{
    'x-dead-letter-exchange':'catalog.dlx','x-dead-letter-routing-key':'catalog.failed'
   }}}});
  await proxy.connect();
  const send=(cmd,payload,actor={kind:'guest'})=>lastValueFrom(proxy.send({cmd},{
   contract_version:1,message_id:randomUUID(),correlation_id:randomUUID(),occurred_at:new Date().toISOString(),actor,payload
  }).pipe(timeout(10000)));
  const details=await send(COMMANDS.catalogProductGet,{id:1});
  assert.equal(details.ok,true);assert.equal(details.data.name,'Adidas UltraBoost 22');
  const quote=await send(COMMANDS.catalogCheckoutItemsGet,{items:[{variant_id:1,quantity:2}]});
  assert.equal(quote.ok,true);assert.equal(quote.data.subtotal_vnd,'7000000.00');
  const forbidden=await send(COMMANDS.catalogProductCreate,{data:{name:'Injected'},idempotency_key:randomUUID()},{kind:'admin'});
  assert.equal(forbidden.ok,false);assert.equal(forbidden.error.code,'FORBIDDEN');

  const variantId=850000000+Math.floor(Math.random()*150000000),sku='CAT-V2-'+randomUUID();
  await pool.query(`INSERT INTO catalog_variants(id,product_id,sku,size,color,inventory_sync_status)
    VALUES($1,1,$2,'99','CI','PENDING')`,[variantId,sku]);
  let registered=false;
  for(let i=0;i<40;i++){
   const r=await invPool.query('SELECT sku,on_hand_qty FROM inventory_stock WHERE variant_id=$1',[variantId]);
   if(r.rowCount&&r.rows[0].sku===sku){registered=true;break;}
   await sleep(250);
  }
  assert.ok(registered,'Catalog must provision missing Inventory variant via RabbitMQ');
  const registeredStatus=await pool.query('SELECT inventory_sync_status FROM catalog_variants WHERE id=$1',[variantId]);
  assert.equal(registeredStatus.rows[0].inventory_sync_status,'SYNCED');
  const {InventoryDatabase}=require('../dist/apps/inventory-service/src/inventory/database.js');
  const {InventoryService}=require('../dist/apps/inventory-service/src/inventory/inventory.service.js');
  const domainDb=new InventoryDatabase();
  try{await new InventoryService(domainDb).adjustStock(variantId,3,'ci:stock:'+variantId,'Stock synchronization test')}
  finally{await domainDb.onModuleDestroy()}
  let synced=false;
  for(let i=0;i<45;i++){
   const r=await pool.query('SELECT available_qty,stock_version FROM catalog_inventory_projection WHERE variant_id=$1',[variantId]);
   if(r.rowCount&&r.rows[0].available_qty===3){synced=true;break;}
   await sleep(250);
  }
  assert.ok(synced,'Stock change must reach Catalog projection via durable event consumer');
  console.log('PASS Catalog RabbitMQ read/quote, fail-closed admin, Inventory provisioning, versioned stock event');
 }finally{
  if(proxy)await proxy.close().catch(()=>{});
  for(const child of [cat,inv])child.kill('SIGTERM');
  await sleep(700);
  for(const child of [cat,inv])if(child.exitCode===null)child.kill('SIGKILL');
  await pool.end();await invPool.end();
 }
});
