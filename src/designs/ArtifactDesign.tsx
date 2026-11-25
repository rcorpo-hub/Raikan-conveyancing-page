import { useEffect, useRef } from 'react';
import design2 from './artifact/design-2.html?raw';
import design3 from './artifact/design-3.html?raw';
import { mountArtifact } from './artifact/app';
import { RaikanChatbot } from '../components/chatbot/RaikanChatbot';

export function ArtifactDesign({ design }: { design: 2 | 3 }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => root.current ? mountArtifact(root.current) : undefined, [design]);
  function openQuote(service?: string) {
    const value = service?.includes('sell') ? 'sell' : /family|transfer/.test(service || '') ? 'transfer' : 'buy';
    const choices: Record<string, string> = { 'land-division': 'division', 'contract-review': 'contract', 'private-contracts': 'private-contract' };
    root.current?.dispatchEvent(new CustomEvent('raikan:select-service', { detail: { service: service && choices[service] ? 'other' : value, choice: service ? choices[service] : undefined } }));
    document.querySelector('#quote')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    root.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus({ preventScroll: true });
  }
  return <><div ref={root} className={`artifact-design artifact-design-${design}`} dangerouslySetInnerHTML={{ __html: design === 2 ? design2 : design3 }} />
    <RaikanChatbot onOpenQuote={openQuote} onNavigateHowItWorks={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} />
  </>;
}
