import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readAppOrigins } from '../server/origins.mjs';
import { readConfig } from '../server/config.mjs';
import { createHttpServer } from '../server/http.mjs';
import { createEnquiryService } from '../server/enquiries.mjs';

const deployment={VERCEL:'1',PUBLIC_APP_URL:'http://localhost:5173',VERCEL_PROJECT_PRODUCTION_URL:'raikan-conveyancing-page.vercel.app',VERCEL_URL:'raikan-test-abc.vercel.app',VERCEL_BRANCH_URL:'raikan-git-main-team.vercel.app'};
const production='https://raikan-conveyancing-page.vercel.app';
const request={service:'buy',choice:'below',consent:true,contact:{name:'UI Test',email:'test@example.invalid',phone:'+61412345678'}};

test('copied local configuration resolves to the deployed website and exact Vercel aliases',()=>{
 const config=readAppOrigins(deployment);
 assert.equal(config.origin,production);
 assert.deepEqual(config.allowedOrigins,[production,'https://raikan-test-abc.vercel.app','https://raikan-git-main-team.vercel.app']);
 assert.equal(readAppOrigins({}).origin,'http://localhost:5173');
 const custom=readAppOrigins({...deployment,PUBLIC_APP_URL:'https://conveyancing.rcorpo.com/',ALLOWED_APP_ORIGINS:'https://another.company.invalid'});
 assert.equal(custom.origin,'https://conveyancing.rcorpo.com');
 assert(custom.allowedOrigins.includes(production));assert(custom.allowedOrigins.includes('https://another.company.invalid'));
 assert(!readAppOrigins({VERCEL_URL:'untrusted.invalid'}).allowedOrigins.includes('https://untrusted.invalid'));
 for(const value of ['https://*.vercel.app','https://example.invalid/path','https://name:password@example.invalid','null'])assert.throws(()=>readAppOrigins({ALLOWED_APP_ORIGINS:value}));
 assert.throws(()=>readAppOrigins({...deployment,ALLOWED_APP_ORIGINS:'http://localhost:5173'}));
 assert.throws(()=>readAppOrigins({...deployment,VERCEL_URL:'user@untrusted.invalid'}));
});

test('all four design submissions pass the deployed origin guard and queue their messages',async()=>{
 const config=readConfig(deployment),saved=[],queued=new Map();
 const store={
  create:async(lead,jobs)=>{const value={...lead,id:randomUUID()};saved.push(value);queued.set(value.id,jobs);return value;},
  jobs:async id=>queued.get(id).map(({channel,status})=>({channel,status})),
 };
 let deliveryRuns=0;
 const server=createHttpServer({config,service:createEnquiryService({config,store}),runDelivery:async()=>{deliveryRuns++;}});
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}/api/quotes`;
  const selections=[['buy','below'],['sell','agent'],['transfer','spouse'],['buy','above']];
  for(const [index,[service,choice]] of selections.entries()){
   const origin=config.allowedOrigins[index%config.allowedOrigins.length];
   const response=await fetch(url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify({...request,service,choice})});
   assert.equal(response.status,202,`Design ${index+1}`);const result=await response.json();
   assert.equal(result.service,service);assert.equal(result.choice,choice);assert(result.reference);assert(result.accessToken);
   assert.equal(saved.at(-1).contact.phone,'+61412345678');assert.equal(saved.at(-1).consent.purpose,'quote_email_sms_and_enquiry_followup');
   assert.deepEqual(result.delivery.map(job=>job.channel),['client_email','client_sms']);
  }
  assert.equal(saved.length,4);assert.equal(deliveryRuns,4);
  for(const origin of ['https://attacker.invalid','https://raikan-conveyancing-page.vercel.app.attacker.invalid','null','http://localhost:5173',undefined]){
   const response=await fetch(url,{method:'POST',headers:{...(origin?{Origin:origin}:{}),'X-Forwarded-Host':'raikan-conveyancing-page.vercel.app','Content-Type':'application/json'},body:JSON.stringify(request)});
   assert.equal(response.status,403);await response.text();
  }
  assert.equal(saved.length,4);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

test('Turnstile uses the submitting deployment hostname and refuses tokens for another hostname',async()=>{
 const config={...readConfig(deployment),turnstileSecret:'fixture-secret'};
 let saves=0,hostname='raikan-test-abc.vercel.app';
 const store={create:async(lead)=>{saves++;return {...lead,id:randomUUID()};},jobs:async()=>[]};
 const service=createEnquiryService({config,store,fetchImpl:async()=>Response.json({success:true,hostname,action:'quote_enquiry'})});
 await service.create({...request,captchaToken:'fixture-token'},randomUUID(),'127.0.0.1','quote','https://raikan-test-abc.vercel.app');
 assert.equal(saves,1);
 hostname='attacker.invalid';
 await assert.rejects(service.create({...request,captchaToken:'fixture-token'},randomUUID(),'127.0.0.1','quote',production),/security check expired/);
 assert.equal(saves,1);
});
