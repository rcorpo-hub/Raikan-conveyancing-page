import { timingSafeEqual, createHash } from 'node:crypto';
import { HttpError, text } from './validation.mjs';
import { providerStatus, callDetails } from './vapi.mjs';

export function verifyVapiAuth(header, secret) {
  if (!secret || secret.length<32) return false;
  const hash=value=>createHash('sha256').update(value).digest();
  return typeof header==='string' && timingSafeEqual(hash(header),hash('Bearer '+secret));
}

export function createVapiWebhook({store,config}) {
  async function tool(call,item) {
    const name=item.function?.name;
    let args=item.function?.arguments || {};
    if (typeof args==='string') { try { args=JSON.parse(args); } catch { return {error:'Invalid tool arguments'}; } }
    if (!args || typeof args!=='object' || Array.isArray(args)) return {error:'Invalid tool arguments'};
    if (name==='get_quote_delivery_status') {
      const jobs=await store.deliveries(call.lead_id);
      const status=channel=>jobs.find(j=>j.channel===channel)?.status || 'not_queued';
      return {email:status('client_email'),sms:status('client_sms'),guidance:'accepted means the provider accepted the message, not that the client received it. Say sent only for accepted/delivered; never claim read or guaranteed delivery. Do not resend.'};
    }
    if (name==='request_callback') {
      if (!config.teamEmail || !config.emailReady) return {recorded:false,error:'Team callback notifications are not configured. Do not promise a callback.'};
      const preference=text(args.preferred_time,300,'the callback preference');
      const lead=await store.lead(call.lead_id);
      await store.callback(call.id,preference,{to:config.teamEmail,subject:'AI call callback request | '+lead.reference,text:`Reference: ${lead.reference}\nName: ${lead.contact.name}\nPhone: ${lead.contact.phone}\nRequested time: ${preference}\nThis is a request, not a confirmed appointment.`},config.emailReady);
      return {recorded:true,appointment_confirmed:false};
    }
    if (name==='stop_future_calls') { await store.suppress(call.id); return {recorded:true,future_calls_stopped:true}; }
    if (name==='record_call_summary') {
      const summary=text(args.summary,2000,'the call summary');
      const type=['property_buyer','property_seller','family_transfer','existing_customer','other','unclear'].includes(args.enquiry_type)?args.enquiry_type:'unclear';
      await store.event(call.provider_id,'accepted',{summary,structured_output:{enquiry_type:type,requested_bhavesh:args.requested_bhavesh===true,outcome:text(args.outcome,200,'the call outcome',false)||null}});
      return {recorded:true};
    }
    return {error:'Unsupported tool. No action taken.'};
  }
  return async function handle(body) {
    if (!store) throw new HttpError(503,'Call database unavailable.');
    const message=body?.message;
    if (!message || typeof message.type!=='string') throw new HttpError(400,'Invalid Vapi message.');
    if (!['status-update','end-of-call-report','tool-calls'].includes(message.type)) return {received:true};
    const id=message.call?.id;
    if (typeof id!=='string' || !/^[\w-]{1,100}$/.test(id)) throw new HttpError(400,'Invalid call identifier.');
    // Only provider IDs previously acknowledged by our worker can access an enquiry.
    const call=await store.byProvider(id);
    if (!call) throw new HttpError(503,'Call acknowledgement pending. Retry this event.');
    if (message.type==='tool-calls') {
      if (!Array.isArray(message.toolCallList) || message.toolCallList.length>10) throw new HttpError(400,'Invalid tool calls.');
      const results=[];
      for (const item of message.toolCallList) {
        if (typeof item.id!=='string' || item.id.length>100) throw new HttpError(400,'Invalid tool identifier.');
        let result;
        try { result=await tool(call,item); }
        catch { result={error:'Action could not be confirmed. Do not claim success or promise a callback.'}; }
        results.push({name:item.function?.name,toolCallId:item.id,result:JSON.stringify(result)});
      }
      return {results};
    }
    const status=message.type==='end-of-call-report'?'ended':providerStatus(message.status);
    if (status) await store.event(id,status,callDetails(message));
    return {received:true};
  };
}
