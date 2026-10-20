import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
const require=createRequire(import.meta.url);
const amqp=require('amqplib');
const {ClientProxyFactory,Transport}=require('@nestjs/microservices');
const {lastValueFrom,timeout}=require('rxjs');
const {COMMANDS}=require('../dist/libs/contracts/src/index.js');

test('Inventory RabbitMQ command and outbox path, isolated PG and broker',async()=>{
  const uri='amqp://'+encodeURIComponent(process.env.V2_INVENTORY_RMQ_USER)+
    ':'+encodeURIComponent(process.env.V2_INVENTORY_RMQ_PASSWORD)+
    '@127.0.0.1:5672';
  const connection=await amqp.connect(uri);
  const channel=await connection.createChannel();
  await channel.assertExchange('commerce.events','topic',{durable:true});
  const {queue}=await channel.assertQueue('',{exclusive:true,autoDelete:true});
  await channel.bindQueue(queue,'commerce.events','inventory.reserved.v1');
  const child=spawn(process.execPath,['dist/apps/inventory-service/src/main.js'],{
    env:{...process.env,V2_INVENTORY_ENABLED:'true',V2_INVENTORY_RMQ_ENABLED:'true',
      V2_INVENTORY_RMQ_HOST:'127.0.0.1',PORT:'4104'},stdio:['ignore','pipe','pipe']
  });
  const logs=[];
  for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>logs.push(String(chunk)));
  let proxy;
  try{
    let ready=false;
    for(let i=0;i<80;i++){
      if(child.exitCode!==null)throw new Error('Inventory process exited: '+logs.join('').slice(-1500));
      try {
        const r=await fetch('http://127.0.0.1:4104/health/ready',{signal:AbortSignal.timeout(750)});
        if(r.ok){ready=true;break;}
      }catch{}
      await sleep(250);
    }
    assert.equal(ready,true,'Inventory must boot with real PostgreSQL and RabbitMQ');
    proxy=ClientProxyFactory.create({
      transport:Transport.RMQ,options:{
        urls:[uri],queue:'inventory.commands.q',
        queueOptions:{durable:true,arguments:{
          'x-dead-letter-exchange':'inventory.dlx',
          'x-dead-letter-routing-key':'inventory.failed'
        }}
      }
    });
    await proxy.connect();

    const invalidId=200000000+Math.floor(Math.random()*400000000);
    const baseEnvelope=(payload)=>({
      contract_version:1,message_id:randomUUID(),correlation_id:randomUUID(),
      occurred_at:new Date().toISOString(),actor:{kind:'system'},payload
    });
    const invoke=(cmd,payload)=>lastValueFrom(
      proxy.send({cmd},baseEnvelope(payload)).pipe(timeout(9000))
    );
    const invalid=await invoke(COMMANDS.inventoryReservationCreate,{
      checkout_ref:'rmq:missing:'+invalidId,idempotency_key:'rmq:idempotent:'+invalidId,
      items:[{variant_id:invalidId,quantity:1}]
    });
    assert.equal(invalid.ok,false);
    assert.equal(invalid.error.code,'INSUFFICIENT_STOCK');

    // Seed one disposable V2 row over isolated database, never V1.
    const pg=require('pg');
    const pool=new pg.Pool({
      host:process.env.V2_INVENTORY_DB_HOST,
      port:Number(process.env.V2_INVENTORY_DB_PORT||5432),
      user:process.env.V2_INVENTORY_DB_USER,password:process.env.V2_INVENTORY_DB_PASSWORD,
      database:process.env.V2_INVENTORY_DB_NAME
    });
    try{
      await pool.query('INSERT INTO inventory_stock(variant_id,on_hand_qty) VALUES($1,2)',[invalidId]);
      const input={checkout_ref:'rmq:hold:'+invalidId,idempotency_key:'rmq:once:'+invalidId,
        items:[{variant_id:invalidId,quantity:1}]};
      const hold=await invoke(COMMANDS.inventoryReservationCreate,input);
      assert.equal(hold.ok,true);
      assert.equal(hold.data.status,'ACTIVE');
      const retry=await invoke(COMMANDS.inventoryReservationCreate,input);
      assert.equal(retry.ok,true);
      assert.equal(retry.data.id,hold.data.id);

      const committed=await invoke(COMMANDS.inventoryReservationCommit,{reservation_id:hold.data.id});
      assert.equal(committed.ok,true);
      assert.equal(committed.data.status,'COMMITTED');
      const repeated=await invoke(COMMANDS.inventoryReservationCommit,{reservation_id:hold.data.id});
      assert.equal(repeated.data.status,'COMMITTED');
      const stock=await pool.query('SELECT on_hand_qty,reserved_qty FROM inventory_stock WHERE variant_id=$1',[invalidId]);
      assert.equal(stock.rows[0].on_hand_qty,1);
      assert.equal(stock.rows[0].reserved_qty,0);
      let received;
      for(let i=0;i<40;i++){
        const m=await channel.get(queue,{noAck:false});
        if(m){
          const data=JSON.parse(m.content.toString());
          channel.ack(m);
          if(data.payload?.reservation_id===hold.data.id){received=data;break;}
        }
        await sleep(250);
      }
      assert.ok(received,'Outbox event must reach RabbitMQ topic exchange');
      assert.equal(received.contract_version,1);
      console.log('PASS real RMQ: reserve, idempotency, commit, error envelope, outbox event');
    }finally{await pool.end();}
  }finally{
    try{if(proxy)await proxy.close();}catch{}
    child.kill('SIGTERM');
    await Promise.race([new Promise(resolve=>child.once('exit',resolve)),sleep(1500)]);
    if(child.exitCode===null)child.kill('SIGKILL');
    await channel.close();
    await connection.close();
  }
});
