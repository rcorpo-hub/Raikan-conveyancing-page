import { readFile,writeFile,mkdir,access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
await mkdir('docs/vapi-tools',{recursive:true});
const source=await readFile('supabase/functions/_shared/vapi-tools.js','utf8');
for(const [slug,kind] of [['verify-customer','verify'],['log-call','log']]){
  await writeFile('docs/vapi-tools/'+slug+'.ts',source.replace('export function createVapiToolHandler','function createVapiToolHandler')+`\nDeno.serve(createVapiToolHandler('${kind}',{env:name=>Deno.env.get(name)}));\n`);
}
try{await access('.env.vapi-tools');console.log('Kept existing .env.vapi-tools; no tokens rotated.');}
catch{
  const read=randomBytes(32).toString('hex'),write=randomBytes(32).toString('hex');
  const key=process.env.VAPI_API_KEY||'';
  if(/[\r\n]/.test(key))throw Error('Invalid Vapi API key format');
  await writeFile('.env.vapi-tools',`# Private values for Supabase Edge Function secrets. Never commit this file.\nRAIKEN_VAPI_READ_KEY=${read}\nRAIKEN_VAPI_WRITE_KEY=${write}\nRAIKEN_VAPI_API_KEY=${key}\n`,{flag:'wx'});
  console.log('Created ignored .env.vapi-tools with distinct tool tokens. No credentials printed.');
}
console.log('Prepared standalone dashboard function files under docs/vapi-tools.');
