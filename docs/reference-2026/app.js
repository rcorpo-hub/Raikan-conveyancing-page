import { getBreakdown, services } from './config.js';
import { track, workflow } from './preview.js';

const paths = {
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 18.8 18.8 0 0 1-8.2-2.9 18.6 18.6 0 0 1-5.8-5.8A18.8 18.8 0 0 1 3 5a2 2 0 0 1 2-2.2h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.5 2L8.7 10.5a15 15 0 0 0 5.8 5.8l1.3-1.3a2 2 0 0 1 2-.5l2.8.5a2 2 0 0 1 1.4 1.9Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  quote: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-3-2-4 2-4-2-3 2V4a1 1 0 0 1 1-1Z"/><path d="M9 8h6m-6 4h6m-6 4h3"/>',
  house: '<path d="m3 11 9-7 9 7m-2-1v10H5V10m5 10v-6h4v6"/>',
  tag: '<path d="M4 4h8l8 8-8 8-8-8V4Z"/><circle cx="8.5" cy="8.5" r="1"/>',
  transfer: '<path d="M4 8h16m-4-4 4 4-4 4m4 4H4m4-4-4 4 4 4"/>',
  pin: '<path d="M19 10c0 5-7 10-7 10s-7-5-7-10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  message: '<path d="M20 11a8 8 0 0 1-8 8 8.3 8.3 0 0 1-3.5-.8L4 20l1.7-4.5A8 8 0 1 1 20 11Z"/><path d="M9 11h6"/>',
  pointer: '<path d="m8 8 5 13 2-6 6-2L8 8Zm-4 4H2m2-7L2 3m10 1V2m-6 14-2 2m12-12 2-2"/>',
  'receipt-detail': '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm4 5h4m-4 4h4m-4 4h2"/>',
  headset: '<path d="M4 13v-1a8 8 0 0 1 16 0v1m0 4c0 3-2 4-5 4h-2"/><rect x="3" y="11" width="5" height="7" rx="2"/><rect x="16" y="11" width="5" height="7" rx="2"/>',
  key: '<path d="M14 5a5 5 0 1 1-4.5 7.18L4 17.7V21h3v-2h2v-2h2l2.05-2.05A5 5 0 0 1 14 5Z"/><circle cx="15" cy="9" r="1"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3"/>',
};
const icon = (key) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[key] + '</svg>';
const pict = (name) => '<i data-icon="' + name + '">' + icon(name) + '</i>';
const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
const $ = (selector) => document.querySelector(selector);
const dialog = $('#quote');
const dialogContent = $('#dialog-content');
const state = { stage: 'form', service: 'buy', choice: '', lead: null, contact: {}, callback: false, onboarding: {} };
const primaryServices = [['buy', 'Buy'], ['sell', 'Sell'], ['transfer', 'Transfer']];
let exitShown = false;
let dialogTrigger;

function field({ name, label, value, type = 'text', autocomplete = '', required = true }) {
  const length = name === 'email' ? 254 : name === 'phone' ? 24 : 110;
  return `<label class="field"><span>${label}</span><input type="${type}" name="${name}" value="${esc(value)}" autocomplete="${autocomplete || 'off'}" maxlength="${length}" ${required ? 'required' : ''} aria-describedby="${name}-error"><span class="error" id="${name}-error" hidden></span></label>`;
}

function contactFields(includeEmail) {
  return field({ name: 'name', label: 'Full name', value: state.contact.name, autocomplete: 'name' })
    + (includeEmail ? field({ name: 'email', label: 'Email address', type: 'email', value: state.contact.email, autocomplete: 'email' }) : '')
    + field({ name: 'phone', label: 'Australian mobile number', type: 'tel', value: state.contact.phone, autocomplete: 'tel' });
}

const heading = (title, desc = '') => `<h2 id="dialog-title" tabindex="-1">${title}</h2>${desc ? `<p class="lead-in">${desc}</p>` : ''}`;
const back = (stage) => `<button class="back" data-stage="${stage}" type="button">← Back</button>`;
const previewNote = (copy) => `<p class="preview-note">${copy}</p>`;
const submit = (label) => `<button type="submit" class="button full">${label} ${pict('arrow')}</button>`;

function result() {
  const service = services[state.service];
  const choiceName = service.choices.find(([key]) => key === state.choice)?.[1];
  const breakdown = getBreakdown(state.service, state.choice).map(([label, amount]) => `<div><dt>${label}</dt><dd>${amount}</dd></div>`).join('');
  const callbackOption = state.callback
    ? '<p class="mini">Callback selected for this preview.</p>'
    : '<button class="link" type="button" data-callback>Request a callback</button>';
  return `<header class="quote-confirmation">
      <span class="icon-tile">${pict('check-circle')}</span>
      <div>${heading('Thanks for requesting a quote', 'Your quote preview is ready.')}</div>
    </header>
    <p class="quote-result-service">${service.label} · ${choiceName}</p>
    <dl class="breakdown" aria-label="Quote breakdown">${breakdown}</dl>
    <p class="quote-reference">Preview reference ${esc(state.lead.reference)} · South Australia</p>
    ${previewNote('Preview only. Current fees are pending confirmation. No email or SMS was sent.')}
    <div class="card-actions">
      <button class="button full" type="button" data-close>Done</button>
      <div class="quote-follow-up">
        <button class="link" type="button" data-proceed>I’d like to proceed</button>
        ${callbackOption}
        <button class="link" type="button" data-reset>Start a new quote</button>
      </div>
    </div>`;
}

function onboarding() {
  return back('result') + heading('Let’s get things moving', 'Confirm your details and add a little about the property.')
    + previewNote('Your interest is recorded for this preview. Formal engagement is a separate step.')
    + `<form class="form" data-form="onboarding" novalidate>${contactFields(true)}
       ${field({ name: 'suburb', label: 'Property suburb (optional)', value: state.onboarding.suburb, required: false })}
       ${field({ name: 'date', label: 'Expected settlement date (optional)', type: 'date', value: state.onboarding.date, required: false })}
       <p class="mini">Edits are kept while this page stays open.</p>${submit('Complete preview onboarding')}</form>`;
}

function propertyChoices() {
  const service = services[state.service];
  return `<legend>${service.question}</legend><div class="property-options">
    ${service.choices.map(([key, label]) => `<label class="property-option">
      <input type="radio" name="choice" value="${key}" aria-describedby="choice-error" ${state.choice === key ? 'checked' : ''}>
      <span>${label}</span></label>`).join('')}
    </div><p class="error" id="choice-error" role="alert" hidden></p>`;
}

function quoteForm() {
  const options = state.service === 'other' ? [...primaryServices, ['other', 'Other']] : primaryServices;
  return `<header class="quote-modal-header">
    <span class="icon-tile">${pict('quote')}</span>
    <div>${heading('Get a free quote', 'Conveyancing for South Australian property')}</div>
  </header>
  <form class="form quote-form" data-form="contact" novalidate>
    <fieldset class="service-field">
      <legend class="visually-hidden">Choose a conveyancing service</legend>
      <div class="service-options">${options.map(([key, label]) => `<label class="service-option">
        <input type="radio" name="service" value="${key}" ${state.service === key ? 'checked' : ''}>
        <span>${pict(services[key].icon)} ${label}</span></label>`).join('')}</div>
    </fieldset>
    <fieldset class="property-field">${propertyChoices()}</fieldset>
    <fieldset class="contact-field">
      <legend>Your details</legend>
      <div class="contact-grid">${contactFields(true)}</div>
    </fieldset>
    <label class="check-field"><input type="checkbox" name="callback" ${state.callback ? 'checked' : ''}> I’d like a conveyancer to call me.</label>
    <div class="quote-submit">${submit('Show my quote')}<p class="mini">${pict('lock')} Private preview · Use sample details.</p></div>
  </form>`;
}

const screen = {
  form: quoteForm,
  result,
  onboarding,
  complete: () => heading('Thanks for completing the form', 'Your onboarding details are complete for this preview.')
    + '<div class="card-actions"><button class="button full" type="button" data-close>Done</button><button class="link" type="button" data-stage="result">View my quote</button></div>',
};

function showDialog(body, quoteStage = '') {
  if (!dialog.open) dialogTrigger = document.activeElement;
  dialog.classList.toggle('quote-dialog', Boolean(quoteStage));
  dialog.classList.toggle('quote-dialog-form', quoteStage === 'form');
  const close = dialog.querySelector('[data-close]');
  close.setAttribute('aria-label', quoteStage ? 'Close quote' : 'Close dialog');
  dialogContent.innerHTML = body;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  $('#dialog-title').focus({ preventScroll: true });
}

function showQuote(stage = state.stage) {
  state.stage = stage;
  showDialog(screen[stage](), stage);
}

function openDialog(title, body) {
  showDialog(heading(title) + body);
}

function chooseService(service) {
  if (state.service === service) return;
  if (state.lead) {
    workflow.reset();
    Object.assign(state, { lead: null, onboarding: {} });
  }
  Object.assign(state, { stage: 'form', service, choice: '' });
  track('service_selected', { service });
}

function startQuote(service) {
  if (service) {
    chooseService(service);
    state.stage = 'form';
  }
  if (state.stage === 'form') track('quote_flow_started', { service: state.service });
  showQuote();
}

function openCallback() {
  openDialog('Prefer to speak with us?', (dialog.classList.contains('quote-dialog') ? back('result') : '') + '<p class="lead-in">Try the callback form or call <a href="tel:+61870769899">08 7076 9899</a>.</p>'
    + `<form class="form" data-form="callback" novalidate>${contactFields(false)}
      <label class="field">Preferred time (optional)<select name="time"><option value="">Any time</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option></select></label>
      <p class="mini">Times are South Australian local time. Use sample contact details for this preview.</p>${submit('Request a callback')}</form>`);
}

const info = {
  privacy: ['Preview privacy', 'Use sample details to try the quote and callback flows. Form details stay in this page until you close or reload it. The preview sends no emails or text messages.'],
  terms: ['Legal information', 'This private preview demonstrates how an enquiry works. Pricing and service terms require RAIKAN’s confirmation. To discuss a real transaction, call <a href="tel:+61870769899">08 7076 9899</a>.'],
};

function validate(form) {
  const values = Object.fromEntries(new FormData(form));
  const errors = {};
  if (form.dataset.form === 'contact') {
    const error = form.querySelector('#choice-error');
    error.hidden = Boolean(values.choice);
    error.textContent = values.choice ? '' : 'Choose an option for your property.';
    if (!values.choice) errors.choice = error.textContent;
  }
  for (const input of form.querySelectorAll('input[required]')) {
    const value = input.value.trim();
    values[input.name] = value;
    if (!value) errors[input.name] = { name: 'Enter your full name.', email: 'Enter your email address.', phone: 'Enter your Australian mobile number.' }[input.name];
    else if (input.name === 'email' && (!input.validity.valid || !/@[^@]+\.[^@]+$/.test(value))) errors.email = 'Enter an email address like name@example.com.';
    else if (input.name === 'phone' && !/^(?:04|\+614|614)\d{8}$/.test(value.replace(/[\s()-]/g, ''))) errors.phone = 'Enter an Australian mobile number, such as 04xx xxx xxx.';
    const error = form.querySelector('#' + input.name + '-error');
    input.setAttribute('aria-invalid', String(Boolean(errors[input.name])));
    error.textContent = errors[input.name] || '';
    error.hidden = !errors[input.name];
  }
  const first = Object.keys(errors)[0];
  if (first) {
    form.querySelector('input[name="' + first + '"]').focus();
    return null;
  }
  return values;
}

dialog.addEventListener('close', () => {
  if (dialogTrigger?.isConnected && dialogTrigger.getClientRects().length) {
    dialogTrigger.focus({ preventScroll: true });
  } else {
    $('[data-menu]').focus({ preventScroll: true });
  }
});
const menu = $('[data-menu]');
function toggleMenu(open) {
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  $('#nav-links').classList.toggle('open', open);
}
document.addEventListener('click', (event) => {
  const target = event.target.closest('a,button');
  if (!target) return;
  const data = target.dataset;
  if ('menu' in data) return toggleMenu(menu.getAttribute('aria-expanded') !== 'true');
  if (target.closest('#nav-links')) toggleMenu(false);
  if ('quote' in data) {
    event.preventDefault();
    track('get_quote_cta_clicked');
    return startQuote();
  }
  if (data.service) {
    event.preventDefault();
    return startQuote(data.service);
  }
  if (data.stage) {
    if (data.stage === 'result') track('quote_displayed', { service: state.service });
    return showQuote(data.stage);
  }
  if ('callback' in data) return openCallback();
  if (data.info) return openDialog(info[data.info][0], '<p class="lead-in">' + info[data.info][1] + '</p>');
  if ('close' in data) return dialog.close();
  if ('proceed' in data) {
    workflow.recordIntent();
    track('onboarding_started', { service: state.service });
    return showQuote('onboarding');
  }
  if ('reset' in data) {
    workflow.reset();
    Object.assign(state, { service: 'buy', choice: '', lead: null, contact: {}, callback: false, onboarding: {} });
    return showQuote('form');
  }
});

document.addEventListener('input', (event) => {
  const form = event.target.form;
  if (!form) return;
  const { name, value, checked } = event.target;
  if (form.dataset.form === 'contact') {
    if (name === 'service') {
      chooseService(value);
      form.querySelector('.property-field').innerHTML = propertyChoices();
    } else if (name === 'choice') {
      state.choice = value;
      const error = form.querySelector('#choice-error');
      error.hidden = true;
      error.textContent = '';
    } else if (name === 'callback') {
      state.callback = checked;
    } else {
      state.contact[name] = value;
    }
  }
  if (form.dataset.form === 'onboarding') {
    if (name === 'suburb' || name === 'date') state.onboarding[name] = value;
    else state.contact[name] = value;
    workflow.saveOnboarding({ ...state.contact, ...state.onboarding });
  }
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!form.dataset.form) return;
  event.preventDefault();
  const values = validate(form);
  if (!values) return;
  switch (form.dataset.form) {
    case 'contact': {
      const { name, email, phone, callback, choice } = values;
      state.choice = choice;
      state.contact = { name, email, phone };
      state.callback = Boolean(callback);
      state.onboarding = {};
      track('quote_form_step_completed', { service: state.service, step: 1 });
      state.lead = workflow.createQuote({ service: state.service, choice: state.choice, contact: { ...state.contact }, callback: state.callback });
      track('quote_displayed', { service: state.service });
      showQuote('result');
      break;
    }
    case 'callback': {
      workflow.requestCallback(values);
      state.contact = { ...state.contact, name: values.name, phone: values.phone };
      state.callback = true;
      const callbackAction = state.lead ? '<button type="button" class="button full" data-stage="result">Back to my quote</button>' : '<button type="button" class="button full" data-close>Done</button>';
      openDialog('Callback preview complete.', '<p class="lead-in">This was a preview request. To speak with RAIKAN, call <a href="tel:+61870769899">08 7076 9899</a>.</p><div class="card-actions">' + callbackAction + '</div>');
      break;
    }
    case 'onboarding':
      workflow.saveOnboarding(values, true);
      track('onboarding_completed', { service: state.service });
      showQuote('complete');
      break;
  }
});

const start = Date.now();
document.addEventListener('mouseout', (event) => {
  if (exitShown || dialog.open || state.stage !== 'form' || state.choice || Object.values(state.contact).some(Boolean) || event.relatedTarget || event.clientY > 0 || Date.now() - start < 20000 || !matchMedia('(hover: hover) and (min-width: 950px)').matches) return;
  exitShown = true;
  openDialog('Have a quick question?', '<p class="lead-in">Speak with RAIKAN before you decide.</p><div class="card-actions"><button class="button full" type="button" data-callback>Request a callback</button><button class="button outline full" type="button" data-quote>Continue to my quote</button></div>');
});
window.addEventListener('pagehide', (event) => {
  if (!event.persisted && state.stage === 'form' && (state.choice || Object.values(state.contact).some(Boolean))) {
    track('quote_form_abandoned', { service: state.service, step: 1 });
  }
});

document.querySelectorAll('[data-icon]').forEach((element) => { element.innerHTML = icon(element.dataset.icon); });
if (location.hash === '#quote') startQuote();
track('landing_page_viewed');
