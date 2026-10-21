import {readFileSync} from 'node:fs';
import pg from 'pg';
if(process.env.V2_CUSTOMER_DB_NAME!=='customer_db'||!process.env.V2_CUSTOMER_DB_HOST||
 !process.env.V2_CUSTOMER_DB_PASSWORD)throw new Error('Only isolated V2 customer_db allowed');
const pool=new pg.Pool({host:process.env.V2_CUSTOMER_DB_HOST,
 port:Number(process.env.V2_CUSTOMER_DB_PORT||5432),user:process.env.V2_CUSTOMER_DB_USER||'v2_local',
 password:process.env.V2_CUSTOMER_DB_PASSWORD,database:'customer_db',connectionTimeoutMillis:3000});
try{
 await pool.query(readFileSync('apps/customer-service/migrations/001_customer.sql','utf8'));
 console.log('PASS Customer migration');
}catch(e){console.error(e);process.exitCode=1}
finally{await pool.end()}
