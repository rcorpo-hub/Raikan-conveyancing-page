export const transactionOptions = {
  buy: { label: 'Property price', choices: [['below','Under $1 million'],['above','Over $1 million']] },
  sell: { label: 'How are you selling?', choices: [['private','Privately'],['agent','Through an agent']] },
  transfer: { label: 'Transfer between', choices: [['spouse','Current spouse'],['former','Former spouse'],['family','Other family']] },
  other: { label: 'Other conveyancing', choices: [['division','Land division'],['contract','Contract advice'],['private-contract','Private contracts'],['form1','Form 1 preparation']] },
};
export function selectionFor(service,choice) {
  const selected=transactionOptions[service]?service:'buy';
  return {service:selected,choice:transactionOptions[selected].choices.some(([key])=>key===choice)?choice:transactionOptions[selected].choices[0][0]};
}
