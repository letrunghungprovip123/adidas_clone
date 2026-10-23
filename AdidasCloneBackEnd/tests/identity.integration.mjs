import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
import {once} from 'node:events';
import {randomUUID,createPublicKey,verify} from 'node:crypto';
import pg from 'pg';

const {Pool}=pg;
const identityBase='http://127.0.0.1:4111';
const identityPool=new Pool({
  host:process.env.V2_IDENTITY_DB_HOST,port:Number(process.env.V2_IDENTITY_DB_PORT||5432),
  user:process.env.V2_IDENTITY_DB_USER||'v2_local',password:process.env.V2_IDENTITY_DB_PASSWORD,
  database:'identity_db',connectionTimeoutMillis:3000
});
const customerPool=new Pool({
  host:process.env.V2_CUSTOMER_DB_HOST,port:Number(process.env.V2_CUSTOMER_DB_PORT||5432),
  user:process.env.V2_CUSTOMER_DB_USER||'v2_local',password:process.env.V2_CUSTOMER_DB_PASSWORD,
  database:'customer_db',connectionTimeoutMillis:3000
});

function startApp(script,env,logs) {
  const child=spawn(process.execPath,[script],{env:{...process.env,...env},stdio:['ignore','pipe','pipe']});
  for(const stream of [child.stdout,child.stderr]) stream.on('data',chunk=>{
    logs.value=(logs.value+String(chunk)).slice(-12000);
  });
  return child;
}
async function waitReady(url,child,logs,label) {
  for(let i=0;i<100;i++){
    if(child.exitCode!==null) throw new Error(label+' exited before readiness: '+logs.value);
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(800)});
      if(response.ok)return;
    } catch {}
    await sleep(200);
  }
  throw new Error(label+' readiness timeout: '+logs.value);
}
async function request(path,body,token) {
  return fetch(identityBase+path,{
    method:body===undefined?'GET':'POST',
    headers:{...(body===undefined?{}:{'content-type':'application/json'}),
      ...(token?{authorization:'Bearer '+token}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
    signal:AbortSignal.timeout(12000)
  });
}
async function payload(response) {
  return response.json();
}
async function stopChild(child) {
  if(child.exitCode!==null||child.signalCode!==null)return;
  const exit=once(child,'exit').catch(()=>undefined);
  child.kill('SIGTERM');
  await Promise.race([exit,sleep(1500).then(()=>undefined)]);
  if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');
}

test('Identity P5: secure account lifecycle, RS256, rotation/replay, one-time challenges and Customer provisioning',
async t=>{
  const customerLogs={value:''},identityLogs={value:''};
  const commonBroker={
    V2_CUSTOMER_ENABLED:'true',V2_CUSTOMER_RMQ_ENABLED:'true',
    V2_CUSTOMER_RMQ_HOST:'127.0.0.1',PORT:'4102'
  };
  const customer=startApp('dist/apps/customer-service/src/main.js',commonBroker,customerLogs);
  let identity;
  try {
    await waitReady('http://127.0.0.1:4102/health/ready',customer,customerLogs,'Customer');
    identity=startApp('dist/apps/identity-service/src/main.js',{
      V2_IDENTITY_ENABLED:'true',V2_IDENTITY_RMQ_ENABLED:'true',
      V2_IDENTITY_EXPOSE_TEST_TOKENS:'true',PORT:'4111'
    },identityLogs);
    await waitReady(identityBase+'/health/ready',identity,identityLogs,'Identity');

    const badOverpost=await request('/api/v1/auth/register',{
      email:'overpost-'+randomUUID()+'@example.com',
      password:'LongEnough$Password123',
      roles:['ADMIN'],status:'ACTIVE'
    });
    assert.equal(badOverpost.status,400,'Unknown privileged fields must be rejected');

    const email='identity-'+randomUUID()+'@example.com';
    const originalPassword='Secure$OriginalPassword123';
    const register=await request('/api/v1/auth/register',{email,password:originalPassword});
    assert.equal(register.status,201,'Identity register should return 201; '+identityLogs.value);
    const created=await payload(register);
    assert.equal(created.account.email,email);
    assert.deepEqual(created.account.roles,['CUSTOMER'],'public registration cannot grant ADMIN');
    assert.equal(created.account.email_verified,false);
    assert.equal(created.account.customer_provisioned,true);
    assert.ok(created.access_token&&created.refresh_token&&created.verification_token);

    const profile=await customerPool.query(
      'SELECT customer_id FROM customer_profiles WHERE customer_id=$1',[created.account.id]);
    assert.equal(profile.rowCount,1,'Identity should provision the Customer profile through RabbitMQ');

    const jwksResponse=await request('/.well-known/jwks.json');
    assert.equal(jwksResponse.status,200);
    const jwks=await payload(jwksResponse);
    assert.equal(jwks.keys.length,1);
    assert.equal(jwks.keys[0].alg,'RS256');
    assert.equal(jwks.keys[0].use,'sig');
    const parts=created.access_token.split('.');
    assert.equal(parts.length,3);
    const publicPem=Buffer.from(process.env.V2_IDENTITY_JWT_PUBLIC_KEY_B64,'base64').toString('utf8');
    assert.ok(verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),
      createPublicKey(publicPem),Buffer.from(parts[2],'base64url')),'access token uses a valid RS256 signature');

    const me=await request('/api/v1/auth/me',undefined,created.access_token);
    assert.equal(me.status,200);
    assert.equal((await payload(me)).account.id,created.account.id);
    const invalidMe=await request('/api/v1/auth/me',undefined,created.access_token.slice(0,-3)+'bad');
    assert.equal(invalidMe.status,401);

    const verifyEmail=await request('/api/v1/auth/email-verification/confirm',{
      token:created.verification_token
    });
    assert.equal(verifyEmail.status,200);
    const reusedVerification=await request('/api/v1/auth/email-verification/confirm',{
      token:created.verification_token
    });
    assert.equal(reusedVerification.status,400,'email challenge is single-use');

    const rotate=await request('/api/v1/auth/refresh',{refresh_token:created.refresh_token});
    assert.equal(rotate.status,200);
    const rotated=await payload(rotate);
    assert.notEqual(rotated.refresh_token,created.refresh_token);
    const replay=await request('/api/v1/auth/refresh',{refresh_token:created.refresh_token});
    assert.equal(replay.status,401,'reuse of a rotated refresh token is rejected');
    const revokedFamily=await request('/api/v1/auth/refresh',{refresh_token:rotated.refresh_token});
    assert.equal(revokedFamily.status,401,'refresh token replay revokes the complete family');

    const resetRequest=await request('/api/v1/auth/password-reset/request',{email});
    assert.equal(resetRequest.status,200);
    const reset=await payload(resetRequest);
    assert.match(reset.message,/If the account exists/);
    assert.ok(reset.reset_token,'raw reset token is exposed only in the isolated test configuration');
    const nextPassword='Secure$NewPassword456';
    const resetConfirm=await request('/api/v1/auth/password-reset/confirm',{
      token:reset.reset_token,new_password:nextPassword
    });
    assert.equal(resetConfirm.status,200);
    const resetReuse=await request('/api/v1/auth/password-reset/confirm',{
      token:reset.reset_token,new_password:'Secure$AnotherPassword789'
    });
    assert.equal(resetReuse.status,400,'password reset challenge is single-use');
    const oldLogin=await request('/api/v1/auth/login',{email,password:originalPassword});
    assert.equal(oldLogin.status,401,'password reset invalidates the previous password');
    const newLogin=await request('/api/v1/auth/login',{email,password:nextPassword});
    assert.equal(newLogin.status,200);
    const loggedIn=await payload(newLogin);
    const loggedOut=await request('/api/v1/auth/logout',{refresh_token:loggedIn.refresh_token});
    assert.equal(loggedOut.status,200);
    const loggedOutRefresh=await request('/api/v1/auth/refresh',{refresh_token:loggedIn.refresh_token});
    assert.equal(loggedOutRefresh.status,401);

    const throttleEmail='throttle-'+randomUUID()+'@example.com';
    for(let i=0;i<5;i++){
      const failed=await request('/api/v1/auth/login',{
        email:throttleEmail,password:'Wrong$Password123'
      });
      assert.equal(failed.status,401,'invalid credentials remain generic before the limit');
    }
    const throttled=await request('/api/v1/auth/login',{
      email:throttleEmail,password:'Wrong$Password123'
    });
    assert.equal(throttled.status,429,'repeated failed attempts are rate limited');

    let outbox;
    for(let i=0;i<20;i++){
      outbox=await identityPool.query(
        "SELECT published_at IS NOT NULL AS published, " +
        "envelope#>'{payload,token}' = 'null'::jsonb AS token_redacted " +
        "FROM identity_outbox WHERE topic=$1 ORDER BY created_at DESC LIMIT 1",
        ['identity.email-verification.requested.v1']);
      if(outbox.rowCount&&outbox.rows[0].published&&outbox.rows[0].token_redacted)break;
      await sleep(250);
    }
    assert.equal(outbox.rowCount,1);
    assert.equal(outbox.rows[0].published,true,'outbox waits for publisher confirmation');
    assert.equal(outbox.rows[0].token_redacted,true,'raw challenge is scrubbed from the database after publish');

    const audits=await identityPool.query(
      'SELECT event_type FROM identity_audit WHERE account_id=$1',[created.account.id]);
    const auditTypes=new Set(audits.rows.map(row=>row.event_type));
    for(const expected of ['ACCOUNT_REGISTERED','EMAIL_VERIFIED','REFRESH_REPLAY',
      'PASSWORD_RESET_COMPLETED','LOGIN_FAILED','LOGIN_SUCCEEDED']) {
      assert.ok(auditTypes.has(expected),'Missing security audit event '+expected);
    }
    t.diagnostic('Identity lifecycle checks completed against isolated PostgreSQL and RabbitMQ');
  } finally {
    if(identity)await stopChild(identity);
    await stopChild(customer);
  }
});

test.after(async()=>{
  await Promise.all([identityPool.end(),customerPool.end()]);
});
