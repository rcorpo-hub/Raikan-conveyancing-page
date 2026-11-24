export function createWorker({store,sinch,mailer,config,log=console.error}) {
  let running = false, timer, lastMaintenance=0, lastQueueWarning=0;
  async function deliver(job) {
    if ((job.channel === 'client_sms' && !config.smsReady) || (job.channel !== 'client_sms' && !config.emailReady)) {
      await store.finish(job.id,{status:'disabled',last_error:'delivery_disabled'}); return;
    }
    if (job.channel === 'client_sms' && await store.suppressed(job.lead_id)) {
      await store.finish(job.id,{status:'suppressed'}); return;
    }
    let result;
    try {
      result = job.channel === 'client_sms' ? await sinch.send(job.payload) : await mailer.send(job.payload,job.id);
    } catch(error) {
      const retry = error.outcome === 'retry' && job.attempts < 5;
      await store.finish(job.id,{status:retry?'pending':error.outcome==='unknown'?'unknown':'failed',last_error:error.code || 'delivery_error',...(retry ? {available_at:new Date(Date.now()+Math.min(3600000,30000*2**job.attempts)).toISOString()} : {})});
      return;
    }
    // A lost database acknowledgement must never trigger a second send.
    await store.finish(job.id,{status:result.status,provider_id:result.providerId,last_error:null});
  }
  async function runOnce() {
    if (running || !store) return;
    running = true;
    try {
      if(store.maintenance&&Date.now()-lastMaintenance>3600000){await store.maintenance();lastMaintenance=Date.now();}
      const batch=[];
      for (let i=0;i<10;i++) {
        const job = await store.claim();
        if (!job) break;
        batch.push(job);
      }
      const results=await Promise.allSettled(batch.map(deliver));
      if(results.some(result=>result.status==='rejected'))log('A delivery result could not be saved; check sending leases before retrying.');
      if (config.smsReady) for (const item of await store.accepted()) {
        try { await store.delivery(item.id,await sinch.status(item.provider_id)); }
        catch { await store.delivery(item.id,'accepted'); }
      }
      lastQueueWarning=0;
    } catch(error) {
      if(Date.now()-lastQueueWarning>=60000){
        const code=/^[A-Z0-9_]{1,40}$/.test(error?.code || '')?error.code:'SUPABASE_QUEUE_UNAVAILABLE';
        log(`Delivery worker could not access its queue (${code}); it will retry.`);
        lastQueueWarning=Date.now();
      }
    }
    finally { running=false; }
  }
  return {
    runOnce,
    start() { timer=setInterval(runOnce,config.workerInterval); timer.unref(); void runOnce(); },
    async stop() { clearInterval(timer); while(running) await new Promise(resolve=>setTimeout(resolve,50)); mailer?.close(); },
  };
}
