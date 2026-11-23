import { callAllowed, nextCallTime } from './vapi-config.mjs';
import { providerStatus, callDetails } from './vapi.mjs';

export function createCallWorker({store,vapi,config,now=()=>new Date(),log=console.error}) {
  let running=false,timer;
  async function deliver(job) {
    const lead=await store.lead(job.lead_id);
    if (!config.vapi.enabled) { await store.finish(job.id,{status:'disabled'}); return; }
    if (!lead.consent.ai_call?.granted || !callAllowed(lead.contact.phone,config.vapi) || await store.suppressed(lead.phone_hash)) {
      await store.finish(job.id,{status:'suppressed'}); return;
    }
    const due=nextCallTime(now(),config.vapi);
    if (due>now()) { await store.finish(job.id,{status:'pending',available_at:due.toISOString()}); return; }
    let id;
    try { id=await vapi.create(job,lead); }
    catch(error) {
      const retry=error.outcome==='retry' && job.attempts<3;
      await store.finish(job.id,{status:retry?'pending':error.outcome==='unknown'?'unknown':'failed',last_error:error.code || 'vapi_error',...(retry?{available_at:new Date(now().getTime()+60000*job.attempts).toISOString()}: {})});
      return;
    }
    // Keep this acknowledgement outside the retry path; lost DB writes must not dial twice.
    await store.finish(job.id,{status:'accepted',provider_id:id,last_error:null});
  }
  async function runOnce() {
    if (running || !store || !config.vapi.enabled) return;
    running=true;
    try {
      for (let i=0;i<3;i++) {
        const job=await store.claim();
        if (!job) break;
        try { await deliver(job); } catch { log('Call job could not be saved; inspect unknown jobs before retrying.'); }
      }
      for (const job of await store.active()) {
        try {
          const call=await vapi.get(job.provider_id);
          const status=providerStatus(call.status);
          if (status) await store.event(job.provider_id,status,callDetails(call));
        } catch { log('Call status check deferred.'); }
      }
    } catch { log('Call queue unavailable; check the Vapi database migration.'); }
    finally { running=false; }
  }
  return {
    runOnce,
    start() { if (config.vapi.enabled) { timer=setInterval(runOnce,config.workerInterval);timer.unref();void runOnce(); } },
    async stop() { clearInterval(timer);while(running)await new Promise(resolve=>setTimeout(resolve,50)); },
  };
}
