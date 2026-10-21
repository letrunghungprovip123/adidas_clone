import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url);
const {CustomerDatabase}=require('../dist/apps/customer-service/src/customer/database.js');
const {CustomerService}=require('../dist/apps/customer-service/src/customer/customer.service.js');
const key=()=>randomUUID();
const code=x=>e=>e?.code===x;
test('Customer P4: V1 seed reconciliation and isolated transactional domains',async t=>{
 const db=new CustomerDatabase(),svc=new CustomerService(db);
 t.after(()=>db.onModuleDestroy());
 const count=await db.query(`SELECT (SELECT count(*)::integer FROM customer_profiles) profiles,
  (SELECT count(*)::integer FROM customer_addresses) addresses,
  (SELECT count(*)::integer FROM customer_seed_loyalty_rows) legacy_loyalty,
  (SELECT count(*)::integer FROM customer_wishlists) wishlists,
  (SELECT count(*)::integer FROM loyalty_wallets) wallets`);
 assert.deepEqual(count.rows[0],{profiles:19,addresses:20,legacy_loyalty:7,wishlists:1,wallets:5});
 const reconciled=await db.query(`SELECT
  (SELECT coalesce(sum(points),0)::bigint FROM customer_seed_loyalty_rows) old,
  (SELECT coalesce(sum(delta_points),0)::bigint FROM loyalty_ledger WHERE entry_kind='OPENING') ledger,
  (SELECT coalesce(sum(posted_points),0)::bigint FROM loyalty_wallets) wallet`);
 assert.equal(reconciled.rows[0].old,reconciled.rows[0].ledger);
 assert.equal(reconciled.rows[0].old,reconciled.rows[0].wallet);
 const u=1300000000+Math.floor(Math.random()*10000000),other=u+1;
 await svc.ensureProfile(u,key());await svc.ensureProfile(other,key());
 await t.test('Profile versioning, safe input and idempotency',async()=>{
  const k=key();
  const p=await svc.updateProfile(u,{display_name:'Customer P4'},1,k);
  assert.equal(p.version,'2');
  const retry=await svc.updateProfile(u,{display_name:'Customer P4'},1,k);
  assert.equal(retry.version,p.version);
  await assert.rejects(svc.updateProfile(u,{display_name:'Old change'},1,key()),code('CONFLICT'));
  await assert.rejects(svc.updateProfile(u,{password_hash:'unsafe'},2,key()),code('VALIDATION_FAILED'));
 });
 let addr;
 await t.test('Address owner isolation, default switching and soft delete',async()=>{
  addr=await svc.createAddress(u,{receiver_name:'Test',phone:'0987654321',address_line:'Test street',
   city:'Ho Chi Minh',district:'1'},key());
  assert.equal(addr.is_default,true);
  const second=await svc.createAddress(u,{receiver_name:'Test 2',phone:'0987654321',address_line:'Next street',
   city:'Ho Chi Minh',district:'1'},key());
  await assert.rejects(svc.shippingAddress(other,addr.id),code('NOT_FOUND'));
  await assert.rejects(svc.updateAddress(other,addr.id,{city:'Changed'},1,key()),code('NOT_FOUND'));
  await assert.rejects(svc.deleteAddress(other,addr.id,key()),code('NOT_FOUND'));
  await Promise.all([svc.defaultAddress(u,addr.id,key()),svc.defaultAddress(u,second.id,key())]);
  const addresses=await svc.addresses(u);
  assert.equal(addresses.filter(a=>a.is_default).length,1);
  await svc.deleteAddress(u,addresses.find(a=>a.is_default).id,key());
  assert.equal((await svc.addresses(u)).filter(a=>a.is_default).length,1);
 });
 await t.test('Wishlist is retry-safe and bounded',async()=>{
  const k=key();
  const a=await svc.wishlistAdd(u,1,k);
  const b=await svc.wishlistAdd(u,1,k);
  assert.deepEqual(a,b);
  assert.equal((await svc.wishlist(u)).data.filter(x=>x.product_id===1).length,1);
  await svc.wishlistRemove(u,1,key());await svc.wishlistRemove(u,1,key());
  assert.equal((await svc.wishlist(u)).data.length,0);
 });
 await t.test('Atomic 100 competing holds, 10 success, no negative balance',async()=>{
  await svc.adjustPoints(u,1000,'ORDER','ci:opening:'+u,key(),'Test credit');
  const attempts=await Promise.allSettled(Array.from({length:100},(_,i)=>
   svc.hold(u,100,'concurrent:'+u+':'+i,key(),900)));
  const ok=attempts.filter(a=>a.status==='fulfilled');
  const rejected=attempts.filter(a=>a.status==='rejected');
  assert.equal(ok.length,10);assert.equal(rejected.length,90);
  assert.ok(rejected.every(x=>x.reason?.code==='INSUFFICIENT_POINTS'));
  const balance=await svc.balance(u);
  assert.equal(balance.posted_points,'1000');
  assert.equal(balance.reserved_points,'1000');
  assert.equal(balance.available_points,'0');
  const h=ok[0].value;
  const committed=await Promise.all([svc.changeHold(h.id,'COMMITTED'),svc.changeHold(h.id,'COMMITTED')]);
  assert.equal(committed[0].status,'COMMITTED');
  assert.equal(committed[1].status,'COMMITTED');
  await assert.rejects(svc.changeHold(h.id,'RELEASED'),code('CONFLICT'));
  for(const x of ok.slice(1))await svc.changeHold(x.value.id,'RELEASED');
  const b=await svc.balance(u);
  assert.equal(b.posted_points,'900');assert.equal(b.reserved_points,'0');
  const ledger=await svc.ledger(u);
  assert.equal(ledger.data.filter(x=>x.entry_kind==='REDEEM').length,1);
 });
 await t.test('Expires holds and refuses late Commit, races reconcile safely',async()=>{
  const hold=await svc.hold(u,200,'expiring:'+key(),key());
  await db.query("UPDATE loyalty_holds SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[hold.id]);
  await assert.rejects(svc.changeHold(hold.id,'COMMITTED'),code('CONFLICT'));
  assert.ok(await svc.expire(100)>=1);
  const status=await svc.holdStatus(hold.id);
  assert.equal(status.status,'EXPIRED');
  assert.equal((await svc.balance(u)).reserved_points,'0');
  await assert.rejects(svc.changeHold(hold.id,'RELEASED'),code('CONFLICT'));
 });
 await t.test('Source idempotency rejects double award and undercutting wallet',async()=>{
  const ref='earn:'+key();const k=key();
  const one=await svc.adjustPoints(u,25,'ORDER',ref,k,'Paid order');
  const same=await svc.adjustPoints(u,25,'ORDER',ref,k,'Paid order');
  assert.deepEqual(one,same);
  await assert.rejects(svc.adjustPoints(u,25,'ORDER',ref,key(),'Paid order'),code('IDEMPOTENCY_CONFLICT'));
  await assert.rejects(svc.adjustPoints(u,-2000,'ADMIN','deny:'+key(),key(),'Excessive debit'),code('CONFLICT'));
  const balance=await svc.balance(u);assert.equal(balance.posted_points,'925');
 });
});
