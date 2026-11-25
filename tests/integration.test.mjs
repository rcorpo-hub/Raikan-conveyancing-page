import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp,writeFile,unlink,rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readConfig } from '../server/config.mjs';
import { validateQuote,validateOnboarding } from '../server/validation.mjs';
import { createSinch,buildSinchMessage,smsSegments,DeliveryError } from '../server/sinch.mjs';
import { createEnquiryService } from '../server/enquiries.mjs';
import { createWorker } from '../server/worker.mjs';
import { createHttpServer } from '../server/http.mjs';
import { createMailer } from '../server/email.mjs';

const request={service:'buy',choice:'below',contact:{name:'Test Buyer',email:'buyer@example.invalid',phone:'0412345678',notes:'Please explain the fees.'},consent:true};
const key='aaca0094-b272-4af5-937f-5f3486c3bf1b';
const base=readConfig({});
test('safe defaults disable paid delivery and production rejects insecure configuration',()=>{
 assert(!base.databaseReady&&!base.smsReady&&!base.emailReady);
 assert.throws(()=>readConfig({SMS_ENABLED:'true'}));
 assert.throws(()=>readConfig({NODE_ENV:'production'}));
 assert.throws(()=>readConfig({SINCH_BASE_URL:'https://attacker.invalid'}));
 assert.throws(()=>readConfig({TURNSTILE_SITE_KEY:'missing-secret'}));
});
test('server validates consent, choice, email, phones and canonicalises the current form choices',()=>{
 assert.equal(validateQuote(request).contact.phone,'+61412345678');
 assert.equal(validateQuote({...request,service:'transfer',choice:'former_spouse'}).choice,'former');
 for(const value of [{...request,consent:false},{...request,choice:'tampered'},{...request,service:'__proto__'},{...request,contact:{...request.contact,email:'a\r\nb@example.invalid'}},{...request,contact:{...request.contact,phone:'123'}}])assert.throws(()=>validateQuote(value));
 assert.throws(()=>validateOnboarding({date:'2026-02-31'}));
});
test('Sinch submission uses authenticated server POST, exact payload and provider acknowledgement',async()=>{
 let captured;
 const secondKey='baca0094-b272-4af5-937f-5f3486c3bf1c';
 const config={...base,sinchKey:'unit-key',sinchSecret:'unit-secret'};
 const sinch=createSinch(config,async(url,options)=>{captured={url,options};return new Response(JSON.stringify({messages:[{message_id:key,status:'queued'}]}),{status:202});});
 assert.deepEqual(await sinch.send({to:'+61412345678',text:'Our fee is $660 + GST',reference:'RAI-TEST'}),{providerId:key,status:'accepted'});
 assert.equal(captured.url,'https://au.app.api.sinch.com/v1/messages');
 assert.equal(captured.options.headers.Authorization,'Basic '+Buffer.from('unit-key:unit-secret').toString('base64'));
 const payload=JSON.parse(captured.options.body).messages[0];
 assert.equal(payload.format,'SMS');assert.equal(payload.metadata.quote_reference,'RAI-TEST');assert(payload.delivery_report);
 const multi=createSinch(config,async(url,options)=>{captured={url,options};return new Response(JSON.stringify({messages:[{message_id:key,status:'queued'},{message_id:secondKey,status:'queued'}]}),{status:202});});
 assert.deepEqual(await multi.send({to:'+61412345678',text:'First SMS',texts:['First SMS','Second SMS'],reference:'RAI-TEST'}),{providerId:key,status:'accepted'});
 const batch=JSON.parse(captured.options.body).messages;
 assert.equal(batch.length,2);assert.equal(batch[0].content,'First SMS');assert.equal(batch[1].content,'Second SMS');
 const partial=createSinch(config,async()=>new Response(JSON.stringify({messages:[{message_id:key,status:'queued'}]}),{status:202}));
 await assert.rejects(partial.send({to:'+61412345678',text:'First SMS',texts:['First SMS','Second SMS'],reference:'RAI-TEST'}),e=>e.outcome==='unknown');
});
test('Sinch unknown outcomes never silently retry; known rejections are classified',async()=>{
 const payload={to:'+61412345678',text:'Test',reference:'TEST'};
 await assert.rejects(createSinch(base,async()=>{throw Error('timeout');}).send(payload),e=>e.outcome==='unknown');
 await assert.rejects(createSinch(base,async()=>new Response('{}',{status:429})).send(payload),e=>e.outcome==='retry');
 await assert.rejects(createSinch(base,async()=>new Response('{}',{status:401})).send(payload),e=>e.outcome==='failed');
 await assert.rejects(createSinch(base,async()=>new Response('{}',{status:202})).send(payload),e=>e.outcome==='unknown');
});
test('media channels, destination restrictions and SMS segment budget are enforced',()=>{
 const payload={to:'+61412345678',text:'Our fee is $660 + GST.',reference:'TEST'};
 assert.equal(smsSegments('a'.repeat(160)),1);assert.equal(smsSegments('a'.repeat(161)),2);
 assert.equal(smsSegments('€'.repeat(81)),2);assert.equal(smsSegments('🙂'.repeat(36)),2);
 assert.throws(()=>buildSinchMessage({...payload,to:'+14155552671'},base));
 assert.throws(()=>buildSinchMessage({...payload,text:'a'.repeat(2000)},{...base,maxSegments:1}));
 const mms=buildSinchMessage(payload,{...base,channel:'MMS',mediaUrl:'https://assets.example.invalid/banner.jpg'});
 assert.equal(mms.format,'MMS');assert.equal(mms.media.length,1);
 const rcs=buildSinchMessage(payload,{...base,channel:'RCS',mediaUrl:'https://assets.example.invalid/banner.jpg'});
 assert.equal(rcs.fallback_message.content,payload.text);assert.equal(rcs.rich_content.card.suggestions[0].type,'dial');assert(!rcs.content);
});
test('enquiry service builds server-side fee snapshots, consent, disabled jobs and stable access tokens',async()=>{
 const captured=[];
 const store={create:async(lead,jobs,actor)=>{captured.push({lead,jobs,actor});return {id:key,reference:lead.reference};},jobs:async()=>[{channel:'client_sms',status:'disabled'}]};
 const service=createEnquiryService({store,config:base});
 const first=await service.create(request,key,'127.0.0.1');
 const second=await service.create(request,key,'127.0.0.1');
 assert.equal(first.accessToken,second.accessToken);
 assert.match(first.reference,/^RAI-/);assert(!first.reference.startsWith('DEMO'));
 assert.equal(captured[0].lead.contact.phone,'+61412345678');
 assert.equal(captured[0].lead.fee_snapshot.rows[0][1],'$660 + GST');
 assert(captured[0].jobs.every(j=>j.status==='disabled'));
 const smsPayload=captured[0].jobs.find(j=>j.channel==='client_sms').payload;
 assert.equal(smsPayload.texts.length,2);
 assert(smsPayload.texts[0].startsWith('Hi! 👋 Test,\n\nGood news-your conveyancing quote has just landed in your email.'));
 assert(smsPayload.texts[1].startsWith('Please provide following details to your real estate agent/ mortgage broker.'));
 assert(!smsPayload.text.includes('/api/unsubscribe/'));
 assert(!smsPayload.texts.some(t=>t.includes('/api/unsubscribe/')));
 assert(!JSON.stringify(first).includes('unit-secret'));
 await assert.rejects(service.create({...request,consent:false},key,'127.0.0.1'));
 await assert.rejects(createEnquiryService({store:null,config:base}).create(request,key,'127.0.0.1'),e=>e.status===503);
 const callbackJobs=[];
 const cbService=createEnquiryService({config:{...base,smsReady:true,emailReady:true,teamEmail:'team@example.invalid'},store:{create:async(_,jobs)=>{callbackJobs.push(...jobs);return {id:key,reference:'RAI-CB'};},jobs:async()=>[]}});
 await cbService.create({contact:{name:'Callback Person',phone:'0412345678'},time:'morning',consent:true},key,'127.0.0.1','callback');
 assert(!callbackJobs.some(j=>j.channel==='client_sms'));
 assert(callbackJobs.some(j=>j.channel==='team_email'));
});
test('both services queue independently and retain the correct buyer attachments',async()=>{
 let jobs;
 const service=createEnquiryService({config:{...base,emailReady:true,smsReady:true},store:{create:async(_,j)=>{jobs=j;return {id:key,reference:'RAI-TEST'};},jobs:async()=>[]}});
 await service.create(request,key,'127.0.0.1');
 assert.equal(jobs.find(j=>j.channel==='client_sms').depends_on,null);
 assert.equal(jobs.find(j=>j.channel==='client_sms').status,'pending');
 assert.equal(jobs.find(j=>j.channel==='client_email').status,'pending');
 assert.equal(jobs.find(j=>j.channel==='client_email').payload.attachments.length,2);
});
test('worker respects suppressions, provider uncertainty and acknowledgement persistence failures',async()=>{
 const job={id:key,lead_id:key,channel:'client_sms',payload:{},attempts:1};
 for(const outcome of ['suppressed','unknown','ack_failure']){
   let claimed=false,sends=0;const finishes=[];
   const store={claim:async()=>claimed?null:(claimed=true,job),suppressed:async()=>outcome==='suppressed',finish:async(_,patch)=>{finishes.push(patch);if(outcome==='ack_failure')throw Error('DB down');},accepted:async()=>[]};
   const worker=createWorker({store,config:{...base,smsReady:true},mailer:null,log:()=>{},sinch:{send:async()=>{sends++;if(outcome==='unknown')throw new DeliveryError('timeout','unknown');return {providerId:key,status:'accepted'};}}});
   await worker.runOnce();
   assert.equal(sends,outcome==='suppressed'?0:1);
   assert.equal(finishes[0].status,outcome==='ack_failure'?'accepted':outcome);
   assert.equal(finishes.length,1);
 }
});
test('SMTP includes local PDF attachments and uses a stable message ID',async()=>{
 let sent;
 const mailer=createMailer({...base,emailFrom:'test@example.invalid'}, {sendMail:async mail=>{sent=mail;return {accepted:['client@example.invalid'],rejected:[],messageId:mail.messageId};},close(){}});
 await mailer.send({to:'client@example.invalid',subject:'Quote',text:'Our fee is $660 + GST',attachments:[{path:'public/documents/quote-purchaser-660.pdf',filename:'Quote.pdf'}]},key);
 assert(sent.attachments[0].path.endsWith('quote-purchaser-660.pdf'));
 assert.equal(sent.messageId,`<${key}@localhost>`);
});
test('SMS starts while SMTP is still waiting, and an email failure does not block it',async()=>{
 let releaseEmail,smsStarted;
 const emailWait=new Promise((_,reject)=>{releaseEmail=()=>reject(new DeliveryError('email_rejected'));});
 const smsWait=new Promise(resolve=>{smsStarted=resolve;});
 const jobs=[{id:'email',lead_id:key,channel:'client_email',payload:{},attempts:1},{id:'sms',lead_id:key,channel:'client_sms',payload:{},attempts:1}];
 const finished=[];
 const store={claim:async()=>jobs.shift(),suppressed:async()=>false,finish:async(id,patch)=>finished.push({id,...patch}),accepted:async()=>[]};
 const worker=createWorker({store,config:{...base,smsReady:true,emailReady:true},mailer:{send:()=>emailWait},sinch:{send:async()=>{smsStarted();return {providerId:key,status:'accepted'};}}});
 const running=worker.runOnce();
 let timer;
 try{await Promise.race([smsWait,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('SMS was blocked by SMTP')),1000);})]);}
 finally{clearTimeout(timer);releaseEmail();await running;}
 assert.equal(finished.find(job=>job.id==='sms').status,'accepted');
 assert.equal(finished.find(job=>job.id==='email').status,'failed');
});
test('HTTP API rejects cross-site submissions, preserves idempotency headers and fails honestly without credentials',async t=>{
 const service=createEnquiryService({store:null,config:base});
 const staticRoot=await mkdtemp(join(tmpdir(),'raikan-static-test-'));
 await writeFile(join(staticRoot,'index.html'),'<div id="root"></div>');
 const server=createHttpServer({config:base,service,log:()=>{},staticRoot});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{await new Promise(resolve=>server.close(resolve));await unlink(join(staticRoot,'index.html'));await rmdir(staticRoot);});
 const url=`http://127.0.0.1:${server.address().port}`;
 const response=await fetch(url+'/api/config');const publicData=await response.json();
 assert.equal(publicData.storageAvailable,false);assert(!('supabaseKey' in publicData));
 const cross=await fetch(url+'/api/quotes',{method:'POST',headers:{Origin:'https://untrusted.invalid','Content-Type':'application/json'},body:JSON.stringify(request)});
 assert.equal(cross.status,403);
 const missing=await fetch(url+'/api/quotes',{method:'POST',headers:{Origin:base.origin,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(request)});
 assert.equal(missing.status,503);assert((await missing.json()).error.includes('not available'));
 const localPort=await fetch(url+'/api/quotes',{method:'POST',headers:{Origin:'http://localhost:5174','Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(request)});
 assert.equal(localPort.status,503);
 const homepage=await fetch(url+'/');assert.equal(homepage.status,200);assert((await homepage.text()).includes('id="root"'));
 const secret=await fetch(url+'/.env');assert.equal(secret.status,404);
});
