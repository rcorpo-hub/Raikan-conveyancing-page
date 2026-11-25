import { workflow,enhanceForms,showFormError,deliveryCopy } from '../../reference/api.js';
import { services,getBreakdown,getOptionalCharges,governmentCalculator } from '../../reference/config.js';
import { transactionOptions,selectionFor } from './selection.js';

export function mountArtifact(root) {
  const abort=new AbortController();
  const listen=(element,event,handler)=>element.addEventListener(event,handler,{signal:abort.signal});
  const form=root.querySelector('form[data-artifact-form]');
  const trigger=form.querySelector('button[type="submit"]');
  const summary=document.createElement('dialog');summary.className='artifact-result-dialog';
  root.append(summary);
  let selection=selectionFor('buy','below');
  let sending=false;
  workflow.reset();
  const make=(tag,text,className)=>{const element=document.createElement(tag);if(text)element.textContent=text;if(className)element.className=className;return element;};
  function renderChoices(){
    for(const button of root.querySelectorAll('[data-artifact-service]')){
      const selected=button.dataset.artifactService===selection.service;
      button.setAttribute('aria-pressed',String(selected));button.style.background=selected?'#1D1D22':'transparent';button.style.color=selected?'#fff':'#3B3F45';
    }
    for(const element of root.querySelectorAll('[data-artifact-choice-label]'))element.textContent=transactionOptions[selection.service].label;
    const choices=root.querySelector('[data-artifact-choices]');choices.replaceChildren();
    for(const [key,label] of transactionOptions[selection.service].choices){
      const button=make('button',label,'chip');button.type='button';button.dataset.artifactChoice=key;
      button.setAttribute('aria-pressed',String(key===selection.choice));choices.append(button);
    }
  }
  function choose(service,choice){selection=selectionFor(service,choice);renderChoices();}
  listen(root,'raikan:select-service',event=>choose(event.detail.service,event.detail.choice));
  function close(){summary.close();trigger.focus({preventScroll:true});}
  function showResult(result,submittedSelection){
    summary.replaceChildren();
    const closeButton=make('button','Close','artifact-dialog-close');closeButton.type='button';listen(closeButton,'click',close);
    const title=make('h2','A clear view of your costs');title.id='artifact-result-title';title.tabIndex=-1;
    summary.setAttribute('aria-labelledby',title.id);
    summary.append(closeButton,make('p','Thanks for your enquiry','eyebrow'),title,make('p',services[submittedSelection.service].label,'artifact-result-service'),make('p',deliveryCopy(result)),make('p','Reference: '+result.reference,'artifact-result-reference'));
    const list=make('dl',null,'artifact-cost-list');
    for(const [label,amount] of [...getBreakdown(submittedSelection.service),...getOptionalCharges(submittedSelection.service)]){
      const row=make('div');row.append(make('dt',label),make('dd',amount));list.append(row);
    }
    const calculator=make('a','SA government property fee calculator');calculator.href=governmentCalculator;calculator.target='_blank';calculator.rel='noopener noreferrer';
    const done=make('button','Done','cta');done.type='button';listen(done,'click',close);
    summary.append(list,make('p','This is a cost guide, not your total settlement cost. The team will confirm the charges for your property.'),calculator,done);
    summary.showModal();title.focus();
  }
  listen(root,'click',event=>{
    const button=event.target.closest('[data-artifact-service],[data-artifact-choice]');
    if(button){if(button.dataset.artifactService)choose(button.dataset.artifactService);else choose(selection.service,button.dataset.artifactChoice);return;}
    const link=event.target.closest('a');if(!link)return;
    if(link.dataset.artifactPolicy){
      event.preventDefault();summary.replaceChildren();const title=make('h2',link.dataset.artifactPolicy==='privacy'?'Enquiry privacy':'Terms and engagement');title.id='artifact-result-title';summary.setAttribute('aria-labelledby',title.id);
      summary.append(title,make('p',link.dataset.artifactPolicy==='privacy'?'Your form details are sent to Raikan to prepare your quote and respond to your enquiry. Email and text messages are handled by the configured delivery providers. This form does not sign you up for marketing. Please do not enter private identity documents or bank details in the help chat.':'Submitting an enquiry does not create a formal engagement. Raikan will confirm the work, fees and engagement terms before you proceed.'));
      const done=make('button','Close','cta');done.type='button';listen(done,'click',close);summary.append(done);summary.showModal();return;
    }
    if(link.getAttribute('href')==='#quote'){
      const label=link.textContent.trim();
      if(/^Buying a property/.test(label))choose('buy');
      else if(/^Selling a property/.test(label))choose('sell');
      else if(/^Transferring property/.test(label))choose('transfer');
      else if(/^Land divisions/.test(label))choose('other','division');
      else if(/^Contract and/.test(label))choose('other','contract');
      else if(/^Preparation of private/.test(label))choose('other','private-contract');
      else if(/^Preparation of Form/.test(label))choose('other','form1');
    }
  });
  listen(form,'submit',async event=>{
    event.preventDefault();if(sending)return;
    const fields=['name','email','phone'];
    for(const name of fields){const input=form.elements.namedItem(name);input.value=input.value.trim();}
    if(!form.reportValidity())return;
    sending=true;trigger.disabled=true;trigger.textContent='Sending your enquiry…';form.setAttribute('aria-busy','true');
    const error=form.querySelector('.enquiry-form-error');if(error)error.hidden=true;
    const values=Object.fromEntries(new FormData(form));
    const submittedSelection={...selection};
    try{
      const result=await workflow.createQuote({...submittedSelection,contact:{name:values.name,email:values.email,phone:values.phone,propertyValue:values.propertyValue||'',notes:values.notes||'',countryCode:'AU'},callback:false},form);
      if(!abort.signal.aborted)showResult(result,submittedSelection);
    }catch(error){if(!abort.signal.aborted)showFormError(form,error);}
    finally{sending=false;trigger.disabled=false;trigger.textContent='Get my fixed-fee quote';form.removeAttribute('aria-busy');}
  });
  renderChoices();enhanceForms(root);
  return ()=>{abort.abort();if(summary.open)summary.close();summary.remove();};
}
