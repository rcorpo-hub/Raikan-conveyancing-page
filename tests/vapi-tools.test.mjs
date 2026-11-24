import test from 'node:test';
import assert from 'node:assert/strict';
import { createVapiToolHandler } from '../supabase/functions/_shared/vapi-tools.js';
const id='11223344-5566-4778-8990-aabbccddeeff';
const secrets={RAIKEN_VAPI_READ_KEY:'r'.repeat(64),RAIKEN_VAPI_WRITE_KEY:'w'.repeat(64),RAIKEN_VAPI_API_KEY:'test-key',SUPABASE_URL:'https://example.invalid',SUPABASE_SECRET_KEYS:JSON.stringify({default:'test-db-key'})};
const req=(body,token=secrets.RAIKEN_VAPI_READ_KEY)=>new Request('https://example.invalid',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});
const call={id,type:'outboundPhoneCall',createdAt:new Date().toISOString(),customer:{number:'+61412345678'}};
test('rejects missing or wrong tool credentials before any network access',async()=>{
 let requests=0;const handler=createVapiToolHandler('verify',{env:k=>secrets[k],fetchImpl:async()=>{requests++;throw Error();}});
 assert.equal((await handler(req({call_id:id,spoken_full_name:'Example'},''))).status,401);assert.equal(requests,0);
});
test('gets number from Vapi and never exposes database enquiry fields',async()=>{
 let n=0;const handler=createVapiToolHandler('verify',{env:k=>secrets[k],fetchImpl:async(url,options)=>{
  if(n++===0)return Response.json(call);
  const args=JSON.parse(options.body);assert.equal(args.p_phone,call.customer.number);assert.notEqual(args.p_phone,'+919999999999');
  return Response.json({status:'VERIFIED_MATCH',contact:{email:'private@example.invalid'},questions:'private'});
 }});
 assert.deepEqual(await (await handler(req({call_id:id,spoken_full_name:'Example',called_number:'+919999999999'}))).json(),{status:'VERIFIED_MATCH'});
});
test('refuses web/inbound calls and stale call IDs',async()=>{
 for(const record of [{...call,type:'webCall'},{...call,type:'inboundPhoneCall'},{...call,createdAt:'2020-01-01T00:00:00Z'}]){
  let n=0;const handler=createVapiToolHandler('verify',{env:k=>secrets[k],fetchImpl:async()=>{n++;return Response.json(record);}});
  assert.equal((await handler(req({call_id:id,spoken_full_name:'Example'}))).status,403);assert.equal(n,1);
 }
});
test('database failure gives a safe unavailable status without error or personal data',async()=>{
 let n=0;const handler=createVapiToolHandler('verify',{env:k=>secrets[k],fetchImpl:async()=>n++?Response.json({message:'sensitive database error'},{status:500}):Response.json(call)});
 assert.deepEqual(await (await handler(req({call_id:id,spoken_full_name:'Example'}))).json(),{status:'LOOKUP_ERROR'});
});
test('write token is separate and log arguments are limited to enums',async()=>{
 let n=0;const handler=createVapiToolHandler('log',{env:k=>secrets[k],fetchImpl:async(url,options)=>{
  if(n++===0)return Response.json(call);
  assert.deepEqual(Object.keys(JSON.parse(options.body)).sort(),['p_call_id','p_human_requested','p_outcome','p_service']);return Response.json({success:true});
 }});
 const body={call_id:id,service_choice:'buy',call_outcome:'human_requested',human_requested:true,call_summary:'must not be stored'};
 assert.equal((await handler(req(body))).status,401);
 assert.deepEqual(await (await handler(req(body,secrets.RAIKEN_VAPI_WRITE_KEY))).json(),{success:true});
});
