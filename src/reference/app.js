import { services } from './config.js';
import { track, workflow, enhanceForms, showFormError, deliveryCopy } from './api.js';

export function mountReference() {
  const controller = new AbortController();
  const listen = (target, type, handler) => target.addEventListener(type, handler, { signal: controller.signal });
  workflow.reset();
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
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    'chevron-left': '<path d="m15 18-6-6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3"/>',
  };
  const icon = (key) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths[key] + '</svg>';
  const pict = (name) => '<i data-icon="' + name + '">' + icon(name) + '</i>';
  const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const $ = (selector) => document.querySelector(selector);
  const dialog = $('#quote');
  const dialogContent = $('#dialog-content');
  const state = { stage: 'form', service: 'buy', choice: '', lead: null, contact: {}, callback: false, onboarding: {} };
  const primaryServices = [['buy', 'Buy'], ['sell', 'Sell'], ['transfer', 'Transfer']];
  let exitShown = false;
  let dialogTrigger;

  const countries = [
    { code: 'AU', dial: '+61', flag: '🇦🇺', name: 'Australia' },
    { code: 'IN', dial: '+91', flag: '🇮🇳', name: 'India' },
    { code: 'GB', dial: '+44', flag: '🇬🇧', name: 'United Kingdom' },
    { code: 'US', dial: '+1', flag: '🇺🇸', name: 'United States' },
    { code: 'NZ', dial: '+64', flag: '🇳🇿', name: 'New Zealand' },
    { code: 'CA', dial: '+1', flag: '🇨🇦', name: 'Canada' },
    { code: 'SG', dial: '+65', flag: '🇸🇬', name: 'Singapore' },
    { code: 'MY', dial: '+60', flag: '🇲🇾', name: 'Malaysia' },
    { code: 'PH', dial: '+63', flag: '🇵🇭', name: 'Philippines' },
    { code: 'CN', dial: '+86', flag: '🇨🇳', name: 'China' },
    { code: 'HK', dial: '+852', flag: '🇭🇰', name: 'Hong Kong' },
    { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'United Arab Emirates' },
    { code: 'ZA', dial: '+27', flag: '🇿🇦', name: 'South Africa' },
    { code: 'DE', dial: '+49', flag: '🇩🇪', name: 'Germany' },
    { code: 'FR', dial: '+33', flag: '🇫🇷', name: 'France' },
    { code: 'IE', dial: '+353', flag: '🇮🇪', name: 'Ireland' },
    { code: 'PK', dial: '+92', flag: '🇵🇰', name: 'Pakistan' },
    { code: 'BD', dial: '+880', flag: '🇧🇩', name: 'Bangladesh' },
    { code: 'LK', dial: '+94', flag: '🇱🇰', name: 'Sri Lanka' },
    { code: 'NP', dial: '+977', flag: '🇳🇵', name: 'Nepal' },
    { code: 'IT', dial: '+39', flag: '🇮🇹', name: 'Italy' },
    { code: 'ES', dial: '+34', flag: '🇪🇸', name: 'Spain' },
    { code: 'NL', dial: '+31', flag: '🇳🇱', name: 'Netherlands' },
    { code: 'JP', dial: '+81', flag: '🇯🇵', name: 'Japan' },
    { code: 'KR', dial: '+82', flag: '🇰🇷', name: 'South Korea' },
  ];

  let userCountry = countries[0];
  let userCountryLocked = false;

  async function detectCountryByIP() {
    try {
      const res = await fetch('https://ipapi.co/json/', { cache: 'no-store', signal: controller.signal });
      if (!res.ok) throw new Error('ipapi failed');
      const data = await res.json();
      if (controller.signal.aborted) return;
      const cCode = (data.country_code || data.country || '').toUpperCase();
      if (cCode && !userCountryLocked) {
        const found = countries.find((c) => c.code === cCode);
        if (found) {
          userCountry = found;
        } else if (data.country_calling_code) {
          userCountry = {
            code: cCode,
            dial: data.country_calling_code.startsWith('+') ? data.country_calling_code : '+' + data.country_calling_code,
            flag: String.fromCodePoint(...[...cCode].map((c) => 127397 + c.charCodeAt(0))),
            name: data.country_name || cCode,
          };
        }
        renderHeroQuoteCard();
      }
    } catch {
      if (controller.signal.aborted) return;
      try {
        const res2 = await fetch('https://api.country.is', { signal: controller.signal });
        if (!res2.ok) return;
        const d2 = await res2.json();
        if (controller.signal.aborted) return;
        const c2 = (d2.country || '').toUpperCase();
        if (c2 && !userCountryLocked) {
          const found = countries.find((c) => c.code === c2);
          if (found) {
            userCountry = found;
            renderHeroQuoteCard();
          }
        }
      } catch {
        // Default to Australia
      }
    }
  }

  const heroForm = {
    step: 1,
    service: 'buy',
    choice: 'below',
    contact: { name: '', phone: '', email: '', propertyValue: '', notes: '', callback: false },
    lead: null,
    errors: {},
  };

  let submissionResetTimer = null;
  let submissionCountdownInterval = null;

  function clearSubmissionTimers() {
    if (submissionResetTimer) {
      clearTimeout(submissionResetTimer);
      submissionResetTimer = null;
    }
    if (submissionCountdownInterval) {
      clearInterval(submissionCountdownInterval);
      submissionCountdownInterval = null;
    }
  }

  function resetHeroFormToStart() {
    clearSubmissionTimers();
    heroForm.step = 1;
    heroForm.choice = heroServices[heroForm.service]?.choices[0]?.[0] || 'below';
    heroForm.contact = { name: '', phone: '', email: '', propertyValue: '', notes: '', callback: false };
    heroForm.errors = {};
    renderHeroQuoteCard();
  }

  function startPostCloseSubmissionTimer() {
    clearSubmissionTimers();
    let remaining = 10;
    const updateEl = () => {
      const el = document.getElementById('hero-submission-timer');
      if (el) el.textContent = String(Math.max(0, remaining));
    };
    updateEl();

    submissionCountdownInterval = setInterval(() => {
      remaining -= 1;
      updateEl();
      if (remaining <= 0) {
        clearInterval(submissionCountdownInterval);
        submissionCountdownInterval = null;
      }
    }, 1000);

    submissionResetTimer = setTimeout(() => {
      resetHeroFormToStart();
    }, 10000);
  }

  const heroServices = {
    buy: {
      title: 'Buying in SA',
      question: 'Buying in SA',
      choices: [
        ['below', 'Property price up to $1 million'],
        ['above', 'Property price over $1 million'],
      ],
    },
    sell: {
      title: 'Selling in SA',
      question: 'Selling in SA',
      choices: [
        ['private', 'Selling privately'],
        ['agent', 'Selling through an agent'],
      ],
    },
    transfer: {
      title: 'Family transfer',
      question: 'Family transfer',
      choices: [
        ['spouse', 'Transfer with current spouse'],
        ['former_spouse', 'Transfer with former spouse'],
        ['family', 'Transfer between family members other than spouse'],
      ],
    },
  };

  function validateHeroForm(form) {
    const values = form ? Object.fromEntries(new FormData(form)) : {};
    const errors = {};
    const name = ((values.name !== undefined ? values.name : heroForm.contact.name) || '').trim();
    const email = ((values.email !== undefined ? values.email : heroForm.contact.email) || '').trim();
    const phone = ((values.phone !== undefined ? values.phone : heroForm.contact.phone) || '').trim();

    if (!name) errors.name = 'Please enter your name.';
    if (!email) errors.email = 'Please enter your email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }
    if (!phone) {
      errors.phone = 'Please enter your mobile number.';
    } else if (!/^[\d\s\-().+]{6,20}$/.test(phone)) {
      errors.phone = 'Please enter a valid mobile number.';
    }

    heroForm.contact.name = name;
    heroForm.contact.email = email;
    heroForm.contact.phone = phone;
    if (values.propertyValue !== undefined) {
      heroForm.contact.propertyValue = (values.propertyValue || '').trim();
    }
    if (values.notes !== undefined) {
      heroForm.contact.notes = (values.notes || '').trim();
    }
    heroForm.errors = errors;

    return Object.keys(errors).length === 0;
  }

  function renderHeroQuoteCard() {
    const container = document.getElementById('hero-quote-card');
    if (!container) return;

    const currentService = heroServices[heroForm.service] || heroServices.buy;
    const currentChoiceObj = currentService.choices.find(([k]) => k === heroForm.choice);
    const choiceLabel = currentChoiceObj ? currentChoiceObj[1] : '';

    // Step 4: Confirmation screen
    if (heroForm.step === 4) {
      const valText = heroForm.contact.propertyValue || choiceLabel || currentService.title;
      container.innerHTML = `
      <div class="hero-form-step">
        <div class="hero-result-header">
          <span class="hero-result-icon">${icon('check-circle')}</span>
          <div>
            <h3 class="hero-form-heading">Thanks for your enquiry</h3>
            <p class="hero-form-sub">Prepared for ${esc(heroForm.contact.name || 'you')}</p>
          </div>
        </div>
        <div class="hero-result-service-badge">
          ${currentService.title} · ${esc(valText)}
        </div>
        <p class="hero-form-disclaimer" style="text-align:left; margin-top:12px;">
          ${esc(deliveryCopy(heroForm.lead))}
        </p>
        <div class="hero-submission-timer-note">
          <span>Form will reload in <strong id="hero-submission-timer">10</strong>s</span>
        </div>
        <div class="hero-result-actions">
          <a href="tel:+61870769899" class="hero-form-submit-btn">
            ${icon('phone')} Call Adelaide Office: 08 7076 9899
          </a>
          <button type="button" class="hero-result-reset-btn" data-hero-reset>
            Start another quote
          </button>
        </div>
      </div>
    `;
      return;
    }

    // Single-step Unified Form as per user screenshot
    container.innerHTML = `
    <div class="hero-form-step">
      <div class="hero-form-header-row">
        <h3 class="hero-form-heading">Get your instant quote</h3>
      </div>

      <!-- Service Type Pills (Buying in SA | Selling in SA | Family transfer) -->
      <div class="hero-service-pills-row" role="tablist" aria-label="Transaction type">
        <button type="button" class="hero-service-pill-btn ${heroForm.service === 'buy' ? 'active' : ''}" data-hero-pill="buy" role="tab" aria-selected="${heroForm.service === 'buy'}">
          Buying in SA
        </button>
        <button type="button" class="hero-service-pill-btn ${heroForm.service === 'sell' ? 'active' : ''}" data-hero-pill="sell" role="tab" aria-selected="${heroForm.service === 'sell'}">
          Selling in SA
        </button>
        <button type="button" class="hero-service-pill-btn ${heroForm.service === 'transfer' ? 'active' : ''}" data-hero-pill="transfer" role="tab" aria-selected="${heroForm.service === 'transfer'}">
          Family transfer
        </button>
      </div>

      <form class="hero-step-fields hero-single-form" data-hero-form="quote" novalidate>
        <!-- Two Column Inputs: Name & Email -->
        <div class="hero-field-row">
          <label class="hero-field">
            <span>Name *</span>
            <input type="text" name="name" value="${esc(heroForm.contact.name)}" placeholder="" autocomplete="name" maxlength="110" aria-invalid="${Boolean(heroForm.errors.name)}" aria-describedby="hero-name-error" required />
            <span class="hero-field-error" id="hero-name-error" ${heroForm.errors.name ? '' : 'hidden'}>${esc(heroForm.errors.name || '')}</span>
          </label>

          <label class="hero-field">
            <span>Email *</span>
            <input type="email" name="email" value="${esc(heroForm.contact.email)}" placeholder="" autocomplete="email" maxlength="254" aria-invalid="${Boolean(heroForm.errors.email)}" aria-describedby="hero-email-error" required />
            <span class="hero-field-error" id="hero-email-error" ${heroForm.errors.email ? '' : 'hidden'}>${esc(heroForm.errors.email || '')}</span>
          </label>
        </div>

        <!-- Two Column Inputs: Mobile & Property value -->
        <div class="hero-field-row">
          <label class="hero-field">
            <span>Mobile *</span>
            <div class="hero-phone-group ${heroForm.errors.phone ? 'has-error' : ''}">
              <div class="hero-flag-picker" title="Country: ${userCountry.name} (${userCountry.dial})">
                <span class="hero-flag-emoji" aria-hidden="true">${userCountry.flag}</span>
                <span class="hero-flag-dial">${userCountry.dial}</span>
                <select name="countryCode" class="hero-flag-select" aria-label="Country dial code">
                  ${countries.map((c) => `
                    <option value="${c.code}" ${c.code === userCountry.code ? 'selected' : ''}>
                      ${c.flag} ${c.name} (${c.dial})
                    </option>
                  `).join('')}
                </select>
                <span class="hero-flag-caret">${icon('chevron')}</span>
              </div>
              <input type="tel" name="phone" value="${esc(heroForm.contact.phone)}" placeholder="" autocomplete="tel-national" maxlength="20" aria-invalid="${Boolean(heroForm.errors.phone)}" aria-describedby="hero-phone-error" required />
            </div>
            <span class="hero-field-error" id="hero-phone-error" ${heroForm.errors.phone ? '' : 'hidden'}>${esc(heroForm.errors.phone || '')}</span>
          </label>

          <label class="hero-field">
            <span>Property value (if known)</span>
            <input type="text" name="propertyValue" value="${esc(heroForm.contact.propertyValue)}" placeholder="e.g. $850,000" maxlength="60" />
            <small class="hero-field-helper">Not sure yet? Leave blank.</small>
          </label>
        </div>

        <!-- Dynamic Service Radio Options based on selected pill -->
        <div class="hero-service-choice-section">
          <p class="hero-choice-category-heading">${currentService.question}</p>
          <div class="hero-radio-choices-grid ${heroForm.service === 'transfer' ? 'transfer-grid' : 'two-col'}">
            ${currentService.choices.map(([key, label]) => `
              <label class="hero-radio-option-item ${heroForm.choice === key ? 'checked' : ''}">
                <input type="radio" name="heroChoiceRadio" value="${key}" ${heroForm.choice === key ? 'checked' : ''} />
                <span>${label}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <!-- Questions (if any) -->
        <label class="hero-field hero-field-full">
          <span>Questions (if any)</span>
          <textarea name="notes" placeholder="Ask us about your quote or conveyancing" rows="2">${esc(heroForm.contact.notes || '')}</textarea>
        </label>

        <!-- Submit Button -->
        <button type="submit" class="hero-form-submit-btn">
          Send me my quote
        </button>
      </form>
    </div>
    `;
    enhanceForms(container);
  }

  function submittedCostSummary() {
    const buying = heroForm.service === 'buy';
    const selling = heroForm.service === 'sell';
    const transfer = heroForm.service === 'transfer';
    const isFamily = transfer && heroForm.choice === 'family';
    const isSpouse = transfer && heroForm.choice === 'spouse';
    const isFormer = transfer && (heroForm.choice === 'former' || heroForm.choice === 'former_spouse');

    const title = buying
      ? 'Buying a property'
      : selling
        ? 'Selling a property'
        : isFamily
          ? 'Transfer between family members other than spouse'
          : isFormer
            ? 'Transfer with former spouse'
            : isSpouse
              ? 'Transfer with current spouse'
              : 'Family transfer';

    const rows = buying ? [
      ['File fee', '$88'], ['PEXA electronic settlement', '$146.30'],
      ['Identity check', '$50 per person'], ['AML / CTF check', '$25 per person'],
      ['Priority notice (optional)', '$38'], ['Copy of new title (optional)', '$38'],
    ] : selling ? [
      ['File fee', '$88'], ['PEXA electronic settlement', '$146.30'],
      ['Identity check', '$50 per person'], ['AML / CTF check', '$25 per person'],
      ['Special water meter reading', '$25'], ['Form 1 and searches', 'Separate cost, if needed'],
    ] : isFamily ? [
      ['Disbursements', 'As per actual from LTO'],
      ['Premium Service (optional)', '~$500+ for fast processing'],
    ] : (isSpouse || isFormer) ? [
      ['File fee', '$88'], ['PEXA (Existing person)', '$146.30'],
      ['PEXA (Incoming person)', '$146.30'], ['Lodgement fees (LTO)', '$204'],
      ['Identity check', '$50 per person'], ['AML / CTF check', '$25 per person'],
      ['Copy of new title (optional)', '$35'],
    ] : [];

    const fee = buying || selling
      ? '<p class="submitted-fee">$660 + GST</p><p>Our professional conveyancing fee. Other transaction costs and government charges are additional.</p>'
      : (isFamily || isSpouse || isFormer)
        ? '<p class="submitted-fee">$990 (Incl. GST)</p><p>Our professional conveyancing fee. Other transaction costs and disbursements are additional.</p>'
        : '<p class="submitted-fee">Personal quote</p><p>Family transfers differ. The team will confirm the work, professional fee and applicable charges for your circumstances.</p>';

    const costs = rows.length
      ? `<dl>${rows.map(([label, amount]) => `<div><dt>${label}</dt><dd>${amount}</dd></div>`).join('')}</dl><p class="submitted-cost-note">${isFamily ? 'Process starts once SCAP Approved plan is received from your planner/surveyor.' : 'Optional costs or settlement adjustments may also apply.'}</p>`
      : '<p>Costs depend on the type of transfer and the people involved. The team will confirm any third-party costs and government charges for your situation.</p>';

    const government = buying
      ? '<p>Stamp duty and transfer fees vary with the property and your circumstances.</p><p>Mortgage registration may also apply if you are borrowing to buy.</p>'
      : selling
        ? '<p>A mortgage discharge fee may apply if you have a mortgage. Your quote guide lists $204.</p><p>Other government charges depend on your property and circumstances.</p>'
        : isFamily
          ? '<p>Disbursements depend on the number of titles. Ensure your lender provides consent for title issuance if there is a mortgage on title.</p>'
          : '<p>Government charges depend on the type of transfer and your circumstances. Ask the team to confirm which charges apply.</p>';

    return `<div class="submitted-cost-summary">
      <header>
        <p class="submitted-kicker"><span></span>Thanks for your enquiry</p>
        <h2 id="dialog-title" tabindex="-1">A clear view of your costs</h2>
        <span class="submitted-service">${title}</span>
        <p>${esc(deliveryCopy(heroForm.lead))}</p>
      </header>
      <div class="submitted-cost-columns">
        <section><h3>Conveyancing</h3>${fee}</section>
        <section><h3>Other Charges</h3>${costs}</section>
        <section>
          <h3>Government charges</h3>
          <dl class="gov-charges-options">
            <div>
              <dt>Stamp Duty</dt>
              <dd>as per government charges</dd>
            </div>
            <div>
              <dt>Transfer Fees</dt>
              <dd>as per government charges</dd>
            </div>
          </dl>
          <div class="gov-charges-note-block">
            ${government}
            <a href="https://www.sa.gov.au/topics/housing/planning-and-property/property-transfer-fee-calculator" target="_blank" rel="noopener noreferrer">SA government fee calculator</a>
            <p class="submitted-cost-note">For South Australian property transfers.</p>
          </div>
        </section>
      </div>
      <footer>
        <p>Amounts shown are from the supplied quote guide. This is not your total settlement cost. The team will confirm the charges for your property in an itemised quote.</p>
        <button class="button" type="button" data-close>Close</button>
      </footer>
    </div>`;
  }

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
    const callbackOption = state.callback
      ? '<p class="mini">A callback has been requested.</p>'
      : '<button class="link" type="button" data-callback>Request a callback</button>';
    return `<header class="quote-confirmation">
      <span class="icon-tile">${pict('check-circle')}</span>
      <div>${heading('Thanks for your enquiry', 'Your quote is for email and SMS.')}</div>
    </header>
    <p class="quote-result-service">${service.label} · ${choiceName}</p>
    <p class="quote-reference">South Australia</p>
    <p class="lead-in">Review your detailed quote by email and SMS before choosing to proceed.</p>
    ${previewNote(esc(deliveryCopy(state.lead)))}
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
      + previewNote('Your interest will be recorded. Formal engagement is a separate step.')
      + `<form class="form" data-form="onboarding" novalidate>${contactFields(true)}
       ${field({ name: 'suburb', label: 'Property suburb (optional)', value: state.onboarding.suburb, required: false })}
       ${field({ name: 'date', label: 'Expected settlement date (optional)', type: 'date', value: state.onboarding.date, required: false })}
       <p class="mini">Edits are kept while this page stays open.</p>${submit('Save my details')}</form>`;
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
    <div class="quote-submit">${submit('Request my quote')}<p class="mini">You’re asking Raikan to email and SMS your quote and contact you about this enquiry. No marketing sign-up.</p><p class="mini">${pict('lock')} Your details are sent securely to Raikan.</p></div>
  </form>`;
  }

  const screen = {
    form: quoteForm,
    result,
    onboarding,
    complete: () => heading('Thanks for completing the form', 'Your details have been saved for our team to review.')
      + '<div class="card-actions"><button class="button full" type="button" data-close>Done</button><button class="link" type="button" data-stage="result">View my quote</button></div>',
  };

  function showDialog(body, quoteStage = '') {
    if (!dialog.open) dialogTrigger = document.activeElement;
    dialog.classList.toggle('quote-dialog', Boolean(quoteStage));
    dialog.classList.toggle('quote-dialog-form', quoteStage === 'form');
    dialog.classList.toggle('quote-dialog-cost-summary', quoteStage === 'cost-summary');
    const close = dialog.querySelector('[data-close]');
    close.setAttribute('aria-label', quoteStage ? 'Close quote' : 'Close dialog');
    dialogContent.innerHTML = body;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    $('#dialog-title').focus({ preventScroll: true });
    enhanceForms(dialogContent);
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
      <p class="mini">Times are South Australian local time.</p>${submit('Request a callback')}</form>`);
  }

  const info = {
    privacy: ['Enquiry privacy', 'The details you submit are stored to prepare your quote and respond to your enquiry. Quote emails and text messages are sent through our delivery providers when enabled. This form does not sign you up for marketing.'],
    terms: ['Legal information', 'Submitting an enquiry does not create a formal engagement. Pricing and service terms require RAIKAN’s confirmation. To discuss a real transaction, call <a href="tel:+61870769899">08 7076 9899</a>.'],
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

  listen(dialog, 'close', () => {
    if (heroForm.step === 4) {
      startPostCloseSubmissionTimer();
    }
    if (dialogTrigger?.isConnected && dialogTrigger.getClientRects().length) {
      dialogTrigger.focus({ preventScroll: true });
    } else {
      document.querySelector('.contact-strip a')?.focus({ preventScroll: true });
    }
  });
  const menu = $('[data-menu]');
  function toggleMenu(open) {
    if (!menu) return;
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    $('#nav-links').classList.toggle('open', open);
  }
  listen(document, 'click', (event) => {
    // Service Pill Click (Buying in SA | Selling in SA | Family transfer)
    const heroPill = event.target.closest('[data-hero-pill]');
    if (heroPill) {
      event.preventDefault();
      const svc = heroPill.dataset.heroPill;
      if (heroForm.service !== svc) {
        heroForm.service = svc;
        heroForm.choice = heroServices[svc]?.choices[0]?.[0] || '';
        delete heroForm.errors.choice;
        renderHeroQuoteCard();
      }
      return;
    }

    // Choice Click (e.g. Under $1M / Through agent / etc.)
    const heroChoice = event.target.closest('[data-hero-choice]');
    if (heroChoice) {
      event.preventDefault();
      const ch = heroChoice.dataset.heroChoice;
      heroForm.choice = ch;
      delete heroForm.errors.choice;
      renderHeroQuoteCard();
      return;
    }

    // Result: Reset button -> Returns to form
    if (event.target.closest('[data-hero-reset]')) {
      event.preventDefault();
      clearSubmissionTimers();
      resetHeroFormToStart();
      return;
    }

    const target = event.target.closest('a,button');
    if (!target) return;
    const data = target.dataset;
    if ('menu' in data) return toggleMenu(menu.getAttribute('aria-expanded') !== 'true');
    if (target.closest('#nav-links')) toggleMenu(false);
    const upfrontPrice = event.target.closest('.upfront-price');
    if (upfrontPrice || ('quote' in data)) {
      event.preventDefault();
      const heroCard = document.getElementById('hero-quote-card');
      if (heroCard) {
        if (dialog.open) {
          dialog.close();
        }
        heroCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        heroCard.classList.remove('hero-card-pulse');
        void heroCard.offsetWidth;
        heroCard.classList.add('hero-card-pulse');
        const nextField = heroCard.querySelector('input[name="name"], input[name="propertyValue"], input[type="radio"]:checked, input, button[type="submit"]');
        if (nextField) {
          setTimeout(() => nextField.focus({ preventScroll: true }), 350);
        }
      } else {
        track('get_quote_cta_clicked');
        startQuote();
      }
      return;
    }
    if (data.service) {
      event.preventDefault();
      if (['buy', 'sell', 'transfer'].includes(data.service)) {
        heroForm.service = data.service;
        heroForm.choice = heroServices[data.service]?.choices[0]?.[0] || '';
        renderHeroQuoteCard();
        const heroCard = document.getElementById('hero-quote-card');
        if (heroCard) {
          heroCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const nameInput = heroCard.querySelector('input[name="name"]') || heroCard.querySelector('input');
          if (nameInput) nameInput.focus();
        }
        return;
      }
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
      target.disabled = true;
      void workflow.recordIntent().then(() => {
        track('onboarding_started', { service: state.service });
        showQuote('onboarding');
      }).catch(error => {
        const notice = document.createElement('p');
        notice.setAttribute('role', 'alert');
        notice.textContent = error.message;
        dialogContent.append(notice);
      }).finally(() => { target.disabled = false; });
      return;
    }
    if ('reset' in data) {
      workflow.reset();
      Object.assign(state, { service: 'buy', choice: '', lead: null, contact: {}, callback: false, onboarding: {} });
      return showQuote('form');
    }
  });

  listen(document, 'input', (event) => {
    const form = event.target.form;
    if (!form) return;
    const { name, value, checked } = event.target;
    if (form.dataset.heroForm) {
      userCountryLocked = true;
      if (name === 'callback') {
        heroForm.contact.callback = checked;
      } else if (name === 'propertyValue') {
        heroForm.contact.propertyValue = value;
      } else if (name === 'notes') {
        heroForm.contact.notes = value;
      } else if (name in heroForm.contact) {
        heroForm.contact[name] = value;
        if (heroForm.errors[name]) {
          delete heroForm.errors[name];
          event.target.setAttribute('aria-invalid', 'false');
          const errEl = form.querySelector('#hero-' + name + '-error');
          if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
        }
      }
      return;
    }
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

  listen(document, 'submit', async (event) => {
    const form = event.target;
    if (!form.dataset.heroForm && !form.dataset.form) return;
    event.preventDefault();
    if (form.dataset.submitting) return;
    form.dataset.submitting = 'true';
    form.setAttribute('aria-busy', 'true');
    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    try {
    if (form.dataset.heroForm) {
      event.preventDefault();
      if (!validateHeroForm(form)) {
        renderHeroQuoteCard();
        const first = Object.keys(heroForm.errors)[0];
        const el = document.querySelector('#hero-quote-card [name="' + first + '"]');
        if (el) el.focus();
        return;
      }
      const values = Object.fromEntries(new FormData(form));
      heroForm.contact.notes = (values.notes || '').trim();
      heroForm.contact.propertyValue = (values.propertyValue || '').trim();

      heroForm.lead = await workflow.createQuote({
        service: heroForm.service,
        choice: heroForm.choice,
        contact: { ...heroForm.contact, countryCode: userCountry.code },
        callback: Boolean(heroForm.contact.callback),
      }, form);
      heroForm.step = 4;
      track('quote_displayed', { service: heroForm.service, choice: heroForm.choice, source: 'hero_card' });
      renderHeroQuoteCard();
      showDialog(submittedCostSummary(), 'cost-summary');
      return;
    }
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
        state.lead = await workflow.createQuote({ service: state.service, choice: state.choice, contact: { ...state.contact }, callback: state.callback }, form);
        track('quote_displayed', { service: state.service });
        showQuote('result');
        break;
      }
      case 'callback': {
        await workflow.requestCallback(values, form);
        state.contact = { ...state.contact, name: values.name, phone: values.phone };
        state.callback = true;
        const callbackAction = state.lead ? '<button type="button" class="button full" data-stage="result">Back to my quote</button>' : '<button type="button" class="button full" data-close>Done</button>';
        openDialog('Your callback request is saved.', '<p class="lead-in">Our team will review your request. If you need help sooner, call <a href="tel:+61870769899">08 7076 9899</a>.</p><div class="card-actions">' + callbackAction + '</div>');
        break;
      }
      case 'onboarding':
        await workflow.saveOnboarding(values, true);
        track('onboarding_completed', { service: state.service });
        showQuote('complete');
        break;
    }
    } catch (error) {
      const currentForm = form.isConnected ? form : document.querySelector('#hero-quote-card form');
      if (currentForm) showFormError(currentForm, error);
    } finally {
      delete form.dataset.submitting;
      form.removeAttribute('aria-busy');
      if (submitButton) submitButton.disabled = false;
    }
  });

  const start = Date.now();
  listen(document, 'mouseout', (event) => {
    if (exitShown || dialog.open || state.stage !== 'form' || state.choice || Object.values(state.contact).some(Boolean) || event.relatedTarget || event.clientY > 0 || Date.now() - start < 20000 || !matchMedia('(hover: hover) and (min-width: 950px)').matches) return;
    exitShown = true;
    openDialog('Have a quick question?', '<p class="lead-in">Speak with RAIKAN before you decide.</p><div class="card-actions"><button class="button full" type="button" data-callback>Request a callback</button><button class="button outline full" type="button" data-quote>Continue to my quote</button></div>');
  });
  listen(window, 'pagehide', (event) => {
    if (!event.persisted && state.stage === 'form' && (state.choice || Object.values(state.contact).some(Boolean))) {
      track('quote_form_abandoned', { service: state.service, step: 1 });
    }
  });

  listen(document, 'change', (event) => {
    if (event.target.name === 'heroServiceRadio') {
      const svc = event.target.value;
      if (['buy', 'sell', 'transfer'].includes(svc)) {
        heroForm.service = svc;
        const defaultChoice = heroServices[svc]?.choices[0]?.[0] || '';
        heroForm.choice = defaultChoice;
        delete heroForm.errors.choice;
        renderHeroQuoteCard();
      }
      return;
    }

    if (event.target.name === 'heroChoiceRadio') {
      const ch = event.target.value;
      heroForm.choice = ch;
      delete heroForm.errors.choice;
      renderHeroQuoteCard();
      return;
    }

    if (event.target.name === 'countryCode') {
      const code = event.target.value;
      const found = countries.find((c) => c.code === code);
      if (found) {
        userCountry = found;
        userCountryLocked = true;
        renderHeroQuoteCard();
        const phoneInput = document.querySelector('#hero-quote-card input[name="phone"]');
        if (phoneInput) phoneInput.focus();
      }
    }
  });

  document.querySelectorAll('[data-icon]').forEach((element) => { element.innerHTML = icon(element.dataset.icon); });
  renderHeroQuoteCard();
  detectCountryByIP();
  if (location.hash === '#quote') startQuote();
  track('landing_page_viewed');

  return () => {
    clearSubmissionTimers();
    controller.abort();
    if (dialog.open) dialog.close();
  };
}
