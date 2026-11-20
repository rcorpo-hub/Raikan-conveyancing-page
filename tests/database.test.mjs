import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { once } from 'node:events';
import { readConfig } from '../server/config.mjs';
import { createEnquiryService } from '../server/enquiries.mjs';
import { createHttpServer } from '../server/http.mjs';
import { createWorker } from '../server/worker.mjs';

test('Supabase migration and delivery transactions execute in local PostgreSQL',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 await db.exec(await readFile(new URL('../supabase/migrations/202611200001_quote_delivery.sql',import.meta.url),'utf8'));
 const makeLead=(overrides={})=>({reference:'TEST-'+randomUUID(),idempotency_key:randomUUID(),request_hash:'request-hash',access_token_hash:'access-hash',unsubscribe_hash:randomUUID(),phone_hash:randomUUID(),kind:'quote',service:'buy',choice:'below',contact:{name:'Test',email:'test@example.invalid',phone:'+61412345678'},callback:false,attribution:{},consent:{requested:true},fee_snapshot:{version:'test'},...overrides});
 const create=async(lead,jobs=[],actor=randomUUID(),hourLimit=10,phoneLimit=3)=>(await db.query('select public.create_quote_enquiry($1::jsonb,$2::jsonb,$3,$4,$5) as result',[JSON.stringify(lead),JSON.stringify(jobs),actor,hourLimit,phoneLimit])).rows[0].result;
 await t.test('anonymous roles cannot read records or invoke privileged functions',async()=>{
  const tables=(await db.query("select tablename, rowsecurity from pg_tables where schemaname='public' and tablename like 'quote_%'")).rows;
  assert.equal(tables.length,4);assert(tables.every(row=>row.rowsecurity));
  for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   await assert.rejects(db.query('select * from public.quote_leads'),/permission denied/);
   await assert.rejects(db.query('select public.claim_quote_job()'),/permission denied/);
   await db.exec('reset role');
  }
 });
 await t.test('enquiry + jobs are atomic, idempotent and only service_role can enqueue',async()=>{
  await db.exec('set role service_role');
  const lead=makeLead();const job={channel:'client_sms',payload:{text:'Test'},status:'pending'};
  const one=await create(lead,[job]);const two=await create(lead,[job]);
  assert.equal(one.id,two.id);assert.equal(two.created,false);
  assert.equal((await db.query('select count(*)::int as n from public.quote_outbox where lead_id=$1',[one.id])).rows[0].n,1);
  await assert.rejects(create({...lead,request_hash:'different'},[job]),/QUOTE_IDEMPOTENCY_CONFLICT/);
  const bad=makeLead();await assert.rejects(create(bad,[{...job,channel:'invalid'}]));
  assert.equal((await db.query('select count(*)::int as n from public.quote_leads where reference=$1',[bad.reference])).rows[0].n,0);
  await db.exec('reset role');
 });
 await t.test('rate limits persist and a rejected request leaves no partial record',async()=>{
  const actor=randomUUID();await create(makeLead(),[],actor,1);
  const blocked=makeLead();await assert.rejects(create(blocked,[],actor,1),/QUOTE_RATE_LIMIT/);
  assert.equal((await db.query('select count(*)::int as n from public.quote_leads where reference=$1',[blocked.reference])).rows[0].n,0);
 });
 await t.test('email and SMS are claimable independently; expired sending leases become unknown',async()=>{
  await db.exec('truncate public.quote_outbox');
  const lead=makeLead();const saved=await create(lead,[{channel:'client_email',status:'pending',payload:{}},{channel:'client_sms',status:'pending',depends_on:null,payload:{}}]);
  const first=(await db.query('select * from public.claim_quote_job()')).rows[0];
  const second=(await db.query('select * from public.claim_quote_job()')).rows[0];
  assert.deepEqual([first.channel,second.channel].sort(),['client_email','client_sms']);
  const sms=[first,second].find(job=>job.channel==='client_sms');
  await db.query("update public.quote_outbox set locked_at=now()-interval '6 minutes' where id=$1",[sms.id]);
  assert.equal((await db.query('select * from public.claim_quote_job()')).rows.length,0);
  assert.equal((await db.query('select status from public.quote_outbox where id=$1',[sms.id])).rows[0].status,'unknown');
  assert(saved.id);
 });
 await t.test('upgrade releases only pending legacy SMS dependencies, not disabled or failed messages',async()=>{
  await db.exec('truncate public.quote_outbox');
  for(const status of ['pending','disabled','failed','unknown'])await create(makeLead(),[{channel:'client_sms',status,depends_on:'client_email',payload:{}}]);
  await db.exec(await readFile(new URL('../supabase/migrations/202611200002_independent_delivery.sql',import.meta.url),'utf8'));
  const rows=(await db.query('select status,depends_on from public.quote_outbox')).rows;
  assert.equal(rows.find(row=>row.status==='pending').depends_on,null);
  for(const status of ['disabled','failed','unknown'])assert.equal(rows.find(row=>row.status===status).depends_on,'client_email');
 });
 await t.test('opt-out suppresses pending and future SMS across the same phone',async()=>{
  await db.exec('truncate public.quote_outbox');
  const lead=makeLead();const saved=await create(lead,[{channel:'client_sms',status:'pending',payload:{}}]);
  assert.equal((await db.query('select public.suppress_quote_sms($1) as result',[lead.unsubscribe_hash])).rows[0].result,true);
  assert.equal((await db.query('select status from public.quote_outbox where lead_id=$1',[saved.id])).rows[0].status,'suppressed');
  const another=await create(makeLead({phone_hash:lead.phone_hash}),[{channel:'client_sms',status:'pending',payload:{}}]);
  assert.equal((await db.query('select status from public.quote_outbox where lead_id=$1',[another.id])).rows[0].status,'suppressed');
 });
 await t.test('HTTP -> PostgreSQL -> worker -> mocked Sinch -> authenticated delivery status',async()=>{
  await db.exec('truncate public.quote_outbox');
  const config={...readConfig({}),databaseReady:true,smsReady:true};
  const store={
   create:(lead,jobs,actor)=>create(lead,jobs,actor),
   jobs:async id=>(await db.query('select channel,status from public.quote_outbox where lead_id=$1',[id])).rows,
   get:async(id,hash)=>(await db.query('select * from public.quote_leads where id=$1 and access_token_hash=$2',[id,hash])).rows[0],
   claim:async()=>(await db.query('select * from public.claim_quote_job()')).rows[0],
   suppressed:async()=>false,
   finish:async(id,patch)=>db.query('update public.quote_outbox set status=$2,provider_id=$3 where id=$1',[id,patch.status,patch.provider_id || null]),
   accepted:async()=>(await db.query("select id,provider_id from public.quote_outbox where status='accepted'")).rows,
   delivery:async(id,status)=>db.query('update public.quote_outbox set status=$2 where id=$1',[id,status]),
  };
  const server=createHttpServer({config,service:createEnquiryService({config,store})});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const url=`http://127.0.0.1:${server.address().port}`;
  try{
   const response=await fetch(url+'/api/quotes',{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify({service:'buy',choice:'below',consent:true,contact:{name:'End to End Test',email:'test@example.invalid',phone:'0412345678'}})});
   assert.equal(response.status,202);const saved=await response.json();assert.match(saved.reference,/^RAI-/);
   assert.equal((await db.query('select count(*)::int as n from public.quote_leads where id=$1',[saved.id])).rows[0].n,1);
   let sent;
   await createWorker({store,config,mailer:null,sinch:{send:async payload=>{sent=payload;return {providerId:randomUUID(),status:'accepted'};},status:async()=>'delivered'}}).runOnce();
   assert.equal(sent.to,'+61412345678');assert(sent.text.includes('$660 + GST'));assert(sent.text.includes(saved.reference));
   const status=await fetch(url+`/api/leads/${saved.id}/status`,{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json',Authorization:'Bearer '+saved.accessToken},body:'{}'});
   assert.equal(status.status,200);assert((await status.json()).delivery.some(job=>job.channel==='client_sms'&&job.status==='delivered'));
   const denied=await fetch(url+`/api/leads/${saved.id}/status`,{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json',Authorization:'Bearer '+'0'.repeat(64)},body:'{}'});
   assert.equal(denied.status,404);
  }finally{await new Promise(resolve=>server.close(resolve));}
 });
});
