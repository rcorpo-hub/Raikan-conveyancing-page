import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
test('lookup returns status only, limits guesses, and keeps the first final outcome',async()=>{
 const db=new PGlite();
 try{
  await db.exec("create role anon; create role authenticated; create role service_role; create table public.quote_leads(contact jsonb); insert into public.quote_leads values ('{\"name\":\"Example Person\",\"phone\":\"+61412345678\",\"email\":\"private@example.invalid\"}');");
  await db.exec(await readFile(new URL('../supabase/migrations/202611240001_vapi_tools.sql',import.meta.url),'utf8'));
  const id='11223344-5566-4778-8990-aabbccddeeff';
  const verify=name=>db.query('select public.verify_quote_customer($1,$2,$3) as result',[id,'+61412345678',name]);
  assert.deepEqual((await verify('Example Person')).rows[0].result,{status:'VERIFIED_MATCH'});
  await verify('Wrong Person');await verify('Wrong Person');
  assert.deepEqual((await verify('Example Person')).rows[0].result,{status:'UNVERIFIED'});
  await db.query('select public.log_quote_call_outcome($1,$2,$3,$4)',[id,'buy','human_requested',true]);
  await db.query('select public.log_quote_call_outcome($1,$2,$3,$4)',[id,'sell','not_interested',false]);
  assert.equal((await db.query('select reported_service from public.vapi_tool_call_logs')).rows[0].reported_service,'buy');
  const grants=await db.query("select has_function_privilege('anon','public.verify_quote_customer(uuid,text,text)','execute') as anon_allowed,has_function_privilege('service_role','public.verify_quote_customer(uuid,text,text)','execute') as server_allowed");
  assert.deepEqual(grants.rows[0],{anon_allowed:false,server_allowed:true});
 }finally{await db.close();}
});
