export const services = {
  buy: {
    label: 'Buying a property', icon: 'house', question: 'What’s the purchase price?',
    choices: [['below', 'Under $1 million'], ['above', '$1 million or more'], ['unsure', 'I’m not sure yet']],
  },
  sell: {
    label: 'Selling a property', icon: 'tag', question: 'How are you selling?',
    choices: [['agent', 'Through a real estate agent'], ['private', 'Selling privately'], ['unsure', 'I’m not sure yet']],
  },
  transfer: {
    label: 'Transferring property', icon: 'transfer', question: 'Who is the transfer between?',
    choices: [['spouse', 'Current spouses'], ['former', 'Former spouses'], ['family', 'Other family members'], ['unsure', 'Something else or not sure']],
  },
  other: {
    label: 'Other conveyancing', icon: 'quote', question: 'What do you need help with?',
    choices: [['division', 'Land division'], ['contract', 'Pre-purchase contract advice'], ['private-contract', 'Private contract preparation'], ['form1', 'Form 1 preparation']],
  },
};

// Only enter approved amounts in Australian cents against service and choice.
// For live use, apply the approved rules on the server and return a versioned quote.
const approvedPricing = Object.freeze({});

export function getBreakdown(service, choice) {
  const pricing = approvedPricing[service]?.[choice];
  const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
  const format = (cents, fallback) => Number.isSafeInteger(cents) && cents >= 0
    ? money.format(cents / 100)
    : fallback;
  return [
    ['Professional fee', format(pricing?.professional, 'Pending confirmation')],
    ['GST', format(pricing?.gst, 'Pending confirmation')],
    ['Third-party costs', format(pricing?.disbursements, 'Depends on the property')],
    ['Total (AUD)', format(pricing?.total, 'To be confirmed')],
  ];
}
