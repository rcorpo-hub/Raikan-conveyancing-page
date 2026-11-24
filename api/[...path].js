import { readConfig } from '../server/config.mjs';
import { createStore } from '../server/store.mjs';
import { createEnquiryService } from '../server/enquiries.mjs';
import { createHttpServer } from '../server/http.mjs';
import { createSinch } from '../server/sinch.mjs';
import { createMailer } from '../server/email.mjs';
import { createWorker } from '../server/worker.mjs';

// Vercel Node Function adapter. The shared HTTP handler serves /api/* routes.
const config=readConfig();
const store=createStore(config);
const service=createEnquiryService({store,config});
const deliveryWorker=createWorker({store,config,sinch:createSinch(config),mailer:config.emailReady?createMailer(config):null});
const handler=createHttpServer({config,service,runDelivery:()=>deliveryWorker.runOnce()});

export default function api(req,res) {
  handler.emit('request',req,res);
}
