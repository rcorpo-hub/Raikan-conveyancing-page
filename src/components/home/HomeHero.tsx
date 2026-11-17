import { useEffect, useState, type FormEvent } from 'react';
import { Check, Phone, Mail, ArrowRight, ShieldCheck, FileText, Monitor, Users, CheckCircle2 } from 'lucide-react';
import { siteConfig } from '../../data/site.config';
import { PolicyDialog } from '../common/PolicyDialog';
import type { ServiceType } from '../../types';

interface HomeHeroProps {
  quoteRequest?: { service: string; price?: number; contactMethod?: string; revision: number };
  onNavigateHowItWorks: () => void;
}
const services: { label: string; value: ServiceType }[] = [
  { label: 'Buying', value: 'Buying in SA' }, { label: 'Selling', value: 'Selling in SA' }, { label: 'Family transfer', value: 'Family Transfer' },
];
const benefits = [
  { icon: ShieldCheck, text: 'Clear fee information' }, { icon: Users, text: 'Personal support' },
  { icon: FileText, text: 'Instant fee estimate' }, { icon: Monitor, text: 'Explore at your pace' },
];
const emptyFields = { name: '', email: '', phone: '', suburb: '' };
type Field = keyof typeof emptyFields;

export function HomeHero({ onNavigateHowItWorks, quoteRequest }: HomeHeroProps) {
  const [service, setService] = useState<ServiceType>('Buying in SA');
  const [fields, setFields] = useState(emptyFields);
  const [ready, setReady] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [policy, setPolicy] = useState<'privacy' | 'terms' | null>(null);
  const individualQuote = service !== 'Buying in SA' && service !== 'Selling in SA';
  const serviceLabel = service === 'Other Conveyancing' && quoteRequest?.service === 'private-contracts' ? 'Private contract preparation' : service;
  useEffect(() => {
    if (!quoteRequest) return;
    const mapping: Record<string, ServiceType> = {
      buying: 'Buying in SA', selling: 'Selling in SA', 'family-transfer': 'Family Transfer',
      'contract-review': 'Contract Review', 'land-division': 'Land Division', 'private-contracts': 'Other Conveyancing',
    };
    setService(mapping[quoteRequest.service] || 'Other Conveyancing');
    setReady(false);
    setErrors({});
  }, [quoteRequest]);
  function update(name: Field, value: string) {
    setFields(previous => ({ ...previous, [name]: value }));
    setErrors(previous => ({ ...previous, [name]: undefined }));
  }
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Partial<Record<Field, string>> = {};
    if (!fields.name.trim()) next.name = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) next.email = 'Enter an email address, such as name@example.com.';
    const digits = fields.phone.replace(/\D/g, '');
    if (!/^\+?[\d\s().-]+$/.test(fields.phone.trim()) || digits.length < 8 || digits.length > 15) next.phone = 'Enter a phone number with 8–15 digits, including an area or country code.';
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) { document.getElementById('quote-' + first)?.focus(); return; }
    setReady(true);
    requestAnimationFrame(() => document.getElementById('quote-form-title')?.focus({ preventScroll: true }));
  }
  const body = [
    'Hello Raikan team,', '', 'I would like a confirmed quote for: ' + serviceLabel,
    'Name: ' + fields.name.trim(), 'Email: ' + fields.email.trim(), 'Phone: ' + fields.phone.trim(),
    fields.suburb ? 'Suburb / postcode: ' + fields.suburb.trim() : '',
    quoteRequest?.price ? 'Property value: $' + quoteRequest.price.toLocaleString('en-AU') : '',
    '', 'Please confirm the scope, professional fee and additional costs for my transaction.',
  ].filter((line, index, all) => line !== '' || all[index - 1] !== '').join('\n');
  const emailDraft = 'mailto:' + siteConfig.email + '?subject=' + encodeURIComponent('Conveyancing enquiry — ' + serviceLabel) + '&body=' + encodeURIComponent(body);

  return <>
    <section className="quote-hero" aria-labelledby="hero-title">
      <div className="landing-container hero-columns">
        <div className="hero-copy">
          <p className="eyebrow">Property conveyancing · South Australia</p>
          <h1 id="hero-title">Buying or selling in SA? Fixed-fee conveyancing.</h1>
          <p className="hero-price">From $660 <span>incl. GST</span></p>
          <p className="hero-intro">Help with the paperwork and legal steps to transfer property ownership—from contract to settlement.</p>
          <ul className="hero-benefits">{['Plain-language guidance', 'Clear professional fee breakdown', 'Support through settlement'].map(text => <li key={text}><Check aria-hidden="true" />{text}</li>)}</ul>
          <div className="hero-actions">
            <a href="#instant-quote" className="gold-button">Get fee estimate <ArrowRight size={17} /></a>
            <a href={'tel:' + siteConfig.phoneRaw} className="hero-call"><Phone size={17} />{siteConfig.phone}</a>
          </div>
          <p className="hero-footnote">Starting professional fee only. Government, search and settlement charges are additional. Ask for a confirmed written quote.</p>
          <button className="hero-process-link" onClick={onNavigateHowItWorks}>See how it works <ArrowRight size={15} /></button>
        </div>
        <div id="instant-quote" className="instant-quote-panel">
          {ready ? <div className="quote-confirmation">
            <CheckCircle2 size={38} aria-hidden="true" /><h2 id="quote-form-title" tabIndex={-1}>Your enquiry is ready to email</h2>
            <p>Nothing has been sent. Open a draft in your email app, review the details, then send it when you are ready.</p>
            <dl className="enquiry-review"><dt>Service</dt><dd>{serviceLabel}</dd><dt>Name</dt><dd>{fields.name}</dd><dt>Email</dt><dd>{fields.email}</dd><dt>Phone</dt><dd>{fields.phone}</dd></dl>
            <a className="gold-button" href={emailDraft}><Mail size={17} />Open email draft</a>
            <p className="quote-subtitle">No email app? Email <a href={'mailto:' + siteConfig.email}>{siteConfig.email}</a> or call <a href={'tel:' + siteConfig.phoneRaw}>{siteConfig.phone}</a>.</p>
            <button className="quote-text-link" onClick={() => setReady(false)}>Edit your details</button>
          </div> : <form onSubmit={prepare} noValidate>
            <h2 id="quote-form-title" tabIndex={-1}>Your fee estimate</h2>
            <p className="quote-subtitle">Choose your service. No contact details needed to see the fee.</p>
            <fieldset className="quote-service-options"><legend className="sr-only">Conveyancing service</legend>
              {services.map(item => <label key={item.value} className={service === item.value ? 'selected' : ''}><input type="radio" name="service" value={item.value} checked={service === item.value} onChange={() => setService(item.value)} />{item.label}</label>)}
            </fieldset>
            {!services.some(item => item.value === service) && <p className="quote-subtitle">Selected service: <strong>{serviceLabel}</strong></p>}
            {quoteRequest?.price !== undefined && <p className="quote-subtitle">Property value: <strong>${quoteRequest.price.toLocaleString('en-AU')}</strong></p>}
            <div className="instant-fee" aria-live="polite"><div><span>{individualQuote ? 'Individual assessment required' : 'Starting professional fee'}</span><strong>{individualQuote ? 'Ask for a quote' : '$660 incl. GST'}</strong></div><a href="#quote-fee-details">Fee details <ArrowRight size={14} /></a></div>
            <details id="quote-fee-details" className="quote-breakdown" open><summary>What does this amount cover?</summary><p>{individualQuote ? 'Requirements vary by service. Ask the team to confirm your professional fee and other charges.' : '$600 professional fee + $60 GST. The team will confirm the specific work included. Government duty, registration, searches, electronic settlement charges and rate adjustments are separate.'}</p></details>
            <div className="preview-notice"><strong>Prefer to contact us?</strong><p>This preview prepares an email draft; it does not submit an enquiry. You can also <a href={'tel:' + siteConfig.phoneRaw}>call the team</a> directly.</p></div>
            <p className="quote-required-note">All fields required except suburb or postcode.</p>
            {(['name', 'email', 'phone', 'suburb'] as Field[]).map(name => <label className="quote-field" key={name} htmlFor={'quote-' + name}>
              {{ name: 'Full name', email: 'Email', phone: 'Phone', suburb: 'Suburb or postcode (optional)' }[name]}
              <input id={'quote-' + name} name={name} type={name === 'email' ? 'email' : name === 'phone' ? 'tel' : 'text'}
                autoComplete={{name:'name',email:'email',phone:'tel',suburb:'address-level2'}[name]}
                value={fields[name]} onChange={event => update(name, event.target.value)} required={name !== 'suburb'} maxLength={name === 'phone' ? 25 : 254}
                placeholder={{name:'Enter your full name',email:'name@example.com',phone:'e.g. 0412 345 678',suburb:'Where is your property?'}[name]}
                aria-invalid={!!errors[name]} aria-describedby={errors[name] ? 'error-' + name : undefined} />
              {errors[name] && <span id={'error-' + name} className="field-error">{errors[name]}</span>}
            </label>)}
            <button className="gold-button quote-submit" type="submit">Prepare email enquiry <ArrowRight size={17} /></button>
            <p className="quote-privacy">Nothing is sent automatically. <button type="button" className="quote-text-link" onClick={() => setPolicy('privacy')}>Privacy information</button></p>
          </form>}
        </div>
      </div>
    </section>
    <div className="benefit-strip"><div className="landing-container">{benefits.map(({ icon: Icon, text }) => <div key={text}><Icon size={24} aria-hidden="true" /><span>{text}</span></div>)}</div></div>
    <PolicyDialog type={policy} onClose={() => setPolicy(null)} />
  </>;
}
