import React from 'react';
import { ArrowRight, Phone } from 'lucide-react';
import { siteConfig } from '../../data/site.config';

interface HomeFinalCtaProps {
  onOpenQuote: (service?: string) => void;
}

export const HomeFinalCta: React.FC<HomeFinalCtaProps> = ({ onOpenQuote }) => {
  return (
    <section className="py-16 md:py-24 bg-slate-900 text-white relative overflow-hidden">
      {/* Subtle ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-cyan/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        
        <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan bg-brand-cyan/15 px-3 py-1.5 rounded-full border border-brand-cyan/30 inline-block">
          Get Started Online
        </span>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white font-serif">
          Planning Your Next Property Move?
        </h2>

        <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Tell us a little about your property transaction. Our team will help you understand the next steps.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
          <button
            type="button"
            onClick={() => onOpenQuote('buying')}
            className="bg-[#f6b936] hover:bg-[#ffd16a] text-slate-950 font-bold px-8 py-4 rounded-xl text-sm sm:text-base shadow-lg transition-all hover:scale-102 active:scale-98 cursor-pointer flex items-center gap-2"
          >
            <span>Request a Quote</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href={`tel:${siteConfig.phoneRaw}`}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold px-7 py-4 rounded-xl text-sm sm:text-base border border-white/20 transition-all flex items-center gap-2"
          >
            <Phone className="w-4 h-4 text-brand-cyan" />
            <span>Talk to Our Team ({siteConfig.phone})</span>
          </a>
        </div>

        {/* Micro-Reassurance */}
        <div className="pt-6 text-xs text-slate-400">
          <span>Adelaide Broadview Office · Fixed Professional Fees · PEXA Electronic Settlement</span>
        </div>

      </div>
    </section>
  );
};
