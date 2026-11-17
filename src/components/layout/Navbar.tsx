import React, { useState } from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';
import { siteConfig } from '../../data/site.config';

interface NavbarProps {
  activePage?: 'home' | 'how-it-works';
  onNavigate?: (page: 'home' | 'how-it-works') => void;
  onOpenQuote?: (service?: string) => void;
  onOpenContact?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      e.preventDefault();
      setMobileMenuOpen(false);
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-xs font-sans">
      
      {/* 1. TOP WHITE BAR (Identical to rcorpo.com) */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        
        {/* Raikan Corporation Logo -> Redirects to rcorpo.com */}
        <a 
          href="https://rcorpo.com/" 
          className="flex items-center shrink-0 group"
          aria-label="Raikan Corporation"
        >
          <img 
            src="/assets/raikan-logo.png" 
            alt="Raikan Corporation" 
            className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-102"
          />
        </a>

        {/* 3 Contact Info Blocks (Official icons downloaded from rcorpo.com) */}
        <div className="hidden md:flex items-center gap-8 lg:gap-12">
          
          {/* 1. Call Us */}
          <a 
            href={'tel:' + siteConfig.phoneRaw} 
            className="flex items-center gap-3 text-slate-800 hover:text-[#0099ff] transition-colors group"
          >
            <img 
              src="/assets/rcorpo-icon-call.png" 
              alt="Call us" 
              className="w-9 h-10 object-contain shrink-0" 
            />
            <div className="text-left">
              <span className="block text-sm font-bold text-slate-800 group-hover:text-[#0099ff] transition-colors leading-tight">
                Call us
              </span>
              <span className="block text-xs text-slate-500 font-medium leading-tight mt-0.5">
                {siteConfig.phone}
              </span>
            </div>
          </a>

          {/* 2. Mail Us */}
          <a 
            href={'mailto:' + siteConfig.email} 
            className="flex items-center gap-3 text-slate-800 hover:text-[#0099ff] transition-colors group"
          >
            <img 
              src="/assets/rcorpo-icon-mail.png" 
              alt="Mail Us" 
              className="w-9 h-10 object-contain shrink-0" 
            />
            <div className="text-left">
              <span className="block text-sm font-bold text-slate-800 group-hover:text-[#0099ff] transition-colors leading-tight">
                Mail Us
              </span>
              <span className="block text-xs text-slate-500 font-medium leading-tight mt-0.5">
                {siteConfig.email}
              </span>
            </div>
          </a>

          {/* 3. Location */}
          <a 
            href="https://rcorpo.com/#contact" 
            className="flex items-center gap-3 text-slate-800 hover:text-[#0099ff] transition-colors group"
          >
            <img 
              src="/assets/rcorpo-icon-loc.png" 
              alt="Location" 
              className="w-9 h-10 object-contain shrink-0" 
            />
            <div className="text-left">
              <span className="block text-sm font-bold text-slate-800 group-hover:text-[#0099ff] transition-colors leading-tight">
                Location
              </span>
              <span className="block text-xs text-slate-500 font-medium leading-tight mt-0.5">
                Adelaide | Brisbane | Perth
              </span>
            </div>
          </a>

        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          className="md:hidden p-2 text-slate-700 hover:text-slate-900 rounded-lg focus:outline-hidden"
          aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
        >
          {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>

      </div>

      {/* 2. BOTTOM VIBRANT BLUE-TO-PURPLE GRADIENT BAND (Exact rcorpo.com replica) */}
      <div 
        className="w-full text-white shadow-md"
        style={{
          background: 'linear-gradient(90deg, #1ba2f8 0%, #3e84fc 25%, #6366f1 65%, #9243f2 100%)'
        }}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-[52px]">
          
          {/* Main Desktop Links */}
          <nav className="hidden md:flex items-center h-full gap-0" aria-label="Main Corporate Navigation">
            
            {/* Home - Active with white underline indicator */}
            <a 
              href="https://rcorpo.com/" 
              className="inline-flex items-center h-full px-5 text-[15px] font-semibold text-white border-b-[3px] border-white transition-colors hover:bg-white/10"
            >
              Home
            </a>

            {/* Services -> Redirects to rcorpo.com/#services */}
            <a 
              href="https://rcorpo.com/#services" 
              className="inline-flex items-center h-full px-5 text-[15px] font-semibold text-white/95 hover:text-white transition-colors hover:bg-white/10"
            >
              Services
            </a>

            {/* Forms -> Redirects to rcorpo.com/#forms */}
            <a 
              href="https://rcorpo.com/#forms" 
              className="inline-flex items-center h-full px-5 text-[15px] font-semibold text-white/95 hover:text-white transition-colors hover:bg-white/10"
            >
              Forms
            </a>

            {/* How it works -> Smooth scroll to conveyancing process */}
            <a 
              href="#how-it-works" 
              onClick={(e) => handleSmoothScroll(e, 'how-it-works')}
              className="inline-flex items-center h-full px-5 text-[15px] font-semibold text-white/95 hover:text-white transition-colors hover:bg-white/10"
            >
              How it works
            </a>

            {/* Information -> Redirects to rcorpo.com/#information */}
            <a 
              href="https://rcorpo.com/#information" 
              className="inline-flex items-center h-full px-5 text-[15px] font-semibold text-white/95 hover:text-white transition-colors hover:bg-white/10"
            >
              Information
            </a>

            {/* Contact Us -> Redirects to rcorpo.com/#contact */}
            <a 
              href="https://rcorpo.com/#contact" 
              className="inline-flex items-center h-full px-5 text-[15px] font-semibold text-white/95 hover:text-white transition-colors hover:bg-white/10"
            >
              Contact Us
            </a>

          </nav>

          {/* Right Action: Appointment > (Redirects to rcorpo.com/appointment/) */}
          <div className="flex items-center justify-between w-full md:w-auto h-full">
            <span className="md:hidden text-xs font-bold tracking-wider uppercase text-white/90">
              Raikan Corporation
            </span>

            <a 
              href="https://rcorpo.com/appointment/" 
              className="inline-flex items-center gap-1.5 h-full px-4 text-[15px] font-bold text-white hover:text-white transition-all hover:bg-white/15 ml-auto group"
            >
              <span>Appointment</span>
              <ChevronRight size={17} className="transition-transform group-hover:translate-x-1" />
            </a>
          </div>

        </div>
      </div>

      {/* 3. MOBILE SLIDE-OUT MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 shadow-xl px-4 py-3 space-y-2 animate-fade-in">
          <a 
            href="https://rcorpo.com/" 
            className="block py-2.5 px-3 rounded-lg text-sm font-bold text-brand-blue bg-slate-50"
          >
            Home
          </a>
          <a 
            href="https://rcorpo.com/#services" 
            className="block py-2.5 px-3 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Services
          </a>
          <a 
            href="https://rcorpo.com/#forms" 
            className="block py-2.5 px-3 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Forms
          </a>
          <a 
            href="#how-it-works" 
            onClick={(e) => handleSmoothScroll(e, 'how-it-works')}
            className="block py-2.5 px-3 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            How it works
          </a>
          <a 
            href="https://rcorpo.com/#information" 
            className="block py-2.5 px-3 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Information
          </a>
          <a 
            href="https://rcorpo.com/#contact" 
            className="block py-2.5 px-3 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Contact Us
          </a>
          <div className="pt-2 border-t border-slate-100">
            <a 
              href="https://rcorpo.com/appointment/" 
              className="block w-full py-2.5 text-center text-sm font-bold text-white rounded-lg shadow-xs"
              style={{
                background: 'linear-gradient(90deg, #1ba2f8 0%, #9243f2 100%)'
              }}
            >
              Book an Appointment
            </a>
          </div>
        </div>
      )}

    </header>
  );
};
export default Navbar;
