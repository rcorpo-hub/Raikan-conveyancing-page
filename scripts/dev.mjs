import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
const apiHost=process.env.HOST || '127.0.0.1';
const apiPort=Number(process.env.PORT || 3001);
function apiAlreadyRunning() {
  return new Promise(resolve=>{
    const socket=createConnection({host:apiHost,port:apiPort});
    socket.setTimeout(500);
    socket.once('connect',()=>{socket.destroy();resolve(true);});
    socket.once('timeout',()=>{socket.destroy();resolve(false);});
    socket.once('error',()=>resolve(false));
  });
}
const reuseApi=await apiAlreadyRunning();
if(reuseApi)console.log(`API already listening on ${apiHost}:${apiPort}; reusing it.`);
const api=reuseApi?null:spawn(process.execPath,['--env-file-if-exists=.env','--watch','server/index.mjs'],{stdio:'inherit'});
const web=spawn(process.execPath,['node_modules/vite/bin/vite.js',...process.argv.slice(2)],{stdio:'inherit'});
let stopping=false;
const stop=()=>{if(stopping)return;stopping=true;api?.kill();web.kill();};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
for(const child of [api,web].filter(Boolean))child.on('exit',code=>{stop();process.exitCode=code || 0;});
web.on('exit',code=>{stop();process.exitCode=code || 0;});
