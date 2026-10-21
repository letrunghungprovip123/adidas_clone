import {Injectable,OnModuleDestroy} from '@nestjs/common';
import {Pool,type PoolClient,type QueryResultRow} from 'pg';
@Injectable()
export class CustomerDatabase implements OnModuleDestroy{
 readonly pool:Pool;
 constructor(){
  if(!process.env.V2_CUSTOMER_DB_HOST||!process.env.V2_CUSTOMER_DB_PASSWORD)throw new Error('Customer DB credentials missing');
  if(process.env.V2_CUSTOMER_DB_NAME!=='customer_db')throw new Error('Customer service requires isolated customer_db');
  this.pool=new Pool({host:process.env.V2_CUSTOMER_DB_HOST,port:Number(process.env.V2_CUSTOMER_DB_PORT||5432),
   user:process.env.V2_CUSTOMER_DB_USER||'v2_local',password:process.env.V2_CUSTOMER_DB_PASSWORD,
   database:'customer_db',max:10,connectionTimeoutMillis:3000,idleTimeoutMillis:30000,
   statement_timeout:7500,query_timeout:8000,application_name:'adidas-v2-customer'});
  this.pool.on('error',e=>console.error('customer database pool unavailable',e.message));
 }
 query<T extends QueryResultRow>(sql:string,args?:unknown[]){return this.pool.query<T>(sql,args)}
 async transaction<T>(f:(c:PoolClient)=>Promise<T>):Promise<T>{
  const c=await this.pool.connect();try{await c.query('BEGIN');const r=await f(c);await c.query('COMMIT');return r}
  catch(e){try{await c.query('ROLLBACK')}catch{ /* keep original error */ }throw e}
  finally{c.release()}
 }
 async ready(){await this.query('SELECT customer_id FROM customer_profiles LIMIT 1')}
 async onModuleDestroy(){await this.pool.end()}
}
