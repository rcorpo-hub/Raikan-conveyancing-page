import { createClient } from '@supabase/supabase-js';
export function createCallStore(config) {
  if (!config.databaseReady) return null;
  const db=createClient(config.supabaseUrl,config.supabaseKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(15000)})}});
  const check = result => { if (result.error) throw new Error('Call database operation failed'); return result.data; };
  return {
    async claim() { return check(await db.rpc('claim_quote_call'))?.[0]; },
    async lead(id) { return check(await db.from('quote_leads').select('id,reference,kind,service,choice,contact,phone_hash,consent').eq('id',id).single()); },
    async finish(id,patch) { return check(await db.from('quote_calls').update({...patch,updated_at:new Date().toISOString()}).eq('id',id).eq('status','processing')); },
    async suppressed(hash) { return !!check(await db.from('quote_call_suppressions').select('phone_hash').eq('phone_hash',hash).maybeSingle()); },
    async byProvider(id) { return check(await db.from('quote_calls').select('*').eq('provider_id',id).maybeSingle()); },
    async active() { return check(await db.from('quote_calls').select('id,provider_id').in('status',['accepted','ringing','in-progress']).or('checked_at.is.null,checked_at.lt.'+new Date(Date.now()-60000).toISOString()).limit(10)); },
    async event(id,status,details={}) { return check(await db.rpc('update_quote_call',{p_provider:id,p_status:status,p_details:details})); },
    async deliveries(id) { return check(await db.from('quote_outbox').select('channel,status').eq('lead_id',id).in('channel',['client_email','client_sms'])); },
    async suppress(id) { check(await db.rpc('suppress_quote_calls',{p_call:id})); },
    async callback(id,preference,report,ready) { check(await db.rpc('record_quote_call_callback',{p_call:id,p_preference:preference,p_report:report,p_email_ready:ready})); },
  };
}
