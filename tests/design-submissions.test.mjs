import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile,mkdtemp,writeFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHttpServer } from '../server/http.mjs';
import { selectionFor,transactionOptions } from '../src/designs/artifact/selection.js';
import { validateQuote } from '../server/validation.mjs';

test('both artifact layouts have the required accessible fields and no unbound template code',async()=>{
 for(const id of [2,3]){
  const html=await readFile(new URL(`../src/designs/artifact/design-${id}.html`,import.meta.url),'utf8');
  for(const name of ['name','email','phone','propertyValue','notes','communicationsConsent'])assert.match(html,new RegExp(`name="${name}"`));
  assert(!/\{\{|onSubmit=|onClick=|<script|<sc-for|\/_blob\//i.test(html));
  assert.match(html,/data-artifact-form/);
 }
});
test('every service choice in artifact forms passes the real API validator',()=>{
 for(const [service,options] of Object.entries(transactionOptions))for(const [choice] of options.choices){
  const payload={...selectionFor(service,choice),consent:true,contact:{name:'Design Test',email:'test@example.invalid',phone:'+61412345678',notes:'',propertyValue:''}};
  const validated=validateQuote(payload);assert.equal(validated.service,service);assert.equal(validated.choice,choice);
 }
});
test('shared submission adapter sends API payload and reuses the request key on retry',async()=>{
 globalThis.location=new URL('http://localhost:5173/design-preview.html?design=2&utm_source=design-test');
 globalThis.window=new EventTarget();
 const originalFetch=globalThis.fetch;const requests=[];
 const result={id:randomUUID(),reference:'TEST-ONLY',accessToken:'test-token',delivery:[]};
 globalThis.fetch=async(path,options)=>{requests.push({path,options});return Response.json(result,{status:202});};
 try{
  const {workflow}=await import('../src/reference/api.js');
  const form={querySelector:selector=>selector==='[name="communicationsConsent"]'?{checked:true}:null};
  const contact={name:'Design Test',email:'test@example.invalid',phone:'0412345678',countryCode:'AU',notes:'',propertyValue:'650000'};
  for(const design of [1,2,3,4]){
   workflow.reset();
   const enquiry={...selectionFor('buy','below'),contact,callback:false};
   assert.equal((await workflow.createQuote(enquiry,form)).reference,'TEST-ONLY');
   await workflow.createQuote(enquiry,form);
   const [first,retry]=requests.slice(-2);assert.equal(first.path,'/api/quotes',`design ${design}`);
   assert.equal(first.options.headers['Idempotency-Key'],retry.options.headers['Idempotency-Key']);
   const payload=JSON.parse(first.options.body);assert.equal(payload.contact.phone,'+61412345678');assert.equal(payload.consent,true);validateQuote(payload);
  }
  const count=requests.length;
  await assert.rejects(workflow.createQuote({service:'buy',choice:'below',contact}, {querySelector:()=>null}),/permission/);
  assert.equal(requests.length,count);
 }finally{globalThis.fetch=originalFetch;delete globalThis.window;delete globalThis.location;}
});
test('main snapshot uses the shared live adapter and awaits saves before showing success',async()=>{
 const app=await readFile(new URL('../src/designs/main/app.js',import.meta.url),'utf8');
 assert.match(app,/from '..\/..\/reference\/api.js'/);
 assert(!app.includes("from './preview.js'"));
 assert.match(app,/heroForm\.lead = await workflow\.createQuote\([\s\S]*?\}, form\);\s*heroForm\.step = 4;/);
 assert.match(app,/showFormError/);
});

test('production static server permits its own design frame and serves imported fonts correctly',async()=>{
 const root=await mkdtemp(join(tmpdir(),'raikan-designs-'));
 await writeFile(join(root,'index.html'),'<main>Design selector</main>');
 await writeFile(join(root,'design-preview.html'),'<main>Design preview</main>');
 await writeFile(join(root,'font.ttf'),'font-fixture');
 const server=createHttpServer({config:{origin:'https://example.invalid',production:true},service:{},staticRoot:root});
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  for(const path of ['/','/design-preview.html']){
   const response=await fetch(origin+path);assert.equal(response.status,200);
   assert.equal(response.headers.get('x-frame-options'),'SAMEORIGIN');
   assert.match(response.headers.get('content-security-policy'),/frame-src 'self'/);
   assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'self'/);
   await response.text();
  }
  const font=await fetch(origin+'/font.ttf');assert.equal(font.headers.get('content-type'),'font/ttf');await font.text();
 }finally{await new Promise(resolve=>server.close(resolve));await rm(root,{recursive:true,force:true});}
});
