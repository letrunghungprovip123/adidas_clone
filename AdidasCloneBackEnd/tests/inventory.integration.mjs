import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {InventoryDatabase}=require('../dist/apps/inventory-service/src/inventory/database.js');
const {InventoryService}=require('../dist/apps/inventory-service/src/inventory/inventory.service.js');

test('Inventory domain: real PostgreSQL transactional and concurrency gates', async t=>{
  const db=new InventoryDatabase();
  const inv=new InventoryService(db);
  t.after(()=>db.onModuleDestroy());
  const seed=100000000+Math.floor(Math.random()*600000000);
  let next=seed;
  async function stock(count){
    const id=next++;
    await db.query('INSERT INTO inventory_stock(variant_id,on_hand_qty) VALUES($1,$2)',[id,count]);
    return id;
  }
  function req(checkout,items,additional={}){
    return {checkout_ref:checkout,idempotency_key:'idem:'+checkout,items, ...additional};
  }
  async function row(id){
    const r=await db.query('SELECT on_hand_qty,reserved_qty FROM inventory_stock WHERE variant_id=$1',[id]);
    return r.rows[0];
  }
  const rejectCode=code=>err=>err?.code===code;
  await t.test('Reserve atomic across multiple variants and rollback when one is insufficient',async()=>{
    const a=await stock(4),b=await stock(0);
    await assert.rejects(inv.reserve(req('atomic:'+a,[{variant_id:a,quantity:2},{variant_id:b,quantity:1}])),
      rejectCode('INSUFFICIENT_STOCK'));
    assert.deepEqual(await row(a),{on_hand_qty:4,reserved_qty:0});
    const checked=await db.query('SELECT count(*)::integer AS c FROM inventory_reservations WHERE checkout_ref=$1',['atomic:'+a]);
    assert.equal(checked.rows[0].c,0);
  });
  await t.test('Repeated Reserve returns original; changed payload or key conflicts',async()=>{
    const id=await stock(5);
    const request=req('retry:'+id,[{variant_id:id,quantity:2}]);
    const first=await inv.reserve(request);
    const second=await inv.reserve(request);
    assert.equal(first.id,second.id);
    assert.deepEqual(await row(id),{on_hand_qty:5,reserved_qty:2});
    await assert.rejects(inv.reserve({...request,items:[{variant_id:id,quantity:3}]}),
      rejectCode('IDEMPOTENCY_CONFLICT'));
    await assert.rejects(inv.reserve({...request,idempotency_key:'different:key'}),rejectCode('IDEMPOTENCY_CONFLICT'));
    const movements=await db.query('SELECT count(*)::integer AS c FROM inventory_stock_movements WHERE reservation_id=$1',[first.id]);
    assert.equal(movements.rows[0].c,1);
    assert.equal((await inv.status(first.id)).status,'ACTIVE');
  });
  await t.test('Fifty concurrent buyers competing for final item yield exactly one success',async()=>{
    const id=await stock(1);
    const results=await Promise.allSettled(Array.from({length:50},(_,i)=>
      inv.reserve(req('race:'+id+':'+i,[{variant_id:id,quantity:1}]))));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.filter(r=>r.status==='rejected'&&r.reason?.code==='INSUFFICIENT_STOCK').length,49,
      JSON.stringify(results.filter(r=>r.status==='rejected').map(r=>r.reason?.message)));
    assert.deepEqual(await row(id),{on_hand_qty:1,reserved_qty:1});
  });
  await t.test('Commit consumes one physical unit once; opposite action conflicts',async()=>{
    const id=await stock(6);
    const hold=await inv.reserve(req('commit:'+id,[{variant_id:id,quantity:3}]));
    assert.equal((await inv.changeReservation(hold.id,'COMMITTED')).status,'COMMITTED');
    assert.equal((await inv.changeReservation(hold.id,'COMMITTED')).status,'COMMITTED');
    assert.deepEqual(await row(id),{on_hand_qty:3,reserved_qty:0});
    await assert.rejects(inv.changeReservation(hold.id,'RELEASED'),rejectCode('CONFLICT'));
  });
  await t.test('Release twice returns stock exactly once',async()=>{
    const id=await stock(7);
    const hold=await inv.reserve(req('release:'+id,[{variant_id:id,quantity:2}]));
    assert.equal((await inv.changeReservation(hold.id,'RELEASED')).status,'RELEASED');
    assert.equal((await inv.changeReservation(hold.id,'RELEASED')).status,'RELEASED');
    assert.deepEqual(await row(id),{on_hand_qty:7,reserved_qty:0});
  });
  await t.test('Expired reservation commits cannot succeed; expiry persists and releases stock',async()=>{
    const id=await stock(2);
    const hold=await inv.reserve(req('expired:'+id,[{variant_id:id,quantity:2}]));
    await db.query("UPDATE inventory_reservations SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[hold.id]);
    await assert.rejects(inv.changeReservation(hold.id,'COMMITTED'),rejectCode('CONFLICT'));
    assert.equal((await inv.status(hold.id)).status,'EXPIRED');
    assert.deepEqual(await row(id),{on_hand_qty:2,reserved_qty:0});
  });
  await t.test('Background expiration worker reclaims all expired stock',async()=>{
    const id=await stock(3);
    const hold=await inv.reserve(req('worker:'+id,[{variant_id:id,quantity:3}]));
    await db.query("UPDATE inventory_reservations SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[hold.id]);
    assert.ok((await inv.expireBatch(10))>=1);
    assert.equal((await inv.status(hold.id)).status,'EXPIRED');
    assert.deepEqual(await row(id),{on_hand_qty:3,reserved_qty:0});
  });
  await t.test('Commit vs expiry can only finalize one way, with conserved stock',async()=>{
    const id=await stock(4);
    const hold=await inv.reserve(req('compete:'+id,[{variant_id:id,quantity:1}]));
    await db.query("UPDATE inventory_reservations SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[hold.id]);
    const results=await Promise.allSettled([inv.changeReservation(hold.id,'COMMITTED'),inv.expireBatch(10)]);
    assert.ok(results.length===2);
    const final=await inv.status(hold.id);
    assert.equal(final.status,'EXPIRED');
    assert.deepEqual(await row(id),{on_hand_qty:4,reserved_qty:0});
  });
  await t.test('Adjustments preserve holds, audit and idempotency',async()=>{
    const id=await stock(5);
    const hold=await inv.reserve(req('adjust:'+id,[{variant_id:id,quantity:3}]));
    await assert.rejects(inv.adjustStock(id,-3,'stock:forbidden:'+id,'Admin correction'),rejectCode('CONFLICT'));
    const r=await inv.adjustStock(id,-2,'stock:change:'+id,'Admin correction');
    assert.equal(r.available_qty,0);
    const same=await inv.adjustStock(id,-2,'stock:change:'+id,'Admin correction');
    assert.deepEqual(same,r);
    await assert.rejects(inv.adjustStock(id,1,'stock:change:'+id,'different input'),rejectCode('IDEMPOTENCY_CONFLICT'));
    assert.deepEqual(await row(id),{on_hand_qty:3,reserved_qty:3});
    await inv.changeReservation(hold.id,'RELEASED');
    assert.equal((await inv.availability(id)).available_qty,3);
  });
  await t.test('Event outbox is committed with reservation, with versioned envelope',async()=>{
    const id=await stock(2);
    const hold=await inv.reserve(req('outbox:'+id,[{variant_id:id,quantity:1}]));
    const rows=await db.query(
      "SELECT topic,envelope FROM inventory_outbox WHERE topic='inventory.reserved.v1' AND envelope->'payload'->>'reservation_id'=$1",[hold.id]);
    assert.equal(rows.rowCount,1);
    assert.equal(rows.rows[0].envelope.contract_version,1);
    assert.ok(rows.rows[0].envelope.message_id);
  });
  await t.test('Reject malicious or malformed inventory requests',async()=>{
    await assert.rejects(inv.reserve(req('bad:negative',[{variant_id:1,quantity:-1}])),rejectCode('VALIDATION_FAILED'));
    await assert.rejects(inv.changeReservation('not-a-uuid','COMMITTED'),rejectCode('VALIDATION_FAILED'));
    await assert.rejects(inv.adjustStock(1,0,'test:key','reason'),rejectCode('VALIDATION_FAILED'));
  });
});
