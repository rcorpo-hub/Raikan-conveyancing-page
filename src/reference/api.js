import { parsePhoneNumberFromString } from 'libphonenumber-js';
let lead;
let settings;
let scriptPromise;
const requests=new Map();
const widgets=new Map();
const attribution=Object.fromEntries(['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].flatMap(key=>{
  const value=new URLSearchParams(location.search).get(key);
  return value&&value.length<=150?[[key,value]]:[];
}));
export function track(event,{service,step,entry}={}) {
  window.dispatchEvent(new CustomEvent('raikan:conversion',{detail:{event,service,step,entry,mode:'api'}}));
}
export async function publicSettings() {
  if(!settings)settings=fetch('/api/config').then(r=>r.ok?r.json():Promise.reject()).catch(()=>({storageAvailable:false,smsEnabled:false,emailEnabled:false,turnstileSiteKey:''}));
  return settings;
}
async function loadTurnstile() {
  if(window.turnstile)return window.turnstile;
  if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
    script.onload=()=>resolve(window.turnstile);script.onerror=()=>{scriptPromise=undefined;reject(new Error('Security check unavailable.'));};
    document.head.append(script);
  });
  return scriptPromise;
}
export function enhanceForms(root=document) {
  void publicSettings().then(async config=>{
    for(const [element,id] of widgets)if(!element.isConnected){window.turnstile?.remove(id);widgets.delete(element);}
    for(const form of root.querySelectorAll('form[data-hero-form],form[data-form="contact"],form[data-form="callback"]')) {
      if (['step1','page1'].includes(form.dataset.heroForm)) continue;
      if(form.dataset.apiEnhanced)continue;
      form.dataset.apiEnhanced='true';
      const controls=document.createElement('div');controls.className='enquiry-permissions';
      const callback=form.dataset.form==='callback';
      const consent=form.querySelector('[name="communicationsConsent"]')?'':`<label class="enquiry-consent"><input type="checkbox" name="communicationsConsent"><span>${callback?'I ask Raikan to contact me about this callback request.':'Please email and text my quote, and contact me about this enquiry.'} This is not a marketing sign-up.</span></label>`;
      controls.innerHTML=`${consent}<label class="enquiry-honeypot" aria-hidden="true">Leave this empty<input name="website" type="text" tabindex="-1" autocomplete="off"></label><div class="enquiry-captcha"></div><p class="enquiry-form-error" role="alert" hidden></p>`;
      form.querySelector('button[type="submit"]')?.before(controls);
      if(config.turnstileSiteKey){
        try{
          const turnstile=await loadTurnstile();
          if(!form.isConnected)continue;
          const element=controls.querySelector('.enquiry-captcha');
          widgets.set(element,turnstile.render(element,{sitekey:config.turnstileSiteKey,action:'quote_enquiry',theme:'auto',size:matchMedia('(max-width:480px)').matches?'compact':'normal'}));
        }catch{const error=controls.querySelector('[role="alert"]');error.hidden=false;error.textContent='The security check could not load. Please refresh or call us.';}
      }
    }
  });
}
export function showFormError(form,error) {
  let element=form.querySelector('.enquiry-form-error');
  if(!element){element=document.createElement('p');element.className='enquiry-form-error';element.setAttribute('role','alert');form.append(element);}
  element.hidden=false;element.textContent=error.message || 'We could not save your enquiry. Please try again or call us.';
  element.setAttribute('tabindex','-1');element.focus();
  for(const [target,id] of widgets)if(form.contains(target))window.turnstile?.reset(id);
}
async function post(path,payload,{key,token}={}) {
  let response;
  try { response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)}); }
  catch{throw new Error('We could not confirm your enquiry. Please try again; the same request will not be saved twice.');}
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result.error || 'The enquiry service is unavailable. Please call 08 7076 9899.');
  return result;
}
async function create(path,payload,form) {
  if(!form?.querySelector('[name="communicationsConsent"]')?.checked)throw new Error('Please tick the contact permission box before submitting.');
  const signature=JSON.stringify(payload);
  let request=requests.get(path);
  if(!request||request.signature!==signature){request={signature,key:crypto.randomUUID()};requests.set(path,request);}
  const result=await post(path,{...payload,consent:true,website:form.querySelector('[name="website"]')?.value || '',captchaToken:form.querySelector('[name="cf-turnstile-response"]')?.value || ''},{key:request.key});
  return result;
}
export function deliveryCopy(result) {
  const jobs=result?.delivery || [];
  const active=jobs.filter(j=>['pending','processing','accepted','delivered'].includes(j.status));
  const sms=active.some(j=>j.channel==='client_sms'), email=active.some(j=>j.channel==='client_email');
  if(sms&&email)return 'Your enquiry is saved. Your email and text are being prepared.';
  if(sms)return 'Your enquiry is saved. Your text message is being prepared.';
  if(email)return 'Your enquiry is saved. Your email is being prepared.';
  return 'Your enquiry is saved. Automated messages are not available for this request. Please call us if you need help.';
}
export const workflow={
  async createQuote({service,choice,contact,callback},form){
    const parsed=parsePhoneNumberFromString(contact.phone,contact.countryCode || 'AU');
    if(!parsed?.isValid())throw new Error('Please enter a valid phone number and choose the correct country.');
    lead=await create('/api/quotes',{service,choice,contact:{...contact,phone:parsed.number},callback:Boolean(callback),attribution},form);
    track('lead_created',{service});return lead;
  },
  async requestCallback({name,phone,time},form){
    if(lead)return post(`/api/leads/${lead.id}/callback`,{contact:{name,phone},time},{token:lead.accessToken});
    return create('/api/callbacks',{contact:{name,phone},time,attribution},form);
  },
  async recordIntent(){if(lead)return post(`/api/leads/${lead.id}/intent`,{},{token:lead.accessToken});},
  async saveOnboarding(draft,completed=false){if(lead&&completed)return post(`/api/leads/${lead.id}/onboarding`,{suburb:draft.suburb || '',date:draft.date || '',contact:{name:draft.name,email:draft.email,phone:draft.phone},completed},{token:lead.accessToken});},
  reset(){lead=undefined;requests.clear();},
};
