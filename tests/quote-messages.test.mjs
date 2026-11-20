import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { getBreakdown } from '../src/reference/config.js';
import { createClientMessages } from '../src/reference/messages.js';

const lead = {reference:'RAI-BUY-EXAMPLE',service:'buy',choice:'below',contact:{name:'Alex <script>alert(1)</script>',email:'sample@example.invalid',phone:'0400000000',notes:'Please call after lunch.'},callback:true};
test('fee wording never presents GST separately or implies a settlement total', () => {
  for (const service of ['buy','sell']) {
    const rows = getBreakdown(service);
    assert.deepEqual(rows[0], ['Our conveyancing fee','$660 + GST']);
    assert(!rows.some(([label]) => /total|^GST$/i.test(label)));
  }
  assert(!getBreakdown('transfer').some(([,amount]) => amount.includes('$660')));
});
test('buyer messages include both existing PDF attachments, safe HTML, costs and callback', () => {
  const result = createClientMessages(lead);
  assert(result.email.text.includes('$660 + GST'));
  assert(result.sms.text.includes('$660 + GST'));
  assert(result.sms.text.includes('File fee: $88.00'));
  assert(result.sms.text.includes('Mortgage registration (if needed): $204.00'));
  assert(!/\$726|\$66\.00|\$600/.test(result.email.text + result.sms.text));
  assert(result.email.html.includes('&lt;script&gt;'));
  assert(!result.email.html.includes('<script>'));
  assert(result.email.text.includes('You asked for a call'));
  assert(result.email.text.includes('Stamp duty & lodgement fees: As charged'));
  assert.equal(result.email.attachments.length,2);
  for (const attachment of result.email.attachments) assert(existsSync(attachment.path));
  assert.equal(result.sms.dependsOn,undefined);
  assert(!result.sms.text.includes('in your email'));
});
test('vendor messages include seller costs and do not attach the purchaser documents', () => {
  const result = createClientMessages({...lead,service:'sell',callback:false});
  assert(result.email.text.includes('Special water meter reading: $25.00'));
  assert(result.sms.text.includes('Special water meter reading: $25.00'));
  assert(result.email.text.includes('Mortgage discharge'));
  assert(result.email.text.includes('https://form1.net.au/pricing/'));
  assert(!result.email.text.includes('Mortgage registration'));
  assert.equal(result.email.attachments.length,0);
});
test('unsupported and incomplete leads cannot produce delivery payloads', () => {
  assert.throws(() => createClientMessages({...lead,service:'invalid'}));
  assert.throws(() => createClientMessages({...lead,reference:''}));
});
