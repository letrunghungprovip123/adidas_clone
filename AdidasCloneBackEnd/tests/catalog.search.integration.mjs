import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {setTimeout as sleep} from 'node:timers/promises';
const require=createRequire(import.meta.url);
const {CatalogDatabase}=require('../dist/apps/catalog-service/src/catalog/database.js');
const {CatalogService}=require('../dist/apps/catalog-service/src/catalog/catalog.service.js');
const {CatalogSearch}=require('../dist/apps/catalog-service/src/catalog/search.js');
const endpoint=process.env.V2_CATALOG_ES_URL||'http://127.0.0.1:9200';

test('Catalog Elasticsearch index, version changes, search, archive and alias rebuild',async t=>{
 const db=new CatalogDatabase(),catalog=new CatalogService(db),search=new CatalogSearch(db,endpoint);
 t.after(()=>db.onModuleDestroy());
 await search.ensureIndex();
 const marker='phase3-es-'+randomUUID().slice(0,8);
 const p=await catalog.create({name:'Catalog '+marker+' Running Shoe',slug:marker,
  category_id:1,base_price_vnd:990000,gender:'Unisex'},randomUUID());
 const v=await catalog.createVariant({product_id:p.id,sku:'CI-'+marker,size:'42',color:'Blue'},randomUUID());
 await db.query("UPDATE catalog_variants SET inventory_sync_status='SYNCED' WHERE id=$1",[v.id]);
 const published=await catalog.transition(p.id,'PUBLISHED',1,randomUUID());
 assert.equal(published.status,'PUBLISHED');
 for(let i=0;i<15;i++){const n=await search.syncBatch(100);if(!n)break;}
 await sleep(1200);
 const res=await search.search({q:marker,page:1,limit:10});
 assert.equal(res.meta.source,'elasticsearch');
 assert.ok(res.data.some(x=>x.id===p.id),'Search should expose published product');
 const previous=Number(published.version);
 const priced=await catalog.priceChange(p.id,880000,previous,randomUUID(),'admin:ci','Test price update');
 await search.syncBatch(100);
 const indexed=await (await fetch(endpoint+'/catalog-products-read/_doc/'+p.id)).json();
 assert.equal(indexed._source.price_vnd,880000);
 const archived=await catalog.transition(p.id,'ARCHIVED',Number(priced.version),randomUUID());
 assert.equal(archived.status,'ARCHIVED');
 await search.syncBatch(100);
 const gone=await fetch(endpoint+'/catalog-products-read/_doc/'+p.id);
 assert.equal(gone.status,404);
 const rebuilt=await search.rebuild();
 assert.ok(rebuilt.count>=85);
 assert.ok(rebuilt.index.startsWith('catalog_products_v'));
 const alias=await (await fetch(endpoint+'/_alias/catalog-products-read')).json();
 assert.ok(Object.keys(alias).includes(rebuilt.index));
 console.log('PASS Elasticsearch index, search, changed prices, archive and atomic alias reindex');
});
