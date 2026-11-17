import React, { useState } from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import { siteConfig } from '../../data/site.config';
import { PolicyDialog } from '../common/PolicyDialog';

interface FooterProps {
  onNavigate?: (page: 'home' | 'how-it-works') => void;
  onOpenQuote?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenQuote }) => {
  const [activeModal, setActiveModal] = useState<'privacy' | 'terms' | null>(null);

  return (
    <footer id="contact" className="bg-slate-950 text-slate-400 py-14 border-t border-slate-900 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Top Footer Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-900">
          
          {/* Logo & Bio */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-3">
              <img 
                src="/assets/raikan-logo.png" 
                alt="Raikan Corporation" 
                className="h-10 w-auto object-contain bg-white/90 p-1 rounded-lg"
              />
              <span className="font-serif font-bold text-base text-white tracking-tight">
                Raikan Corporation Conveyancing
              </span>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              Specialist fixed-fee conveyancing services for residential buyers, sellers, and property transfers across Adelaide and South Australia.
            </p>

            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="w-4 h-4 text-brand-cyan shrink-0" />
              <span>Office area: {siteConfig.officeLocation}, Australia. Call to confirm appointment details.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">
              Navigation
            </h4>
            <ul className="space-y-2">
              {onNavigate && (
                <>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('home')}
                      className="hover:text-brand-cyan transition-colors cursor-pointer text-slate-400 text-left"
                    >
                      Home
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={() => onNavigate('how-it-works')}
                      className="hover:text-brand-cyan transition-colors cursor-pointer text-slate-400 text-left"
                    >
                      How It Works
                    </button>
                  </li>

                </>
              )}
              {onOpenQuote && (
                <li>
                  <button
                    type="button"
                    onClick={onOpenQuote}
                    className="hover:text-brand-cyan transition-colors cursor-pointer text-slate-400 text-left"
                  >
                    Get a Quote
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Contact Details */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-xs">
              Direct Contact
            </h4>
            <div className="space-y-2">
              <a 
                href={`tel:${siteConfig.phoneRaw}`} 
                className="flex items-center gap-2 text-white hover:text-brand-cyan transition-colors font-semibold"
              >
                <Phone className="w-3.5 h-3.5 text-brand-cyan" />
                <span>{siteConfig.phone}</span>
              </a>

              <a 
                href={`mailto:${siteConfig.email}`} 
                className="flex items-center gap-2 text-slate-300 hover:text-brand-cyan transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-brand-cyan" />
                <span>{siteConfig.email}</span>
              </a>
            </div>

            <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
              Mon – Fri: 9:00 am – 5:00 pm ACST
            </p>
          </div>

        </div>

        {/* Legal Disclaimer */}
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
          <p>
            General website information only, not legal or financial advice. Ask the team to confirm your circumstances, service scope, fees and engagement terms before proceeding. This preview does not send enquiries automatically.
          </p>
        </div>

        {/* Bottom Bar: Copyright & Policies */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[11px]">
          <p>© {new Date().getFullYear()} {siteConfig.businessName}. All rights reserved.</p>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveModal('privacy')}
              className="hover:text-brand-cyan transition-colors underline cursor-pointer"
            >
              Privacy information
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('terms')}
              className="hover:text-brand-cyan transition-colors underline cursor-pointer"
            >
              Before you engage
            </button>
          </div>
        </div>

      </div>

      <PolicyDialog type={activeModal} onClose={() => setActiveModal(null)} />
    </footer>
  );
};
