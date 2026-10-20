import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url);
const {CatalogDatabase}=require('../dist/apps/catalog-service/src/catalog/database.js');
const {CatalogService}=require('../dist/apps/catalog-service/src/catalog/catalog.service.js');
const {CatalogInventoryBridge}=require('../dist/apps/catalog-service/src/catalog/integration.js');
const {CatalogMediaReviewsAI}=require('../dist/apps/catalog-service/src/catalog/media-reviews-ai.js');
const {CatalogSearch}=require('../dist/apps/catalog-service/src/catalog/search.js');

test('Catalog V2 migration, business and NFR: real PostgreSQL',async t=>{
 const db=new CatalogDatabase(),catalog=new CatalogService(db);
 t.after(()=>db.onModuleDestroy());
 const code=e=>err=>err?.code===e;
 const key=()=>randomUUID();
 await t.test('Seed uses immutable original IDs and domain relationships',async()=>{
  const r=await db.query(`SELECT
   (SELECT count(*)::integer FROM catalog_categories) c,
   (SELECT count(*)::integer FROM catalog_products) p,
   (SELECT count(*)::integer FROM catalog_variants) v,
   (SELECT count(*)::integer FROM catalog_product_images) i,
   (SELECT count(*)::integer FROM catalog_reviews) r`);
  assert.deepEqual(r.rows[0],{c:11,p:85,v:489,i:93,r:5});
  const product=await catalog.detail(1);
  assert.equal(product.name,'Adidas UltraBoost 22');
  assert.ok(product.variants.some(v=>v.id===1));
  assert.equal(product.status,'PUBLISHED');
  assert.equal(product.base_price_vnd,'3500000.00');
 });
 await t.test('Quote is authoritative, ignores client prices, validates variant state',async()=>{
  const quote=await catalog.quote([{variant_id:1,quantity:2}]);
  assert.equal(quote.items[0].unit_price_vnd,'3500000.00');
  assert.equal(quote.subtotal_vnd,'7000000.00');
  await assert.rejects(catalog.quote([{variant_id:1,quantity:1,unit_price_vnd:1}]),code('VALIDATION_FAILED'));
  await assert.rejects(catalog.quote([{variant_id:999999,quantity:1}]),code('NOT_FOUND'));
 });
 let draft;
 await t.test('Create draft and idempotent retry without duplicated products',async()=>{
  const input={name:'New V2 Trail Runner',slug:'v2-trail-'+key(),base_price_vnd:1200000,
   category_id:1,gender:'Men',attributes:{material:'mesh'}};
  const k=key();
  draft=await catalog.create(input,k);
  const retry=await catalog.create(input,k);
  assert.equal(draft.id,retry.id);
  assert.equal(draft.status,'DRAFT');
  assert.equal(draft.gender,'MEN');
  await assert.rejects(catalog.create({...input,name:'Conflicting payload'},k),code('IDEMPOTENCY_CONFLICT'));
  await assert.rejects(catalog.create({...input,stock:500},key()),code('VALIDATION_FAILED'));
  await assert.rejects(catalog.transition(draft.id,'PUBLISHED',1,key()),code('CONFLICT'));
 });
 let variant;
 await t.test('Variant starts pending Inventory registration and SKU must be unique',async()=>{
  variant=await catalog.createVariant({product_id:draft.id,sku:'V2-TRAIL-'+key(),size:'41',color:'Blue'},key());
  assert.equal(variant.inventory_sync_status,'PENDING');
  await assert.rejects(catalog.transition(draft.id,'PUBLISHED',1,key()),code('CONFLICT'));
  await assert.rejects(catalog.createVariant({product_id:draft.id,sku:variant.sku,size:'42',color:'Blue'},key()));
  await db.query("UPDATE catalog_variants SET inventory_sync_status='SYNCED' WHERE id=$1",[variant.id]);
  const published=await catalog.transition(draft.id,'PUBLISHED',1,key());
  assert.equal(published.status,'PUBLISHED');
  assert.equal(Number(published.version),2);
 });
 await t.test('Version protects concurrent edits and unauthorized fields',async()=>{
  await assert.rejects(catalog.update(draft.id,{name:'Out of date'},1,key()),code('CONFLICT'));
  await assert.rejects(catalog.update(draft.id,{reserved_qty:999},2,key()),code('VALIDATION_FAILED'));
  const changed=await catalog.update(draft.id,{name:'V2 Trail Runner Updated'},2,key());
  assert.equal(Number(changed.version),3);
 });
 await t.test('Price updates create history; retry is idempotent',async()=>{
  const k=key();
  const p=await catalog.priceChange(draft.id,1100000,3,k,'admin:ci','Seasonal change');
  assert.equal(Number(p.version),4);
  const repeated=await catalog.priceChange(draft.id,1100000,3,k,'admin:ci','Seasonal change');
  assert.equal(repeated.version,p.version);
  const history=await catalog.priceHistory(draft.id);
  assert.equal(history.length,1);
  assert.equal(Number(history[0].old_price_vnd),1200000);
  assert.equal(Number(history[0].new_price_vnd),1100000);
 });
 await t.test('Reviews imported as legacy, no public writes without verification',async()=>{
  const reviews=await catalog.reviews(71);
  assert.ok(reviews.data.length>0);
  const ai=new CatalogMediaReviewsAI(db,catalog);
  await assert.rejects(ai.createReview(71,23,5,'Great',false),code('FORBIDDEN'));
  const suggestion=await ai.suggestions(1);
  assert.equal(suggestion.source,'catalog');
  assert.ok(Array.isArray(suggestion.recommendations));
  assert.throws(()=>ai.signedUpload(1),code('DEPENDENCY_UNAVAILABLE'));
 });
 await t.test('Stock inbox applies only monotonic versions and deduplicates event IDs',async()=>{
  const bridge=new CatalogInventoryBridge(db,'unused://broker');
  const message=(version,available,status='ACTIVE')=>({
   contract_version:1,message_id:randomUUID(),
   payload:{variant_id:variant.id,on_hand_qty:10,reserved_qty:10-available,
    available_qty:status==='ACTIVE'?available:0,stock_version:version,status}
  });
  const newest=message(40,7);
  await bridge.receiveStock('inventory.stock-changed.v1',newest);
  await bridge.receiveStock('inventory.stock-changed.v1',newest);
  await bridge.receiveStock('inventory.stock-changed.v1',message(39,2));
  let result=await db.query('SELECT available_qty,stock_version FROM catalog_inventory_projection WHERE variant_id=$1',[variant.id]);
  assert.equal(result.rows[0].available_qty,7);
  assert.equal(Number(result.rows[0].stock_version),40);
  await bridge.receiveStock('inventory.stock-changed.v1',message(41,7,'DISABLED'));
  result=await db.query('SELECT available_qty,stock_status FROM catalog_inventory_projection WHERE variant_id=$1',[variant.id]);
  assert.equal(result.rows[0].available_qty,0);
  assert.equal(result.rows[0].stock_status,'DISABLED');
 });
 await t.test('SQL search fallback returns product when Elasticsearch unavailable',async()=>{
  const search=new CatalogSearch(db,'http://127.0.0.1:1');
  const result=await search.search({q:'UltraBoost',limit:12,page:1});
  assert.equal(result.meta.source,'postgres_fallback');
  assert.ok(result.data.some(p=>p.id===1));
  const wrongGender=await search.search({q:'UltraBoost',gender:'WOMEN'});
  assert.equal(wrongGender.data.some(p=>p.id===1),false);
  const abovePrice=await search.search({q:'UltraBoost',price_min:'100000000000.00'});
  assert.equal(abovePrice.data.length,0);
  const noStock=await search.search({q:'UltraBoost',in_stock:true});
  assert.equal(noStock.data.length,0);
  await assert.rejects(search.search({q:'UltraBoost',in_stock:'invalid'}),code('VALIDATION_FAILED'));
 });
 await t.test('Archive retains historical records and refuses checkout quote',async()=>{
  const old=await catalog.detail(draft.id);
  const archived=await catalog.transition(draft.id,'ARCHIVED',Number(old.version),key());
  assert.equal(archived.status,'ARCHIVED');
  await assert.rejects(catalog.quote([{variant_id:variant.id,quantity:1}]),code('CONFLICT'));
  await assert.rejects(catalog.update(draft.id,{name:'Returned'},Number(archived.version),key()),code('CONFLICT'));
 });
});
