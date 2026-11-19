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

export const feeVersion = '2026-11-client-supplied-v1';
export const professionalFee = '$660 + GST';
export const governmentCalculator = 'https://www.sa.gov.au/topics/housing/planning-and-property/property-transfer-fee-calculator';
export const dutyCalculator = 'https://www.revenuesa.sa.gov.au/stamp-duty-land/calculate-stamp-duty';
export const commonCharges = [
  ['File fee', '$88.00'],
  ['PEXA electronic settlement fee', '$146.30'],
  ['Identity check', '$50.00 per person'],
  ['AML / CTF check', '$25.00 per person'],
];
// Third-party amounts are the client's supplied guide figures, not a complete settlement total.
// No tax assumptions or aggregate total are applied to these amounts.
export function getBreakdown(service) {
  if (!['buy', 'sell'].includes(service)) return [['Conveyancing service', 'Personal quote required'], ['Other charges', 'Confirmed for your transaction']];
  return [
    ['Our conveyancing fee', professionalFee],
    ...commonCharges,
    ...(service === 'buy' ? [
      ['Mortgage registration (if needed)', '$204.00'],
      ['Stamp duty & lodgement fees', 'As charged'],
    ] : [
      ['Mortgage discharge (if needed)', '$204.00'],
      ['Special water meter reading', '$25.00'],
      ['Form 1 & searches', 'Separate cost, if needed'],
    ]),
    ['Special orders (if needed)', 'Quoted separately'],
    ['Settlement adjustments', 'Based on your property & settlement date'],
  ];
}

export function getOptionalCharges(service) {
  return service === 'buy' ? [['Priority notice (optional)', '$38.00'], ['Copy of new title (optional)', '$38.00']] : [];
}
