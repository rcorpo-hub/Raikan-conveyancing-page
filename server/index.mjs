import { readConfig } from './config.mjs';
import { createStore } from './store.mjs';
import { createEnquiryService } from './enquiries.mjs';
import { createHttpServer } from './http.mjs';
import { createSinch } from './sinch.mjs';
import { createMailer } from './email.mjs';
import { createWorker } from './worker.mjs';
const config=readConfig();
const store=createStore(config);
const service=createEnquiryService({store,config});
const worker=createWorker({store,config,sinch:createSinch(config),mailer:config.emailReady?createMailer(config):null});
const server=createHttpServer({config,service});
server.listen(config.port,config.host,()=>{
  console.log(`Raikan API listening on port ${config.port}. Database ${config.databaseReady?'configured':'not configured'}; SMS ${config.smsReady?'enabled':'disabled'}; email ${config.emailReady?'enabled':'disabled'}.`);
  if(config.workerEnabled&&store)worker.start();
});
let stopping=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{
  if(stopping)return;stopping=true;
  server.close();
  await worker.stop();
  process.exit(0);
});
