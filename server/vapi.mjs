import { services } from '../src/reference/config.js';
export class CallError extends Error {
  constructor(code, outcome='failed') { super(code); this.code=code; this.outcome=outcome; }
}
export function buildCall(job, lead, config) {
  const v = config.vapi;
  return {
    assistantId:v.assistantId, phoneNumberId:v.phoneNumberId,
    customer:{number:lead.contact.phone},
    assistantOverrides:{
      firstMessage:'Hi, this is Raikan Conveyancing’s AI assistant. Am I speaking with {{customer_name}}?',
      maxDurationSeconds:v.maxSeconds,
      server:{url:v.serverUrl,credentialId:v.credentialId},
      serverMessages:['status-update','end-of-call-report','tool-calls'],
      variableValues:{
        customer_name:lead.contact.name, enquiry_reference:lead.reference, call_job_id:job.id,
        service_description:services[lead.service]?.label || 'your conveyancing enquiry',
        transaction_type:services[lead.service]?.choices.find(([key])=>key===lead.choice)?.[1] || '',
        customer_notes:lead.contact.notes || '',
        business_email:v.businessEmail, transfer_available:Boolean(v.transferNumber),
        callback_available:Boolean(config.teamEmail && config.emailReady),
        enquiry_kind:lead.kind,
      },
    },
  };
}
export function createVapi(config, fetchImpl=fetch) {
  const headers={Authorization:'Bearer '+config.vapi.key,'Content-Type':'application/json'};
  return {
    async create(job,lead) {
      let response;
      try { response=await fetchImpl('https://api.vapi.ai/call',{method:'POST',headers,body:JSON.stringify(buildCall(job,lead,config)),signal:AbortSignal.timeout(20000)}); }
      catch { throw new CallError('vapi_submission_uncertain','unknown'); }
      if (response.status===429) throw new CallError('vapi_rate_limited','retry');
      if (response.status>=500) throw new CallError('vapi_submission_uncertain','unknown');
      if (!response.ok) throw new CallError('vapi_http_'+response.status);
      const data=await response.json().catch(()=>null);
      if (typeof data?.id!=='string' || data.id.length>100 || !data.id) throw new CallError('vapi_missing_call_id','unknown');
      return data.id;
    },
    async get(id) {
      if (!/^[\w-]{1,100}$/.test(id)) throw new CallError('invalid_vapi_call_id');
      const response=await fetchImpl('https://api.vapi.ai/call/'+encodeURIComponent(id),{headers,signal:AbortSignal.timeout(10000)});
      if (!response.ok) throw new CallError('vapi_status_http_'+response.status);
      return response.json();
    },
  };
}

export function providerStatus(status) {
  return ({queued:'accepted',scheduled:'accepted',ringing:'ringing','in-progress':'in-progress',forwarding:'in-progress',ended:'ended'})[status] || null;
}

export function callDetails(message) {
  const summary=message.analysis?.summary;
  const structured=message.analysis?.structuredData;
  return {
    ...(typeof message.endedReason==='string' ? {ended_reason:message.endedReason.slice(0,200)} : {}),
    ...(typeof summary==='string' ? {summary:summary.slice(0,4000)} : {}),
    ...(structured && typeof structured==='object' && !Array.isArray(structured) && JSON.stringify(structured).length<=8000 ? {structured_output:structured} : {}),
  };
}
