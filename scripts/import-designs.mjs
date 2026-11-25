// One-time import of the supplied artboards and a pinned main-branch snapshot.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import postcss from 'postcss';
await mkdir('src/designs/artifact',{recursive:true});
await mkdir('src/designs/main',{recursive:true});
for(const [file,number] of [['main',2],['option2',3]]) {
  const source=await readFile('tmp/artifact-source/'+file+'.html','utf8');
  const css=source.match(/<style>([\s\S]*?)<\/style>/)[1];
  let html=source.match(/<x-dc>([\s\S]*?)<\/x-dc>/)[1].replace(/<helmet>[\s\S]*?<\/helmet>/,'');
  html=html.replace(/onSubmit="\{\{ noop \}\}"/g,'data-form="contact" data-artifact-form novalidate');
  for(const [binding,service] of [['pickBuy','buy'],['pickSell','sell'],['pickFamily','transfer']])html=html.replaceAll(`onClick="{{ ${binding} }}"`,`data-artifact-service="${service}"`);
  html=html.replace(/<sc-for[\s\S]*?<\/sc-for>/g,'<span class="artifact-choices" data-artifact-choices></span>');
  html=html.replaceAll('aria-label="{{ subLabel }}"','aria-label="Transaction details"').replaceAll('{{ subLabel }}','<span data-artifact-choice-label>Property price</span>');
  html=html.replace(/aria-pressed="\{\{ (buy|sell|family)On \}\}"/g,'aria-pressed="false"').replace(/\{\{ (buy|sell|family)Bg \}\}/g,'transparent').replace(/\{\{ (buy|sell|family)Color \}\}/g,'#3B3F45');
  for(const blob of new Set(source.match(/\/_blob\/[a-z0-9]+/g)||[])){
    const name=blob.split('/').pop();const bytes=await readFile('public/design-assets/'+name+'.webp').catch(()=>readFile('public/design-assets/'+name+'.png'));
    const ext=bytes[0]===137?'png':'webp';
    html=html.replaceAll(blob,'/design-assets/'+name+'.'+ext);
  }
  html=html.replaceAll('<input type="text" autocomplete="name"','<input name="name" required maxlength="110" type="text" autocomplete="name"')
    .replaceAll('<input type="email"','<input name="email" required maxlength="254" type="email"')
    .replaceAll('<input type="tel"','<input name="phone" required maxlength="30" type="tel"')
    .replaceAll('<input type="text" inputmode="numeric"','<input name="propertyValue" maxlength="60" type="text" inputmode="decimal"')
    .replaceAll('<textarea placeholder=','<textarea name="notes" maxlength="2000" placeholder=')
    .replaceAll('<input type="text" placeholder="Anything','<input name="notes" maxlength="2000" type="text" placeholder="Anything')
    .replaceAll('id="f-consent" type="checkbox"','id="f-consent" name="communicationsConsent" type="checkbox"')
    .replace('Phone <span style="font-weight:500">(optional)</span>','Mobile <span style="font-weight:500">(required for SMS)</span>');
  html=html.replace(/<a href="#"([^>]*)>Vendor pack/g,'<a href="/documents/conveyancing-process-vendor.pdf" target="_blank" rel="noopener noreferrer"$1>Vendor pack')
    .replace(/<a href="#"([^>]*)>Buyer pack/g,'<a href="/documents/conveyancing-process-buyer.pdf" target="_blank" rel="noopener noreferrer"$1>Buyer pack')
    .replace(/<a href="#"([^>]*)>Privacy Policy/g,'<a href="#" data-artifact-policy="privacy"$1>Privacy Policy')
    .replace(/<a href="#"([^>]*)>Terms &amp; Conditions/g,'<a href="#" data-artifact-policy="terms"$1>Terms &amp; Conditions')
    .replace('<a href="#faq">FAQs</a>','<a href="#how">How it works</a>');
  await writeFile(`src/designs/artifact/design-${number}.html`,html);
  await writeFile(`src/designs/artifact/design-${number}.css`,css);
}
const git=file=>execFileSync('git',['show','origin/main:'+file],{encoding:'utf8'});
const commit=execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim();
await writeFile('src/designs/main/markup.html',git('src/reference/markup.html'));
await writeFile('src/designs/main/style.css',git('src/reference/style.css'));
await writeFile('src/designs/main/snapshot.json',JSON.stringify({branch:'origin/main',commit,adaptations:['shared live API, consent and CAPTCHA','async submission errors and pending state','current fee wording']},null,2)+'\n');
let app=git('src/reference/app.js').replace("import { services } from './config.js';","import { services } from '../../reference/config.js';")
  .replace("import { track, workflow } from './preview.js';","import { track, workflow, enhanceForms, showFormError, deliveryCopy } from '../../reference/api.js';");
const rendererStart=app.indexOf('  function renderHeroQuoteCard()');
const rendererEnd=app.indexOf('  function field(',rendererStart);
let renderer=app.slice(rendererStart,rendererEnd).replace(/(\n\s*`;\r?\n)/g,'$1      enhanceForms(container);\n');
renderer=renderer.replace(/<div class="hero-breakdown-row"><span>Professional fee<\/span><strong>\$600<\/strong><\/div>[\s\S]*?<div class="hero-breakdown-row total">[\s\S]*?<\/div>/,'<div class="hero-breakdown-row total"><span>Professional fee</span><strong class="price-highlight">$660 + GST</strong></div>')
 .replace(/We’ll email your itemised quote and send an SMS link to <strong>\$\{esc\(fullPhone\)\}<\/strong>\. No obligation to proceed\./,'${esc(deliveryCopy(heroForm.lead))}')
 .replace('our $660 fixed professional fee (including 10% GST)','our $660 + GST professional fee');
app=app.slice(0,rendererStart)+renderer+app.slice(rendererEnd);
app=app.replace('dialogContent.innerHTML = body;','dialogContent.innerHTML = body;\n    enhanceForms(dialogContent);');
const submitStart=app.indexOf("  listen(document, 'submit', (event) => {");
const submitEnd=app.indexOf('\n  const start = Date.now();',submitStart);
let submit=app.slice(submitStart,submitEnd).replace("'submit', (event)","'submit', async (event)");
submit=submit.replace('    const form = event.target;',`    const form = event.target;
    if (!form.dataset.heroForm && !form.dataset.form) return;
    event.preventDefault();
    if (form.dataset.submitting) return;
    form.dataset.submitting = 'true';
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    form.setAttribute('aria-busy','true');
    try {`);
submit=submit.replace('      heroForm.step = 4;\n','').replace('      heroForm.step = 4;\r\n','')
 .replace('heroForm.lead = workflow.createQuote(','heroForm.lead = await workflow.createQuote(')
 .replace('contact: { ...heroForm.contact },','contact: { ...heroForm.contact, countryCode: userCountry.code },')
 .replace('callback: heroForm.contact.callback,\n      });','callback: heroForm.contact.callback,\n      }, form);\n      heroForm.step = 4;')
 .replace('callback: heroForm.contact.callback,\r\n      });','callback: heroForm.contact.callback,\r\n      }, form);\n      heroForm.step = 4;')
 .replace('state.lead = workflow.createQuote(','state.lead = await workflow.createQuote(')
 .replace('callback: state.callback });','callback: state.callback }, form);')
 .replace('workflow.requestCallback(values);','await workflow.requestCallback(values, form);')
 .replace('workflow.saveOnboarding(values, true);','await workflow.saveOnboarding(values, true);');
submit=submit.replace(/\n  \}\);\s*$/,`\n    } catch (error) {
      showFormError(form.isConnected ? form : document.querySelector('#hero-quote-card form'), error);
    } finally {
      delete form.dataset.submitting;
      form.removeAttribute('aria-busy');
      if (button) button.disabled = false;
    }
  });\n`);
app=app.slice(0,submitStart)+submit+app.slice(submitEnd);
app=app.replace("'click', (event)","'click', async (event)")
 .replace('      workflow.recordIntent();',"      try { await workflow.recordIntent(); } catch { return openDialog('Please try again', '<p>We could not record your request. Please call 08 7076 9899.</p>'); }");
app=app.replace('Preview reference ','Reference ').replace("previewNote('Preview only. No email or SMS was sent and no callback has been booked.')","previewNote(esc(deliveryCopy(state.lead)))")
 .replaceAll('Callback selected for this preview.','A callback has been requested.').replaceAll('Preview only · Nothing is sent or saved yet.','Your details are sent securely to Raikan.')
 .replaceAll('Your onboarding details are complete for this preview.','Your details have been saved for our team to review.')
 .replaceAll('Complete preview onboarding','Save my details').replaceAll('Use sample contact details for this preview.','')
 .replaceAll('Callback preview complete.','Your callback request is saved.').replaceAll('This was a preview request. To speak with RAIKAN, call','Our team will review your request. To speak with RAIKAN, call')
 .replaceAll('Your interest is recorded for this preview. Formal engagement is a separate step.','Your interest will be recorded. Formal engagement is a separate step.');
app=app.replace("privacy: ['Preview privacy', 'Use sample details to try the quote and callback flows. Form details stay in this page until you close or reload it. The preview sends no emails or text messages.']", "privacy: ['Enquiry privacy', 'Your submitted details are stored to prepare your quote and respond to your enquiry. Email and SMS are handled through the configured delivery providers. This is not a marketing sign-up.']")
 .replace('This private preview demonstrates how an enquiry works.','Submitting an enquiry does not create a formal engagement.');
await writeFile('src/designs/main/app.js',app);
await writeFile('src/designs/main/app.d.ts','export function mountReference(): () => void;\n');
// Reuse the actual existing chatbot rules without importing unrelated page styles.
const sheet=postcss.parse(await readFile('src/index.css','utf8'));
const selected=postcss.root();
for(const node of sheet.nodes){
  if(node.type==='rule'&&/chat-|mobile-help-button/.test(node.selector))selected.append(node.clone());
  if(node.type==='atrule'&&node.nodes){const c=node.clone();c.removeAll();for(const rule of node.nodes)if(rule.type==='rule'&&/chat-|mobile-help-button/.test(rule.selector))c.append(rule.clone());if(c.nodes.length)selected.append(c);}
}
await writeFile('src/designs/chatbot.css',selected.toString());
console.log('Imported artifact designs 2/3 and main snapshot '+commit+'.');
