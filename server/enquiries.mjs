import { createHmac, randomUUID } from 'node:crypto';
import { validateQuote, validateOnboarding, digest, HttpError } from './validation.mjs';
import { createClientMessages } from '../src/reference/messages.js';
import { feeVersion,getBreakdown,getOptionalCharges } from '../src/reference/config.js';
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export function createEnquiryService({store,config,fetchImpl=fetch}) {
  const signed = value => createHmac('sha256',config.tokenSecret).update(value).digest('hex');
  const requireStore = () => { if (!store) throw new HttpError(503,'Our online enquiry service is not available yet. Please call 08 7076 9899.'); };
  async function verifyCaptcha(token,requestKey) {
    if (!config.turnstileSecret) return;
    if (typeof token !== 'string' || token.length>2048 || !token) throw new HttpError(400,'Please complete the security check.');
    let data;
    try {
      const response=await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:config.turnstileSecret,response:token,idempotency_key:requestKey}),signal:AbortSignal.timeout(10000)});
      data=await response.json();
    } catch { throw new HttpError(503,'The security check is temporarily unavailable. Please try again.'); }
    if (!data.success || data.hostname!==new URL(config.origin).hostname || data.action!=='quote_enquiry') throw new HttpError(400,'The security check expired. Please try again.');
  }
  async function authorised(id,token) {
    requireStore();
    if (!uuid.test(id) || typeof token!=='string' || !/^[\da-f]{64}$/.test(token)) throw new HttpError(404,'Enquiry not found.');
    const lead=await store.get(id,digest(token));
    if (!lead) throw new HttpError(404,'Enquiry not found.');
    return lead;
  }
  return {
    async create(input,key,ip,kind='quote') {
      requireStore();
      if (!uuid.test(key || '')) throw new HttpError(400,'A valid request identifier is required.');
      const value=validateQuote(input,kind);
      await verifyCaptcha(input.captchaToken,key);
      const accessToken=signed('access:'+key), unsubscribeToken=signed('unsubscribe:'+key);
      const reference='RAI-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+randomUUID().slice(0,8).toUpperCase();
      const lead={...value,reference,idempotency_key:key,request_hash:digest(JSON.stringify(value)),access_token_hash:digest(accessToken),unsubscribe_hash:digest(unsubscribeToken),phone_hash:signed('phone:'+value.contact.phone),consent:{purpose:'quote_email_sms_and_enquiry_followup',version:'2026-11-20',requested_at:new Date().toISOString()},fee_snapshot:{version:feeVersion,rows:kind==='quote'?[...getBreakdown(value.service,value.choice),...getOptionalCharges(value.service)]:[]}};
      let messages;
      if (kind==='quote') messages=createClientMessages(lead);
      else messages={sms:{to:value.contact.phone,text:`Raikan: Your callback request ${reference} has been received. Our team will contact you during office hours. For urgent questions, call 08 7076 9899.`},teamEmail:{subject:`Callback requested | ${reference}`,text:`Name: ${value.contact.name}\nPhone: ${value.contact.phone}\nPreferred time: ${value.time || 'Any time'}`} };
      let sms=messages.sms.text;
      sms+=`\nStop texts: ${config.origin}/api/unsubscribe/${unsubscribeToken}`;
      const jobs=[];
      if (messages.email) jobs.push({channel:'client_email',status:config.emailReady?'pending':'disabled',payload:messages.email});
      jobs.push({channel:'client_sms',status:config.smsReady?'pending':'disabled',depends_on:null,payload:{to:value.contact.phone,text:sms,reference}});
      if (config.teamEmail) jobs.push({channel:'team_email',status:config.emailReady?'pending':'disabled',payload:{...messages.teamEmail,to:config.teamEmail}});
      const saved=await store.create(lead,jobs,signed('ip:'+ip));
      return {id:saved.id,reference:saved.reference,accessToken,service:value.service,choice:value.choice,delivery:await store.jobs(saved.id)};
    },
    async status(id,token) { await authorised(id,token); return {delivery:await store.jobs(id)}; },
    async intent(id,token) { const lead=await authorised(id,token); await store.update(id,lead.access_token_hash,{intent_at:lead.intent_at || new Date().toISOString()}); return {saved:true}; },
    async onboarding(id,token,input) {
      const lead=await authorised(id,token);
      const details=validateOnboarding(input);
      if (input.contact) details.contact=validateQuote({service:lead.service,choice:lead.choice,contact:input.contact,consent:true}).contact;
      await store.update(id,lead.access_token_hash,{onboarding:{...details,updated_at:new Date().toISOString()}});
      return {saved:true};
    },
    async callback(id,token,input) {
      const lead=await authorised(id,token);
      const value=validateQuote({...input,consent:true,contact:input.contact},'callback');
      await store.update(id,lead.access_token_hash,{callback:true,callback_time:value.time});
      if (config.teamEmail) await store.queueCallback(lead,{to:config.teamEmail,subject:`Callback requested | ${lead.reference}`,text:`Reference: ${lead.reference}\nName: ${value.contact.name}\nPhone: ${value.contact.phone}\nPreferred time: ${value.time || 'Any time'}`},config.emailReady?'pending':'disabled');
      return {saved:true};
    },
    async unsubscribe(token) { requireStore(); if (!/^[\da-f]{64}$/.test(token)) throw new HttpError(404,'Link not found.'); if (!await store.suppress(digest(token))) throw new HttpError(404,'Link not found.'); return {saved:true}; },
  };
}
