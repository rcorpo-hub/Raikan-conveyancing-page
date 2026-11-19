import { createClientMessages } from './messages.js';
import { feeVersion, getBreakdown } from './config.js';
let lead;
const analytics = new EventTarget();
const allowedAttributionKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
const query = new URLSearchParams(location.search);
const attribution = Object.fromEntries(allowedAttributionKeys.flatMap((key) => {
  const value = query.get(key);
  return value && value.length <= 150 ? [[key, value]] : [];
}));

export function track(name, { service, step, entry } = {}) {
  const detail = { event: name, service, step, entry, mode: 'preview' };
  analytics.dispatchEvent(new CustomEvent('raikan:conversion', { detail }));
  window.dispatchEvent(new CustomEvent('raikan:conversion', { detail }));
}

// This preview adapter keeps contact data in page memory. No transmission or storage API.
export const workflow = {
  createQuote({ service, choice, contact, callback }) {
    lead = { reference: 'DEMO-' + crypto.randomUUID().slice(0, 8).toUpperCase(), service, choice, contact, callback, attribution, createdAt: Date.now() };
    lead.feeVersion = feeVersion;
    lead.feeBreakdown = getBreakdown(service);
    lead.communicationConsent = { purpose: 'quote_email_sms_and_enquiry_followup', requestedAt: lead.createdAt };
    lead.deliveryStatus = 'preview_only';
    lead.messages = createClientMessages(lead);
    track('lead_created', { service });
    track('quote_generated', { service });
    if (callback) track('callback_requested', { service, entry: 'quote' });
    return lead;
  },
  requestCallback({ name, phone, time }) {
    if (lead) lead.callback = { name, phone, time, requestedAt: Date.now() };
    track('callback_requested', { service: lead?.service, entry: 'dialog' });
  },
  recordIntent() {
    if (lead && !lead.intentAt) {
      lead.intentAt = Date.now();
      lead.onboardingStatus = 'incomplete';
      lead.followUpEligibleAt = lead.intentAt + 48 * 60 * 60 * 1000;
      track('proceed_intent_recorded', { service: lead.service });
    }
  },
  saveOnboarding(draft, completed = false) {
    if (!lead) return;
    lead.onboardingDraft = draft;
    if (completed) {
      lead.onboardingStatus = 'details_completed';
      delete lead.followUpEligibleAt;
    }
  },
  reset() { lead = undefined; },
};
