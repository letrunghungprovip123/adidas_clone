import { Injectable,OnModuleDestroy } from '@nestjs/common';
import {Pool,type PoolClient,type QueryResultRow} from 'pg';
@Injectable()
export class CatalogDatabase implements OnModuleDestroy {
 readonly pool:Pool;
 constructor(){
  const host=process.env.V2_CATALOG_DB_HOST,password=process.env.V2_CATALOG_DB_PASSWORD;
  if(!host||!password)throw new Error('V2 Catalog PostgreSQL credentials required');
  this.pool=new Pool({host,port:Number(process.env.V2_CATALOG_DB_PORT||5432),
   user:process.env.V2_CATALOG_DB_USER||'v2_local',password,
   database:process.env.V2_CATALOG_DB_NAME||'catalog_db',
   max:10,connectionTimeoutMillis:3000,idleTimeoutMillis:30000,
   query_timeout:8000,statement_timeout:7500,application_name:'adidas-v2-catalog'});
  this.pool.on('error',e=>console.error('catalog.pool.error',e.message));
 }
 query<T extends QueryResultRow>(sql:string,args?:unknown[]){return this.pool.query<T>(sql,args)}
 async transaction<T>(fn:(c:PoolClient)=>Promise<T>):Promise<T>{
  const c=await this.pool.connect();
  try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result}
  catch(e){try{await c.query('ROLLBACK')}catch{ /* original error takes precedence */ }throw e}finally{c.release()}
 }
 async ready(){await this.pool.query('SELECT id FROM catalog_products LIMIT 1')}
 async onModuleDestroy(){await this.pool.end()}
}
