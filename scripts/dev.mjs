import { spawn } from 'node:child_process';
const api=spawn(process.execPath,['--env-file-if-exists=.env','--watch','server/index.mjs'],{stdio:'inherit'});
const web=spawn(process.execPath,['node_modules/vite/bin/vite.js',...process.argv.slice(2)],{stdio:'inherit'});
let stopping=false;
const stop=()=>{if(stopping)return;stopping=true;api.kill();web.kill();};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
for(const child of [api,web])child.on('exit',code=>{stop();process.exitCode=code || 0;});
