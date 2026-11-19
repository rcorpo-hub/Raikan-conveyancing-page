import { useEffect } from 'react';
import markup from './reference/markup.html?raw';
import { mountReference } from './reference/app';
import { RaikanChatbot } from './components/chatbot/RaikanChatbot';

export function App() {
  useEffect(() => mountReference(), []);

  const handleOpenQuote = (service?: string) => {
    const heroCard = document.getElementById('hero-quote-card');
    if (heroCard) {
      const oldDialog = document.getElementById('quote') as HTMLDialogElement | null;
      if (oldDialog && oldDialog.open) {
        oldDialog.close();
      }
      heroCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      heroCard.classList.remove('hero-card-pulse');
      void heroCard.offsetWidth;
      heroCard.classList.add('hero-card-pulse');

      if (service) {
        const mappedService = service.includes('sell') ? 'sell' : (service.includes('transfer') || service.includes('family')) ? 'transfer' : 'buy';
        const pill = heroCard.querySelector<HTMLButtonElement>(`[data-hero-pill="${mappedService}"]`);
        if (pill && !pill.classList.contains('active')) {
          pill.click();
        }
      }

      const nextField = heroCard.querySelector<HTMLInputElement | HTMLButtonElement>(
        'input[name="propertyValue"], input[name="name"], input[type="radio"]:checked, input, button[type="submit"]'
      );
      if (nextField) {
        setTimeout(() => nextField.focus({ preventScroll: true }), 350);
      }
    }
  };

  const handleNavigateHowItWorks = () => {
    const processEl = document.getElementById('process') || document.querySelector('.process') || document.getElementById('how-it-works');
    if (processEl) {
      processEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: markup }} />
      <RaikanChatbot
        onOpenQuote={handleOpenQuote}
        onNavigateHowItWorks={handleNavigateHowItWorks}
      />
    </>
  );
}

export default App;
