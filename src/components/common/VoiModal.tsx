import React, { useEffect } from 'react';
import { X, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export interface VoiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiModal: React.FC<VoiModalProps> = ({ isOpen, onClose }) => {
  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories = [
    {
      id: 'cat1',
      name: 'Category 1 (Most Common - 85% of Clients)',
      desc: 'The quickest combination for Australian citizens holding an active passport.',
      items: [
        'Current Australian Passport (or expired within the past 2 years)',
        'Current Australian Driver Licence (or Photo Card / Proof of Age Card)'
      ],
      note: 'Names must match your contract exactly. If married or changed names, bring your official Marriage Certificate.'
    },
    {
      id: 'cat2',
      name: 'Category 2 (No Driver Licence)',
      desc: 'For Australian citizens who hold a passport but do not drive.',
      items: [
        'Current Australian Passport (or expired within 2 years)',
        'Full Australian Birth Certificate or Citizenship Certificate',
        'Current Medicare Card, Centrelink Card, or DVA Card'
      ],
      note: 'Commemorative birth certificates are not accepted by the Registrar-General.'
    },
    {
      id: 'cat3',
      name: 'Category 3 (No Passport)',
      desc: 'For Australian citizens without an active Australian passport.',
      items: [
        'Current Australian Driver Licence with photo',
        'Full Australian Birth Certificate or Citizenship Certificate',
        'Current Medicare Card or Centrelink Card'
      ],
      note: 'All documents must be original. Certified photocopies cannot be used for face-to-face VOI.'
    },
    {
      id: 'cat4',
      name: 'Category 4 (Foreign Citizens & Visas)',
      desc: 'For foreign passport holders living in Australia or abroad.',
      items: [
        'Current Foreign Passport',
        'Australian Visa confirmation or proof of legal entry',
        'Secondary Australian Photo ID (if residing in Australia)'
      ],
      note: 'Foreign documents not in English must include an official NAATI-accredited translation.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="voi-modal-title">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 w-full max-w-2xl border border-slate-100">
          
          {/* Header */}
          <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center text-brand-cyan">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg leading-tight" id="voi-modal-title">
                  Accepted Verification of Identity (VOI) Documents
                </h3>
                <p className="text-xs text-slate-300">
                  ARNECC National Verification Standards for South Australia
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
            
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Originals Mandatory:</strong> Under Australian Registrar regulations, all identity documents must be original physical copies. Laminated or certified photocopies are strictly prohibited.
              </span>
            </div>

            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <h4 className="font-bold text-sm text-slate-900 mb-1">
                    {cat.name}
                  </h4>
                  <p className="text-xs text-slate-500 mb-3">{cat.desc}</p>

                  <ul className="space-y-1.5 mb-2.5">
                    {cat.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-200/60">
                    ℹ️ {cat.note}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition-all"
              >
                Close Checklist
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
