import { createVapiToolHandler } from '../_shared/vapi-tools.js';
Deno.serve(createVapiToolHandler('log', { env: name => Deno.env.get(name) }));
