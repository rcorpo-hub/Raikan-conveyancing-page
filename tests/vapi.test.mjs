import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { PGlite } from '@electric-sql/pglite';
import { readConfig } from '../server/config.mjs';
import { readVapiConfig, callAllowed, nextCallTime } from '../server/vapi-config.mjs';
import { createVapi, CallError, buildCall } from '../server/vapi.mjs';
import { buildAssistant } from '../server/vapi-assistant.mjs';
import { createCallWorker } from '../server/vapi-worker.mjs';
import { createVapiWebhook, verifyVapiAuth } from '../server/vapi-webhook.mjs';
import { createHttpServer } from '../server/http.mjs';
import { createEnquiryService } from '../server/enquiries.mjs';

const base=readConfig({});
const v={...base.vapi,enabled:true,key:'unit-private-key',assistantId:randomUUID(),phoneNumberId:randomUUID(),credentialId:randomUUID(),serverUrl:'https://test.invalid/api/vapi/webhook',webhookSecret:'test-secret-'.repeat(4),testNumbers:['+61412345678']};
const config={...base,vapi:v};
const lead={id:randomUUID(),reference:'RAI-TEST',kind:'quote',service:'sell',choice:'agent',phone_hash:'phone-hash',contact:{name:'Test Person',phone:'+61412345678',notes:'Selling soon'},consent:{ai_call:{granted:true}}};
const job={id:randomUUID(),lead_id:lead.id,attempts:1};
const monday=new Date('2026-11-23T00:00:00Z'); // 10:30am Adelaide

test('calling defaults off, validates credentials and enforces test allowlist + calling codes',()=>{
 assert.equal(base.vapi.enabled,false);assert.equal(base.vapi.testMode,true);
 assert.throws(()=>readVapiConfig({VAPI_ENABLED:'true'}));
 assert.throws(()=>readVapiConfig({VAPI_TEST_NUMBERS:'0412345678'}));
 assert(callAllowed('+61412345678',v));assert(!callAllowed('+61423456789',v));
 assert(!callAllowed('+14155552671',{...v,testMode:false}));
 assert.throws(()=>readVapiConfig({VAPI_CALL_START_HOUR:'17',VAPI_CALL_END_HOUR:'9'}));
});

test('calling windows respect Adelaide daylight saving, weekends and blocked dates',()=>{
 assert.equal(nextCallTime(monday,v).toISOString(),monday.toISOString());
 assert.equal(nextCallTime(new Date('2026-11-20T08:00:00Z'),v).toISOString(),'2026-11-22T22:30:00.000Z');
 assert.equal(nextCallTime(monday,{...v,blockedDates:['2026-11-23']}).toISOString(),'2026-11-23T22:30:00.000Z');
 assert.equal(nextCallTime(new Date('2026-07-05T00:00:00Z'),v).toISOString(),'2026-07-05T23:30:00.000Z');
});

test('personalised call uses private bearer API auth and never exposes keys in payload',async()=>{
 let captured;
 const api=createVapi(config,async(url,options)=>{captured={url,options};return Response.json({id:'provider-call-id'});});
 assert.equal(await api.create(job,lead),'provider-call-id');
 assert.equal(captured.url,'https://api.vapi.ai/call');
 assert.equal(captured.options.headers.Authorization,'Bearer unit-private-key');
 const payload=JSON.parse(captured.options.body);
 assert.equal(payload.customer.number,lead.contact.phone);
 assert.equal(payload.assistantOverrides.variableValues.customer_name,'Test Person');
 assert.equal(payload.assistantOverrides.variableValues.service_description,'Selling a property');
 assert.equal(payload.assistantOverrides.server.credentialId,v.credentialId);
 assert(!captured.options.body.includes(v.key));assert(!captured.options.body.includes(v.webhookSecret));
 assert.equal(buildCall(job,lead,config).assistantOverrides.maxDurationSeconds,300);
});

test('timeouts, server errors and missing acknowledgement never trigger blind retries',async()=>{
 for(const fetcher of [async()=>{throw Error('timeout');},async()=>new Response('{}',{status:503}),async()=>Response.json({})]) {
  await assert.rejects(createVapi(config,fetcher).create(job,lead),err=>err.outcome==='unknown');
 }
 await assert.rejects(createVapi(config,async()=>new Response('{}',{status:401})).create(job,lead),err=>err.outcome==='failed');
 await assert.rejects(createVapi(config,async()=>new Response('{}',{status:429})).create(job,lead),err=>err.outcome==='retry');
});

test('enquiry only includes call scheduling after separate explicit consent and eligibility',async()=>{
 let saved;
 const store={create:async l=>{saved=l;return {id:l.id,reference:l.reference};},jobs:async()=>[]};
 const request={service:'sell',choice:'agent',consent:true,contact:{name:'Test Person',email:'test@example.invalid',phone:'0412345678'}};
 const service=createEnquiryService({store,config});
 await service.create(request,randomUUID(),'127.0.0.1');assert(!saved.ai_call);
 await service.create({...request,aiCallConsent:true},randomUUID(),'127.0.0.1');assert(saved.ai_call);assert(saved.consent.ai_call.granted);
 await service.create({...request,aiCallConsent:false},randomUUID(),'127.0.0.1');assert(!saved.ai_call);
 await service.create({...request,aiCallConsent:true,contact:{...request.contact,phone:'+61423456789'}},randomUUID(),'127.0.0.1');assert(!saved.ai_call);
 await assert.rejects(service.create({...request,aiCallConsent:'true'},randomUUID(),'127.0.0.1'));
});

test('worker rechecks consent, suppression and calling window before placing calls',async()=>{
 for(const scenario of ['send','suppressed','wrong_number','no_consent','outside_hours','unknown','ack_failure']) {
  let claimed=false,sends=0;const finishes=[];
  const store={claim:async()=>claimed?null:(claimed=true,job),lead:async()=>({...lead,...(scenario==='wrong_number'?{contact:{...lead.contact,phone:'+61423456789'}}:{}),...(scenario==='no_consent'?{consent:{}}:{})}),suppressed:async()=>scenario==='suppressed',finish:async(_,patch)=>{finishes.push(patch);if(scenario==='ack_failure')throw Error('database down');},active:async()=>[]};
  const worker=createCallWorker({store,config,now:()=>scenario==='outside_hours'?new Date('2026-11-23T10:00:00Z'):monday,log:()=>{},vapi:{create:async()=>{sends++;if(scenario==='unknown')throw new CallError('timeout','unknown');return 'provider-id';}}});
  await worker.runOnce();
  assert.equal(sends,['send','unknown','ack_failure'].includes(scenario)?1:0,scenario);
  assert.equal(finishes.length,1,scenario);
  assert.equal(finishes[0].status,scenario==='outside_hours'?'pending':scenario==='unknown'?'unknown':['send','ack_failure'].includes(scenario)?'accepted':'suppressed',scenario);
 }
});

test('webhook tools use provider-bound lead, report actual delivery and record stop/callback actions',async()=>{
 const call={...job,provider_id:'provider-id'};const actions=[];
 const store={byProvider:async id=>id===call.provider_id?call:null,deliveries:async()=>[{channel:'client_email',status:'failed'},{channel:'client_sms',status:'accepted'}],suppress:async id=>actions.push(['stop',id]),lead:async()=>lead,callback:async(...args)=>actions.push(['callback',...args]),event:async(...args)=>actions.push(['event',...args])};
 const handle=createVapiWebhook({store,config:{...config,teamEmail:'team@example.invalid',emailReady:true}});
 const invoke=(name,args={})=>handle({message:{type:'tool-calls',call:{id:call.provider_id},toolCallList:[{id:'tool-id',function:{name,arguments:args}}]}});
 const result=JSON.parse((await invoke('get_quote_delivery_status',{lead_id:'another-lead'})).results[0].result);
 assert.equal(result.email,'failed');assert.equal(result.sms,'accepted');
 await invoke('stop_future_calls');assert.deepEqual(actions[0],['stop',job.id]);
 const callback=JSON.parse((await invoke('request_callback',{preferred_time:'Tomorrow morning'})).results[0].result);
 assert(callback.recorded);assert.equal(callback.appointment_confirmed,false);assert.equal(actions[1][1],job.id);
 await invoke('record_call_summary',{summary:'Requested help selling',enquiry_type:'property_seller'});
 assert.equal(actions[2][3].structured_output.enquiry_type,'property_seller');
 await assert.rejects(handle({message:{type:'status-update',call:{id:'unknown-id'},status:'ringing'}}),err=>err.status===503);
 const unavailable=createVapiWebhook({store,config});
 const noCallback=await unavailable({message:{type:'tool-calls',call:{id:call.provider_id},toolCallList:[{id:'t',function:{name:'request_callback',arguments:{preferred_time:'Today'}}}]}});
 assert.equal(JSON.parse(noCallback.results[0].result).recorded,false);
});

test('HTTP webhook requires bearer authentication but not a browser Origin; public config exposes no secrets',async t=>{
 assert(!verifyVapiAuth('Bearer wrong',v.webhookSecret));assert(verifyVapiAuth('Bearer '+v.webhookSecret,v.webhookSecret));
 const server=createHttpServer({config,service:{},vapiWebhook:async()=>({received:true})});
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(resolve=>server.close(resolve)));
 const url=`http://127.0.0.1:${server.address().port}`;
 for(const auth of ['', 'Bearer wrong']) assert.equal((await fetch(url+'/api/vapi/webhook',{method:'POST',headers:{'Content-Type':'application/json',Authorization:auth},body:'{}'})).status,401);
 assert.equal((await fetch(url+'/api/vapi/webhook',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+v.webhookSecret},body:'{}'})).status,200);
 const publicConfig=await (await fetch(url+'/api/config')).json();assert(publicConfig.aiCallsEnabled);assert(!JSON.stringify(publicConfig).includes(v.key));assert(!JSON.stringify(publicConfig).includes(v.webhookSecret));
});

test('assistant export includes real tools, recording off and no invented transfer number',()=>{
 const assistant=buildAssistant(config);
 assert.equal(assistant.artifactPlan.recordingEnabled,false);
 assert(!assistant.model.tools.some(tool=>tool.type==='transferCall'));
 const withTransfer=buildAssistant({...config,vapi:{...v,transferNumber:'+61423456789'}});
 assert.equal(withTransfer.model.tools.find(tool=>tool.type==='transferCall').destinations[0].number,'+61423456789');
 assert(!JSON.stringify(withTransfer).includes(v.key));assert(!JSON.stringify(withTransfer).includes(v.webhookSecret));
});

test('real PostgreSQL call queue is atomic, private, idempotent and suppresses future calls',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
 for(const name of ['202611200001_quote_delivery.sql','202611200002_independent_delivery.sql','202611230001_vapi_calls.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 const makeLead=(patch={})=>({...lead,reference:'TEST-'+randomUUID(),idempotency_key:randomUUID(),request_hash:'request',access_token_hash:'access',unsubscribe_hash:randomUUID(),phone_hash:randomUUID(),callback:false,attribution:{},fee_snapshot:{},ai_call:{available_at:new Date(Date.now()+30000).toISOString()},...patch});
 const create=async l=>(await db.query('select public.create_quote_enquiry($1::jsonb,$2::jsonb,$3,10,3) as result',[JSON.stringify(l),'[]',randomUUID()])).rows[0].result;
 for(const role of ['anon','authenticated']) {
  await db.exec('set role '+role);await assert.rejects(db.query('select * from public.quote_calls'),/permission denied/);await assert.rejects(db.query('select public.claim_quote_call()'),/permission denied/);await db.exec('reset role');
 }
 await db.exec('set role service_role');
 const l=makeLead();const first=await create(l);const second=await create(l);assert.equal(first.id,second.id);
 assert.equal((await db.query('select count(*)::int as n from public.quote_calls')).rows[0].n,1);
 await create(makeLead({phone_hash:l.phone_hash}));assert.equal((await db.query('select count(*)::int as n from public.quote_calls')).rows[0].n,1);
 await create(makeLead({consent:{}}));assert.equal((await db.query('select count(*)::int as n from public.quote_calls')).rows[0].n,1);
 assert.equal((await db.query('select * from public.claim_quote_call()')).rows.length,0);
 await db.query("update public.quote_calls set available_at=now()-interval '1 second'");
 const claimed=(await db.query('select * from public.claim_quote_call()')).rows[0];assert.equal(claimed.status,'processing');
 assert.equal((await db.query('select * from public.claim_quote_call()')).rows.length,0);
 await db.query("update public.quote_calls set provider_id='provider-id',status='accepted' where id=$1",[claimed.id]);
 await db.query("select public.update_quote_call('provider-id','ended',$1::jsonb)",[JSON.stringify({summary:'Done',ended_reason:'customer-ended-call'})]);
 await db.query("select public.update_quote_call('provider-id','ringing')");
 assert.equal((await db.query('select status from public.quote_calls where id=$1',[claimed.id])).rows[0].status,'ended');
 await db.query('select public.record_quote_call_callback($1,$2,$3::jsonb,true)',[claimed.id,'Tomorrow',JSON.stringify({to:'team@example.invalid',text:'Callback'})]);
 await db.query('select public.record_quote_call_callback($1,$2,$3::jsonb,true)',[claimed.id,'Tomorrow',JSON.stringify({to:'team@example.invalid',text:'Callback'})]);
 assert.equal((await db.query("select count(*)::int as n from public.quote_outbox where channel='callback_report'")).rows[0].n,1);
 await db.query('select public.suppress_quote_calls($1)',[claimed.id]);
 await db.query("update public.quote_calls set created_at=now()-interval '2 days'");
 const suppressed=await create(makeLead({phone_hash:l.phone_hash}));
 assert.equal((await db.query('select count(*)::int as n from public.quote_calls where lead_id=$1',[suppressed.id])).rows[0].n,0);
 const other=await create(makeLead());
 await db.query("update public.quote_calls set status='processing',locked_at=now()-interval '6 minutes' where lead_id=$1",[other.id]);
 await db.query('select * from public.claim_quote_call()');
 assert.equal((await db.query('select status from public.quote_calls where lead_id=$1',[other.id])).rows[0].status,'unknown');
 // Complete submission -> durable queue -> mocked provider -> real event storage.
 let calls=0;
 const callStore={
  claim:async()=>(await db.query('select * from public.claim_quote_call()')).rows[0],
  lead:async id=>(await db.query('select * from public.quote_leads where id=$1',[id])).rows[0],
  suppressed:async hash=>(await db.query('select 1 from public.quote_call_suppressions where phone_hash=$1',[hash])).rows.length>0,
  finish:async(id,patch)=>{assert.equal(patch.status,'accepted');await db.query("update public.quote_calls set status='accepted',provider_id=$2 where id=$1 and status='processing'",[id,patch.provider_id]);},
  active:async()=>[],
  byProvider:async id=>(await db.query('select * from public.quote_calls where provider_id=$1',[id])).rows[0],
  event:async(id,status,details)=>(await db.query('select public.update_quote_call($1,$2,$3::jsonb)',[id,status,JSON.stringify(details)])).rows[0],
  deliveries:async id=>(await db.query('select channel,status from public.quote_outbox where lead_id=$1',[id])).rows,
 };
 const quoteStore={create, jobs:async id=>(await db.query('select channel,status from public.quote_outbox where lead_id=$1',[id])).rows};
 const request={service:'buy',choice:'below',consent:true,aiCallConsent:true,contact:{name:'Integrated Test',email:'test@example.invalid',phone:'+61412345678'}};
 const saved=await createEnquiryService({store:quoteStore,config}).create(request,randomUUID(),'127.0.0.1');
 await db.query("update public.quote_calls set available_at=now()-interval '1 second' where lead_id=$1",[saved.id]);
 const provider=createVapi(config,async(url,options)=>{
  calls++;assert.equal(JSON.parse(options.body).assistantOverrides.variableValues.customer_name,'Integrated Test');return Response.json({id:'integrated-provider-id'});
 });
 const worker=createCallWorker({store:callStore,config,vapi:provider,now:()=>monday});
 await worker.runOnce();await worker.runOnce();assert.equal(calls,1);
 const webhook=createVapiWebhook({store:callStore,config});
 const message={type:'end-of-call-report',call:{id:'integrated-provider-id'},endedReason:'customer-ended-call',analysis:{summary:'Customer confirmed buying a home.'}};
 await webhook({message});await webhook({message});
 const completed=(await db.query('select status,summary from public.quote_calls where lead_id=$1',[saved.id])).rows[0];
 assert.equal(completed.status,'ended');assert.equal(completed.summary,message.analysis.summary);
});
