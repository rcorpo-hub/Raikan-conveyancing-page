import { siteConfig } from '../../data/site.config';

export interface ChatAction {
  label: string;
  actionType: 'open-quote' | 'call' | 'open-page' | 'open-voi';
  payload?: string;
}
export interface BotResponse { text: string; actions?: ChatAction[]; suggestedFollowups?: string[]; }
export interface MessageContext { serviceCategory?: string; }
export const INITIAL_SUGGESTIONS = ['Get your quote', 'What is conveyancing?', 'Buying a property', 'Selling a property', 'Fees and extra costs', 'Contact the team'];
const quote = (service = 'buying'): ChatAction => ({ label: 'Get your quote', actionType: 'open-quote', payload: service });
const call: ChatAction = { label: 'Call the team', actionType: 'call', payload: siteConfig.phoneRaw };
const process: ChatAction = { label: 'Watch the four steps', actionType: 'open-page', payload: 'how-it-works' };

export function generateBotResponse(input: string, context: MessageContext = {}): BotResponse {
  const q = input.toLowerCase().trim();
  if (/sell|vendor/.test(q)) context.serviceCategory = 'selling';
  else if (/family|spous|transfer/.test(q)) context.serviceCategory = 'family-transfer';
  else if (/buy|purchas/.test(q)) context.serviceCategory = 'buying';
  const service = context.serviceCategory || 'buying';
  const response = (text: string, actions: ChatAction[] = [quote(service)], followups = ['Fees and extra costs', 'Contact the team']): BotResponse =>
    ({ text, actions, suggestedFollowups: followups });

  // Specific questions precede general service keywords.
  if (/upload|send.*(contract|document)|share.*(contract|document)/.test(q)) {
    return response("**There is no document upload in this preview.**\n\nPlease do not paste contracts, identity documents or bank details into this chat. Call or email the team to ask how to share documents securely.\n\nEmail: [info@rcorpo.com](mailto:info@rcorpo.com)", [call], ['Contact the team', 'What is a Form 1?']);
  }
  if (/human|person|automated|robot|\bbot\b|are you ai/.test(q)) {
    return response("**I’m an automated website guide, not a live team member.**\n\nI can explain the information on this site and help you find the right section. I cannot review a contract, check your case or send an enquiry for you.\n\nTo speak to a person, call [08 7076 9899](tel:0870769899) or email [info@rcorpo.com](mailto:info@rcorpo.com).", [call]);
  }
  if (/what is conveyanc|what does.*conveyanc|plain english|what do you do|explain conveyanc/.test(q)) {
    return response("**Conveyancing is the document and legal process of transferring a property from one owner to another.**\n\nA conveyancer helps check the paperwork, coordinate with the people involved and prepare for settlement—the day the transaction is completed.\n\nYou can start by telling the team whether you are buying, selling or transferring property.", [process, quote(service)], ['Buying a property', 'Selling a property', 'Fees and extra costs']);
  }
  if (/stamp duty|first.home|concession|\bfhb\b|tax|exempt/.test(q)) {
    return response("**Stamp duty is a government charge, separate from the conveyancer’s fee.**\n\nWhether you qualify for relief depends on the property and your circumstances. First-home-buyer status alone does not establish eligibility.\n\nThis guide does not confirm relief or current government charges. Ask the team to confirm the amounts for your transaction.", [quote(service), call], ['What are extra costs?', 'Contact the team']);
  }
  if (/disburse|extra cost|additional cost|what.*includ|what.*exclud/.test(q)) {
    return response("**Extra costs are charges separate from the professional fee.**\n\nThey may include:\n- Government duty and title registration.\n- Property searches and certificates.\n- Electronic settlement charges and rate adjustments.\n\nAsk for a written quote that lists the work included and each additional charge. The advertised starting professional fee is not the full cost of a property transaction.", [quote(service), call], ['Fees and extra costs', 'How does the process work?']);
  }
  if (/form\s*1/.test(q)) {
    return response("**A Form 1 is the seller’s property disclosure statement in South Australia.**\n\nIt gives the buyer important information about the property. It is different from the contract of sale. Ask your conveyancer to explain anything you do not understand before you commit.\n\nI cannot check a Form 1 or confirm your deadlines in this chat.", [quote('contract-review'), call], ['How do I send my contract?', 'What is cooling off?']);
  }
  if (/cooling|deadline|urgent|auction|breach|dispute|sue/.test(q)) {
    return response("**Please contact the team directly about a deadline or an urgent contract question.**\n\nThe answer depends on your documents and how the property is being purchased. This guide cannot calculate a legal deadline or tell you whether a right applies.\n\nIf you have a deadline, explain it when you call rather than waiting for an online reply.", [call, quote('contract-review')], ['How do I send my contract?', 'Contact the team']);
  }
  if (/pexa/.test(q)) return response("**PEXA is an electronic property-settlement platform.**\n\nConveyancers, lenders and other participants use it to coordinate parts of the settlement process. Your conveyancer can explain what you need to do and how payment instructions will be verified.", [process, call]);
  if (/adjustment/.test(q)) return response("**Settlement adjustments divide certain property costs between buyer and seller.**\n\nFor example, council or water charges may be divided according to the settlement date. Ask to see the itemised figures before settlement; the starting professional fee does not include these adjustments.", [call, quote(service)]);
  if (/how long|duration|time.*settle|settle.*time/.test(q)) return response("**Your settlement date depends on the contract and the arrangements between the parties.**\n\nTell the team your agreed date, finance status and any urgent conditions. They can explain what needs to happen before settlement. This guide cannot promise a completion time.", [process, call]);
  if (/privacy|data|retain|save.*chat|delete/.test(q)) return response("**This conversation stays in this page’s memory and resets when the page is reloaded.**\n\nDo not enter private transaction or identity details here. In preview mode, the enquiry form prepares an email draft for you to review; nothing is sent automatically. Read the Privacy information link beside the form for more detail.", [call], ['How do I send my contract?', 'Contact the team']);
  if (/identity|\bvoi\b|passport|id check|driver/.test(q)) return response("**Your conveyancer will explain how to verify your identity.**\n\nDo not upload or paste identity documents here. Ask the team which documents and verification method are appropriate for you before arranging a check.", [call], ['How do I send my contract?', 'Contact the team']);
  if (/contact|speak|talk|phone|call|email|office|address|hours|location/.test(q)) {
    return response("**You can contact the team directly.**\n\n- Phone: [08 7076 9899](tel:0870769899)\n- Email: [info@rcorpo.com](mailto:info@rcorpo.com)\n- Office area: Broadview, Adelaide SA 5083. Ask for appointment details before visiting.\n\nThe hours listed on this site are Monday–Friday, 9 am–5 pm ACST. This chat is automated and does not show live staff availability.", [call, quote(service)], ['Fees and extra costs', 'How does the process work?']);
  }
  if (/what services|which services|services.*provide/.test(q)) return response("**The website lists these conveyancing services.**\n\n- Buying or selling a property.\n- Family property transfers.\n- Contract and pre-purchase advice.\n- Land divisions.\n- Private contract preparation.\n\nTell the team what you need so they can confirm the work and fee.", [quote(service), call], ['Buying a property', 'Selling a property', 'Fees and extra costs']);
  if (/online|digital/.test(q)) return response("**You can explore fees and calculate your instant quote online.**\n\nOur fixed professional fee is $660 including GST. Use our interactive quote calculator to view your itemised breakdown including South Australian government charges.", [quote(service), call], ['Buying a property', 'Selling a property', 'Fees and extra costs']);
  if (/get.*quote|calculate.*quote|instant quote|^quote\b/.test(q)) {
    return response(
      "**Get your instant itemised quote in 30 seconds.**\n\nOur fixed professional fee is $660 including GST. Select your transaction type on our quote form to calculate your itemised quote with all statutory government charges.",
      [quote(service), call],
      ['Buying a property', 'Selling a property', 'Fees and extra costs']
    );
  }
  if (/cost|fee|price|quote|how much/.test(q)) {
    const tailored = service === 'family-transfer';
    return response(tailored
      ? "**Family transfers need an individual quote.**\n\nThe work and additional charges depend on your circumstances. Share the type of transfer with the team so they can confirm the scope and fee."
      : "**The advertised professional fee starts at $660 including GST.**\n\nThat is $600 professional fee + $60 GST for a standard transaction. It is not the full settlement cost. Government charges, searches and other applicable costs are additional.\n\nThe team needs to confirm the scope and full quote for your property.", [quote(service), call], ['What are extra costs?', 'Contact the team']);
  }
  if (/how.*work|process|step|stage|timeline/.test(q)) return response("**There are four broad steps.**\n\n1. Tell the team what you need and confirm the quote.\n2. Review documents and agree the next steps.\n3. Coordinate with the parties and stay informed.\n4. Prepare for settlement and confirm completion.\n\nThe moving slides on this page explain each stage.", [process, quote(service)], ['How long does settlement take?', 'What is PEXA?']);
  if (/family|spous|transfer|gift|divorce|estate/.test(q)) return response("**A family transfer changes who is named as an owner of a property.**\n\nThe steps and costs depend on the reason for the transfer and the people involved. Tell the team what you want to change; they can confirm the documents and any advice you need.", [quote('family-transfer'), call], ['How much does a transfer cost?', 'Contact the team']);
  if (/division|subdiv|boundary|allotment/.test(q)) return response("**Land division involves creating or changing property titles.**\n\nThe team can discuss the conveyancing work alongside your surveyor and other relevant parties. Ask for a quote based on your proposed division.", [quote('land-division'), call]);
  if (/private contract|off.market/.test(q)) return response("**Selling without an agent? Ask about private contract preparation.**\n\nExplain the proposed transaction before signing so the team can confirm the documents and work required.", [quote('private-contracts'), call]);
  if (/review|contract|condition/.test(q)) return response("**A contract review helps you understand what you are agreeing to before you sign.**\n\nAsk the team to explain the conditions, costs and relevant dates in your documents. I cannot review documents or give case-specific advice here.", [quote('contract-review'), call], ['How do I send my contract?', 'What is a Form 1?']);
  if (/sell|vendor/.test(q)) return response("**Selling a property? The team can help with the paperwork and settlement arrangements.**\n\n- Discuss the contract and seller disclosure documents.\n- Coordinate with your lender and the buyer’s representative.\n- Explain the settlement figures and next steps.\n\nTell the team whether you are using an agent or selling privately.", [quote('selling'), process], ['What is a Form 1?', 'How much does selling cost?']);
  if (/buy|purchas/.test(q)) return response("**Buying a property? Start by understanding the contract before you commit.**\n\nThe team can discuss document checks, important dates and settlement arrangements with you. Let them know if you already have a contract or are still looking.", [quote('buying'), process], ['What is a Form 1?', 'Fees and extra costs']);
  if (/^(hi|hello|hey|thanks|thank you)\b/.test(q)) return response("Hello! I’m Raikan’s automated website guide. I can explain the process, fees and services or help you contact the team. What would you like to know?", [], INITIAL_SUGGESTIONS);
  return response("**I don’t have a specific answer to that question.**\n\nI can help with the information on this website, but I cannot assess your personal circumstances. Try a topic below, or contact the team for a direct answer.", [call], ['What is conveyancing?', 'Fees and extra costs', 'How does the process work?']);
}
