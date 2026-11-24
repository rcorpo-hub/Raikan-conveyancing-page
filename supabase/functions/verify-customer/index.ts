import { createVapiToolHandler } from '../_shared/vapi-tools.js';
Deno.serve(createVapiToolHandler('verify', { env: name => Deno.env.get(name) }));
