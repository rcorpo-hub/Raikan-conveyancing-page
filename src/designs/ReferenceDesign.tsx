import { useEffect } from 'react';
import currentMarkup from '../reference/markup.html?raw';
import mainMarkup from './main/markup.html?raw';
import { mountReference as mountCurrent } from '../reference/app';
import { mountReference as mountMain } from './main/app';
import { RaikanChatbot } from '../components/chatbot/RaikanChatbot';

export function ReferenceDesign({ design }: { design: 1 | 4 }) {
  useEffect(() => design === 1 ? mountCurrent() : mountMain(), [design]);
  const openQuote = (service?: string) => {
    const card = document.getElementById('hero-quote-card');
    const dialog = document.getElementById('quote') as HTMLDialogElement | null;
    dialog?.close();
    if (!card) return;
    card.querySelector<HTMLButtonElement>('[data-hero-reset]')?.click();
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (service) {
      const value = service.includes('sell') ? 'sell' : /family|transfer/.test(service) ? 'transfer' : 'buy';
      if (design === 4) card.querySelector<HTMLButtonElement>('[data-hero-tab="1"]')?.click();
      card.querySelector<HTMLButtonElement>(`[data-hero-pill="${value}"]`)?.click();
      if (design === 4) card.querySelector<HTMLInputElement>(`input[name="heroServiceRadio"][value="${value}"]`)?.click();
    }
    card.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  };
  return <><div dangerouslySetInnerHTML={{ __html: design === 1 ? currentMarkup : mainMarkup }} />
    <RaikanChatbot onOpenQuote={openQuote} onNavigateHowItWorks={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} />
  </>;
}
