import { createServer } from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import { resolve,extname,sep } from 'node:path';
import { HttpError } from './validation.mjs';
import { verifyVapiAuth } from './vapi-webhook.mjs';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.pdf':'application/pdf'};
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function readBody(req,limit=16384) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415,'Use application/json.');
  let body='';
  for await (const chunk of req) {body+=chunk;if(Buffer.byteLength(body)>limit) throw new HttpError(413,'Your request is too long.');}
  try{return JSON.parse(body);}catch{throw new HttpError(400,'Invalid request.');}
}
export function createHttpServer({config,service,vapiWebhook,log=console.error,staticRoot=resolve('dist')}) {
  const buckets=new Map();
  const allowed=new Set([config.origin,...(!config.production?['http://localhost:5173','http://127.0.0.1:5173','http://localhost:4174','http://127.0.0.1:4174']:[])]);
  const server=createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('X-Frame-Options','DENY');
    if(config.production)res.setHeader('Strict-Transport-Security','max-age=31536000');
    try {
      const url=new URL(req.url,'http://localhost');
      const path=url.pathname;
      if(path.startsWith('/api/')) {
        // Server-to-server traffic has no browser Origin. Authenticate before reading its body.
        if (path==='/api/vapi/webhook' && req.method==='POST') {
          if (!verifyVapiAuth(req.headers.authorization,config.vapi?.webhookSecret)) throw new HttpError(401,'Unauthorised.');
          if (!vapiWebhook) throw new HttpError(503,'Call service unavailable.');
          return json(res,200,await vapiWebhook(await readBody(req,262144)));
        }
        const ip=config.trustProxy?String(req.headers['x-forwarded-for'] || req.socket.remoteAddress).split(',').at(-1).trim():req.socket.remoteAddress;
        const now=Date.now();
        if(buckets.size>10000)for(const [key,value] of buckets)if(value.until<now)buckets.delete(key);
        let bucket=buckets.get(ip);
        if(!bucket||bucket.until<now){if(buckets.size>=10000&&!buckets.has(ip))throw new HttpError(429,'Please try again shortly.');bucket={count:0,until:now+60000};buckets.set(ip,bucket);}
        if(++bucket.count>60)throw new HttpError(429,'Too many requests. Please try again shortly.');
        if(req.method==='GET'&&path==='/api/config')return json(res,200,{storageAvailable:config.databaseReady,smsEnabled:config.smsReady,emailEnabled:config.emailReady,turnstileSiteKey:config.turnstileSiteKey,aiCallsEnabled:config.vapi?.enabled || false});
        if(req.method==='GET'&&path==='/api/health')return json(res,config.databaseReady?200:503,{status:config.databaseReady?'configured':'credentials_required'});
        const optout=path.match(/^\/api\/unsubscribe\/([\da-f]{64})$/);
        if(optout&&req.method==='GET'){
          res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});
          return res.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Raikan text preferences</title><main style="max-width:420px;margin:70px auto;padding:24px;font:18px/1.6 system-ui;color:#16374b"><h1>Stop Raikan texts?</h1><p>Confirm below to stop further automated text messages to this number.</p><form method="post"><button style="padding:14px 20px;border:0;background:#006c88;color:white;border-radius:8px;font:inherit">Stop text messages</button></form></main></html>');
        }
        if(!['POST','PUT'].includes(req.method))throw new HttpError(404,'Not found.');
        let localOrigin=false;
        if(!config.production){try{const origin=new URL(req.headers.origin);localOrigin=origin.protocol==='http:'&&['localhost','127.0.0.1'].includes(origin.hostname);}catch{}}
        if(!allowed.has(req.headers.origin)&&!localOrigin)throw new HttpError(403,'This request is not allowed.');
        if(optout&&req.method==='POST'){
          // Body content is not needed; the secret token identifies the recipient.
          await service.unsubscribe(optout[1]);
          res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
          return res.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Texts stopped</title><main style="max-width:420px;margin:70px auto;padding:24px;font:18px/1.6 system-ui;color:#16374b"><h1>Your preference is saved.</h1><p>You will not receive further automated texts from Raikan. A message already being sent may still arrive.</p><p>For assistance, call 08 7076 9899.</p></main></html>');
        }
        const body=await readBody(req);
        if(req.method==='POST'&&['/api/quotes','/api/callbacks'].includes(path))return json(res,202,await service.create(body,req.headers['idempotency-key'],ip,path==='/api/quotes'?'quote':'callback'));
        const match=path.match(/^\/api\/leads\/([\da-f-]{36})\/(status|intent|onboarding|callback)$/);
        if(match){
          const token=String(req.headers.authorization || '').replace(/^Bearer /,'');
          const actions={status:()=>service.status(match[1],token),intent:()=>service.intent(match[1],token),onboarding:()=>service.onboarding(match[1],token,body),callback:()=>service.callback(match[1],token,body)};
          return json(res,200,await actions[match[2]]());
        }
        throw new HttpError(404,'Not found.');
      }
      if(!['GET','HEAD'].includes(req.method))throw new HttpError(405,'Method not allowed.');
      // Never expose source, credentials, temporary files or server code.
      const root=resolve(staticRoot);
      const requested=resolve(root,'.'+decodeURIComponent(path));
      if((requested!==root&&!requested.startsWith(root+sep))||path.includes('..')||path.split('/').some(part=>part.startsWith('.')))throw new HttpError(404,'Not found.');
      let file=path==='/'?resolve(root,'index.html'):requested;
      try{if(!(await stat(file)).isFile())throw new Error();}catch{if(extname(path))throw new HttpError(404,'Not found.');file=resolve(root,'index.html');}
      const data=await readFile(file).catch(()=>{throw new HttpError(404,'Build the frontend first with npm run build.');});
      res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':path.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://challenges.cloudflare.com; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com https://ipapi.co https://api.country.is; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"});
      res.end(req.method==='HEAD'?undefined:data);
    }catch(error){
      if(!(error instanceof HttpError))log('Request failed; check server configuration and database migration.');
      if(!res.headersSent)json(res,error.status || 500,{error:error instanceof HttpError?error.message:'The service is temporarily unavailable. Please call 08 7076 9899.'});
      else res.end();
    }
  });
  server.requestTimeout=20000;server.headersTimeout=10000;
  return server;
}
