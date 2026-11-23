import { readConfig } from './config.mjs';
import { createStore } from './store.mjs';
import { createEnquiryService } from './enquiries.mjs';
import { createHttpServer } from './http.mjs';
import { createSinch } from './sinch.mjs';
import { createMailer } from './email.mjs';
import { createWorker } from './worker.mjs';
import { createVapi } from './vapi.mjs';
import { createCallStore } from './vapi-store.mjs';
import { createCallWorker } from './vapi-worker.mjs';
import { createVapiWebhook } from './vapi-webhook.mjs';
const config=readConfig();
const store=createStore(config);
const service=createEnquiryService({store,config});
const worker=createWorker({store,config,sinch:createSinch(config),mailer:config.emailReady?createMailer(config):null});
// Do not touch the new call tables while calling is disabled.
const callStore=config.vapi.enabled?createCallStore(config):null;
const callWorker=createCallWorker({store:callStore,vapi:createVapi(config),config});
const server=createHttpServer({config,service,vapiWebhook:createVapiWebhook({store:callStore,config})});
server.listen(config.port,config.host,()=>{
  console.log(`Raikan API listening on port ${config.port}. Database ${config.databaseReady?'configured':'not configured'}; SMS ${config.smsReady?'enabled':'disabled'}; email ${config.emailReady?'enabled':'disabled'}.`);
  if(config.workerEnabled&&store)worker.start();
  if(config.workerEnabled&&callStore)callWorker.start();
  console.log(`AI calling ${config.vapi.enabled?(config.vapi.testMode?'test numbers only':'enabled'):'disabled'}.`);
});
let stopping=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{
  if(stopping)return;stopping=true;
  server.close();
  await Promise.all([worker.stop(),callWorker.stop()]);
  process.exit(0);
});
