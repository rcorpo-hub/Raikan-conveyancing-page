import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { waitUntil } from '@vercel/functions';
import { readConfig } from '../server/config.mjs';
import { createHttpServer } from '../server/http.mjs';
import { createEnquiryService } from '../server/enquiries.mjs';
import { createWorker } from '../server/worker.mjs';
import { HttpError } from '../server/validation.mjs';

const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
const config={...readConfig({}),emailReady:true,smsReady:true};
const contact={name:'Latency Test',email:'test@example.invalid',phone:'+61412345678'};
const post=(url,body)=>fetch(url,{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify(body),signal:AbortSignal.timeout(2000)});
async function listen(server){await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}`;}
const close=server=>new Promise(resolve=>server.close(resolve));

test('all four quote responses return after saving while email and SMS remain blocked',async t=>{
 const providerGate=deferred(),background=[],saved=[],jobs=[],sent=[];
 const contextSymbol=Symbol.for('@vercel/request-context');
 const originalContext=globalThis[contextSymbol];
 globalThis[contextSymbol]={get:()=>({waitUntil:task=>background.push(task)})};
 const store={
  create:async(lead,payloads)=>{
   const record={...lead,id:randomUUID()};saved.push(record);
   jobs.push(...payloads.map(job=>({...job,id:randomUUID(),lead_id:record.id,attempts:1})));
   return record;
  },
  jobs:async id=>jobs.filter(job=>job.lead_id===id).map(({channel,status})=>({channel,status})),
  claim:async()=>{const job=jobs.find(job=>job.status==='pending');if(job)job.status='processing';return job;},
  suppressed:async()=>false,
  finish:async(id,patch)=>Object.assign(jobs.find(job=>job.id===id),patch),
  accepted:async()=>[],
 };
 const deliver=async(channel,payload)=>{await providerGate.promise;sent.push({channel,payload});return {status:'accepted',providerId:randomUUID()};};
 const worker=createWorker({config,store,mailer:{send:payload=>deliver('email',payload)},sinch:{send:payload=>deliver('sms',payload)}});
 const server=createHttpServer({config,service:createEnquiryService({config,store}),runDelivery:worker.runOnce,waitUntil});
 try{
  const url=await listen(server);const started=performance.now();
  for(const [index,[service,choice]] of [['buy','below'],['sell','agent'],['transfer','spouse'],['buy','above']].entries()){
   const response=await post(url+'/api/quotes',{service,choice,contact,consent:true});
   assert.equal(response.status,202,`Design ${index+1}`);const result=await response.json();
   assert(saved.some(lead=>lead.id===result.id),'save must complete before success');
   assert.equal(result.service,service);assert.equal(result.choice,choice);assert(result.reference);
   assert.deepEqual(result.delivery.map(job=>job.status),['pending','pending']);
   assert.equal(sent.length,0,'provider gate must still be closed');
  }
  t.diagnostic(`Four enquiry responses completed in ${Math.round(performance.now()-started)} ms while providers were still blocked (local fixture).`);
  assert.equal(background.length,4,'Vercel must retain delivery after every response');
  providerGate.resolve();await Promise.all(background);
  assert.equal(sent.filter(job=>job.channel==='email').length,4);
  assert.equal(sent.filter(job=>job.channel==='sms').length,4);
  assert(jobs.every(job=>job.status==='accepted'));
 }finally{
  providerGate.resolve();await Promise.allSettled(background);await close(server);
  if(originalContext===undefined)delete globalThis[contextSymbol];else globalThis[contextSymbol]=originalContext;
 }
});

test('save failures never return quote success or schedule provider delivery',async()=>{
 let scheduled=0,delivered=0;
 const store={create:async()=>{throw new HttpError(503,'Could not save enquiry.');}};
 const server=createHttpServer({config,service:createEnquiryService({config,store}),runDelivery:async()=>{delivered++;},waitUntil:()=>{scheduled++;}});
 try{
  const url=await listen(server);
  const response=await post(url+'/api/quotes',{service:'buy',choice:'below',contact,consent:true});
  assert.equal(response.status,503);assert.equal((await response.json()).error,'Could not save enquiry.');
  assert.equal(scheduled,0);assert.equal(delivered,0);
 }finally{await close(server);}
});

test('a later background failure cannot turn an already saved enquiry into a form error',async()=>{
 const background=[],logs=[];
 const result={id:randomUUID(),reference:'TEST',delivery:[{channel:'client_sms',status:'pending'}]};
 const server=createHttpServer({config,service:{create:async()=>result},runDelivery:async()=>{throw Error('Provider unavailable');},waitUntil:task=>background.push(task),log:message=>logs.push(message)});
 try{
  const url=await listen(server);
  const response=await post(url+'/api/quotes',{});
  assert.equal(response.status,202);assert.deepEqual(await response.json(),result);
  await Promise.all(background);assert.equal(logs.length,1);
 }finally{await close(server);}
});
