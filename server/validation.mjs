import { createHash } from 'node:crypto';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { services } from '../src/reference/config.js';
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const digest = value => createHash('sha256').update(value).digest('hex');
export function text(value, max, label, required = true) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new HttpError(400, `Please check ${label}.`);
  return value.trim();
}
export function phone(value) {
  const parsed = parsePhoneNumberFromString(text(value, 30, 'your mobile number'), 'AU');
  if (!parsed?.isValid()) throw new HttpError(400, 'Please enter a valid mobile number, including its country code.');
  return parsed.number;
}
export function validateQuote(input, kind = 'quote') {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'Invalid enquiry.');
  if (input.website) throw new HttpError(400, 'Please check your enquiry.');
  if (input.consent !== true) throw new HttpError(400, 'Please agree to receive your quote and enquiry follow-up.');
  if (input.aiCallConsent !== undefined && typeof input.aiCallConsent !== 'boolean') throw new HttpError(400, 'Please check your AI call preference.');
  const contact = input.contact || {};
  const email = kind === 'quote' ? text(contact.email, 254, 'your email address').toLowerCase() : '';
  if (email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new HttpError(400, 'Please enter a valid email address.');
  const service = kind === 'callback' ? 'callback' : text(input.service, 30, 'your service');
  let choice = kind === 'callback' ? '' : text(input.choice, 40, 'your transaction type');
  if (choice === 'former_spouse') choice = 'former';
  if (kind === 'quote' && (!Object.hasOwn(services, service) || !services[service].choices.some(([key]) => key === choice))) throw new HttpError(400, 'Please choose a valid service and transaction type.');
  const attribution = {};
  for (const key of ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid']) {
    if (typeof input.attribution?.[key] === 'string') attribution[key] = input.attribution[key].slice(0,150);
  }
  const time = input.time || '';
  if (kind === 'callback' && !['', 'morning', 'afternoon'].includes(time)) throw new HttpError(400, 'Please choose a callback time.');
  return { kind, service, choice, contact: { name: text(contact.name,110,'your name'), email, phone: phone(contact.phone), notes: text(contact.notes,2000,'your questions',false), propertyValue: text(contact.propertyValue,60,'the property value',false) }, callback: kind === 'callback' || input.callback === true, attribution, time, ...(input.aiCallConsent !== undefined ? {aiCallConsent:input.aiCallConsent} : {}) };
}
export function validateOnboarding(input) {
  const result = { suburb: text(input.suburb,110,'the property suburb',false), date: text(input.date,10,'the settlement date',false), completed: input.completed === true };
  if (result.date && (!/^\d{4}-\d{2}-\d{2}$/.test(result.date) || Number.isNaN(Date.parse(result.date)) || new Date(result.date).toISOString().slice(0,10)!==result.date)) throw new HttpError(400,'Please check the settlement date.');
  return result;
}
