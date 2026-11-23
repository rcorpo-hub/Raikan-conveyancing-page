import { mkdir, writeFile } from 'node:fs/promises';
import { readVapiConfig } from '../server/vapi-config.mjs';
import { buildAssistant } from '../server/vapi-assistant.mjs';

// Offline export only: never provisions an assistant or places a call.
const config={vapi:readVapiConfig({...process.env,VAPI_ENABLED:'false'})};
await mkdir('tmp',{recursive:true});
await writeFile('tmp/vapi-assistant.json',JSON.stringify(buildAssistant(config,process.env),null,2)+'\n');
console.log('Exported tmp/vapi-assistant.json. No network request or call was made.');
if (!process.env.VAPI_VOICE_ID) console.log('Choose an Australian voice in Vapi before publishing; this export leaves voice selection to the dashboard.');
if (!config.vapi.serverUrl || !config.vapi.credentialId) console.log('Configure the authenticated HTTPS Server URL before testing tools.');
