import { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomeHero } from './components/home/HomeHero';
import { HomeWhatWeDo } from './components/home/HomeWhatWeDo';
import { HomeFinalCta } from './components/home/HomeFinalCta';
import { HomeStepVideoShowcase } from './components/home/HomeStepVideoShowcase';
import { RaikanChatbot } from './components/chatbot/RaikanChatbot';
import { VoiModal } from './components/common/VoiModal';

export function App() {
  const activePage = 'home' as const;
  const [quoteRequest, setQuoteRequest] = useState<{ service: string; price?: number; contactMethod?: string; revision: number }>();
  const [voiModalOpen, setVoiModalOpen] = useState(false);
  useEffect(() => {
    const scrollToHash = () => {
      const id = window.location.hash.slice(1);
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };
    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);
  const handleNavigate = (page: 'home' | 'how-it-works') => {
    window.location.hash = '#' + page;
    document.getElementById(page)?.scrollIntoView({ behavior: 'smooth' });
  };
  const handleOpenQuote = (service?: string, price?: number, contactMethod?: string) => {
    setQuoteRequest(previous => ({ service: service || 'buying', price, contactMethod, revision: (previous?.revision || 0) + 1 }));
    window.location.hash = '#instant-quote';
    requestAnimationFrame(() => {
      document.getElementById('instant-quote')?.scrollIntoView({ behavior: 'smooth' });
      document.getElementById('quote-form-title')?.focus({ preventScroll: true });
    });
  };
  return <div className="landing-site min-h-screen flex flex-col bg-white font-sans text-slate-800 antialiased">
    <Navbar activePage={activePage} onNavigate={handleNavigate} onOpenQuote={handleOpenQuote} />
    <main id="home" className="flex-1">
      <>
        <HomeHero quoteRequest={quoteRequest} onNavigateHowItWorks={() => handleNavigate('how-it-works')} />
        <HomeWhatWeDo onOpenQuote={handleOpenQuote} />
        <HomeStepVideoShowcase onOpenQuote={handleOpenQuote} />
        <HomeFinalCta onOpenQuote={handleOpenQuote} />
      </>
    </main>
    <Footer onNavigate={handleNavigate} onOpenQuote={() => handleOpenQuote()} />
    {activePage === 'home' && <div className="mobile-quote-bar">
      <a className="mobile-call" href="tel:0870769899">Call our team</a>
      <a className="gold-button" href="#instant-quote">Fee estimate</a>
      <button className="mobile-help-button" type="button" onClick={() => window.dispatchEvent(new Event("raikan:open-help"))}>Help</button>
    </div>}
    <RaikanChatbot onOpenQuote={handleOpenQuote} onNavigateHowItWorks={() => handleNavigate('how-it-works')} onOpenVoi={() => setVoiModalOpen(true)} />
    <VoiModal isOpen={voiModalOpen} onClose={() => setVoiModalOpen(false)} />
  </div>;
}
export default App;
