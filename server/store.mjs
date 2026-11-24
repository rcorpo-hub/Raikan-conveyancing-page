import { createClient } from '@supabase/supabase-js';
import { HttpError } from './validation.mjs';
const check = (result) => {
  if (result.error) {
    if (result.error.message?.includes('QUOTE_RATE_LIMIT')) throw new HttpError(429,'Too many enquiries. Please call us or try again later.');
    if (result.error.message?.includes('QUOTE_IDEMPOTENCY_CONFLICT')) throw new HttpError(409,'This request has changed. Please start a new enquiry.');
    const error = new HttpError(503,'We could not save your enquiry. Please try again or call 08 7076 9899.');
    error.code = /^[A-Z0-9_]{1,40}$/.test(result.error.code || '') ? result.error.code : 'SUPABASE_REQUEST_FAILED';
    throw error;
  }
  return result.data;
};
export function createStore(config) {
  if (!config.databaseReady) return null;
  const db = createClient(config.supabaseUrl,config.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(15000)})}});
  return {
    async create(lead,jobs,actor) { return check(await db.rpc('create_quote_enquiry',{p_lead:lead,p_jobs:jobs,p_actor:actor,p_hour_limit:config.requestLimit,p_phone_limit:config.phoneLimit})); },
    async get(id,hash) { return check(await db.from('quote_leads').select('*').eq('id',id).eq('access_token_hash',hash).maybeSingle()); },
    async update(id,hash,patch) { return check(await db.from('quote_leads').update(patch).eq('id',id).eq('access_token_hash',hash).select('id').maybeSingle()); },
    async jobs(id) { return check(await db.from('quote_outbox').select('channel,status').eq('lead_id',id)); },
    async claim() { return check(await db.rpc('claim_quote_job'))?.[0]; },
    async finish(id,patch) { return check(await db.from('quote_outbox').update({...patch,updated_at:new Date().toISOString()}).eq('id',id).eq('status','processing')); },
    async queueCallback(lead,payload,status) { return check(await db.from('quote_outbox').upsert({lead_id:lead.id,channel:'callback_report',payload,status},{onConflict:'lead_id,channel',ignoreDuplicates:true})); },
    async suppressed(leadId) {
      const lead = check(await db.from('quote_leads').select('phone_hash').eq('id',leadId).single());
      return Boolean(check(await db.from('quote_sms_suppressions').select('phone_hash').eq('phone_hash',lead.phone_hash).maybeSingle()));
    },
    async accepted() { return check(await db.from('quote_outbox').select('id,provider_id').eq('channel','client_sms').eq('status','accepted').or('checked_at.is.null,checked_at.lt.'+new Date(Date.now()-60000).toISOString()).limit(20)); },
    async delivery(id,status) { return check(await db.from('quote_outbox').update({status,checked_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('status','accepted')); },
    async suppress(hash) { return check(await db.rpc('suppress_quote_sms',{p_token_hash:hash})); },
    async maintenance() { return check(await db.from('quote_rate_limits').delete().lt('expires_at',new Date().toISOString())); },
  };
}
