// Shared implementation; deployment script also creates standalone dashboard copies.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (data,status=200) => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function equalSecret(a,b) {
  const digest = value => crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  const [x,y] = await Promise.all([digest(a),digest(b)]);
  const left=new Uint8Array(x),right=new Uint8Array(y);let difference=0;
  for(let i=0;i<left.length;i++)difference|=left[i]^right[i];
  return difference===0;
}
function createVapiToolHandler(kind,{env,fetchImpl=fetch,now=()=>Date.now()}) {
  return async request => {
    if(request.method!=='POST')return json({error:'Method not allowed'},405);
    const expected=env(kind==='verify'?'RAIKEN_VAPI_READ_KEY':'RAIKEN_VAPI_WRITE_KEY')||'';
    if(expected.length<32)return json({error:'Tool not configured'},503);
    if(!await equalSecret(request.headers.get('authorization')||'','Bearer '+expected))return json({error:'Unauthorised'},401);
    if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Use application/json'},415);
    let body;
    try {
      const reader=request.body?.getReader();if(!reader)throw Error();
      const chunks=[];let size=0;
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return json({error:'Request too large'},413);}chunks.push(value);}
      const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
      body=JSON.parse(new TextDecoder().decode(bytes));
    }catch{return json({error:'Invalid JSON'},400);}
    if(!body||typeof body!=='object'||Array.isArray(body)||!uuid.test(body.call_id||''))return json({error:'Invalid call ID'},400);
    if(kind==='verify'&&(typeof body.spoken_full_name!=='string'||body.spoken_full_name.length>110||!body.spoken_full_name.trim()))return json({error:'A spoken full name is required'},400);
    if(kind==='log'&&(!['buy','sell','transfer','other','unknown'].includes(body.service_choice)||!['questions_answered','human_requested','callback_requested','not_interested','unknown'].includes(body.call_outcome)||typeof body.human_requested!=='boolean'))return json({error:'Invalid outcome'},400);
    try {
      const vapiKey=env('RAIKEN_VAPI_API_KEY');
      const url=env('SUPABASE_URL');
      const keys=JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}');
      const dbKey=keys.default||env('SUPABASE_SERVICE_ROLE_KEY');
      if(!vapiKey||!url||!dbKey)return json({error:'Tool not configured'},503);
      // The number comes from Vapi's authenticated call record, never from model arguments.
      const callResponse=await fetchImpl('https://api.vapi.ai/call/'+body.call_id,{headers:{Authorization:'Bearer '+vapiKey},signal:AbortSignal.timeout(6000)});
      if(!callResponse.ok)return json(kind==='verify'?{status:'LOOKUP_ERROR'}:{success:false},503);
      const call=await callResponse.json();
      const age=now()-Date.parse(call.createdAt);
      if(call.id!==body.call_id||call.type!=='outboundPhoneCall'||!/^\+[1-9]\d{7,14}$/.test(call.customer?.number||'')||!Number.isFinite(age)||age< -60000||age>86400000)return json({error:'Call not allowed'},403);
      const args=kind==='verify'
        ?{p_call_id:body.call_id,p_phone:call.customer.number,p_name:body.spoken_full_name.trim()}
        :{p_call_id:body.call_id,p_service:body.service_choice,p_outcome:body.call_outcome,p_human_requested:body.human_requested};
      const rpc=kind==='verify'?'verify_quote_customer':'log_quote_call_outcome';
      const result=await fetchImpl(url.replace(/\/$/,'')+'/rest/v1/rpc/'+rpc,{method:'POST',headers:{apikey:dbKey,Authorization:'Bearer '+dbKey,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(6000)});
      if(!result.ok)return json(kind==='verify'?{status:'LOOKUP_ERROR'}:{success:false},503);
      const data=await result.json();
      // Strict output allowlist: never pass through a database row or error text.
      return kind==='verify'?json({status:data?.status==='VERIFIED_MATCH'?'VERIFIED_MATCH':'UNVERIFIED'}):json({success:data?.success===true});
    }catch{return json(kind==='verify'?{status:'LOOKUP_ERROR'}:{success:false},503);}
  };
}

Deno.serve(createVapiToolHandler('verify',{env:name=>Deno.env.get(name)}));
