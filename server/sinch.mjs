import { parsePhoneNumberFromString } from 'libphonenumber-js';
export class DeliveryError extends Error {
  constructor(code, outcome = 'failed') { super(code); this.code = code; this.outcome = outcome; }
}
const gsm = new Set('@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà');
const extended = new Set('^{}\\[~]|€\f');
export function smsSegments(message) {
  let length = 0;
  for (const char of message) {
    if (gsm.has(char)) length++;
    else if (extended.has(char)) length += 2;
    else return message.length <= 70 ? 1 : Math.ceil(message.length / 67);
  }
  return length <= 160 ? 1 : Math.ceil(length / 153);
}
export function buildSinchMessage(job, config) {
  const parsed = parsePhoneNumberFromString(job.to);
  if (!parsed || !config.allowedCallingCodes.includes(parsed.countryCallingCode)) throw new DeliveryError('destination_not_enabled');
  if (smsSegments(job.text) > config.maxSegments || job.text.length > 5000) throw new DeliveryError('sms_length_budget_exceeded');
  const base = { destination_number: job.to, delivery_report: true, metadata: { quote_reference: job.reference } };
  if (config.sender) Object.assign(base, { source_number: config.sender, source_number_type: config.senderType });
  if (config.channel === 'MMS') return { ...base, format:'MMS', content:job.text, subject:'Your Raikan quote', media:[config.mediaUrl] };
  if (config.channel === 'RCS') {
    if (job.text.length > 2000) throw new DeliveryError('rcs_description_too_long');
    const suggestions = [{ type:'dial', text:'Call Raikan', phone_number:'+61870769899' }];
    return { ...base, format:'RCS', rich_content: { card: { title: config.rcsTitle, description: job.text, ...(config.mediaUrl ? { media: { url:config.mediaUrl }, height:'MEDIUM' } : {}), suggestions } }, fallback_message: { content:job.text } };
  }
  return { ...base, format:'SMS', content:job.text };
}
export function buildSinchMessages(job, config) {
  const texts = Array.isArray(job.texts) && job.texts.length ? job.texts : [job.text];
  return texts.map((text) => buildSinchMessage({ ...job, text }, config));
}
export function createSinch(config, fetchImpl = fetch) {
  const headers = { Authorization:'Basic '+Buffer.from(`${config.sinchKey}:${config.sinchSecret}`).toString('base64'), 'Content-Type':'application/json', Accept:'application/json' };
  return {
    async send(payload) {
      const messages = buildSinchMessages(payload, config);
      let response;
      try { response = await fetchImpl(config.sinchUrl+'/v1/messages', { method:'POST', headers, body:JSON.stringify({messages}), signal:AbortSignal.timeout(20000) }); }
      catch { throw new DeliveryError('sinch_submission_uncertain', 'unknown'); }
      if (response.status === 429) throw new DeliveryError('sinch_rate_limited','retry');
      if (response.status >= 500) throw new DeliveryError('sinch_server_outcome_uncertain','unknown');
      if (response.status !== 202) throw new DeliveryError('sinch_http_'+response.status);
      const result = await response.json().catch(() => null);
      const validIds = Array.isArray(result?.messages) && result.messages.length === messages.length && result.messages.every((item) => /^[\da-f]{8}-[\da-f-]{27}$/i.test(item?.message_id || ''));
      if (!validIds) throw new DeliveryError('sinch_missing_message_id','unknown');
      return { providerId: result.messages[0].message_id, status:'accepted' };
    },
    async status(id) {
      if (!/^[\da-f]{8}-[\da-f-]{27}$/i.test(id)) throw new Error('Invalid provider message ID');
      const res = await fetchImpl(config.sinchUrl+'/v1/messages/'+id,{headers,signal:AbortSignal.timeout(10000)});
      if (!res.ok) throw new Error('sinch_status_http_'+res.status);
      const data = await res.json();
      if (['delivered','read'].includes(data.status)) return 'delivered';
      if (['failed','expired','cancelled','rejected'].includes(data.status)) return 'failed';
      return 'accepted';
    },
  };
}
