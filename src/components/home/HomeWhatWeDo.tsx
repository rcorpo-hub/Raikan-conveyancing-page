import React from 'react';
import { 
  ShoppingBag, 
  Home, 
  Users, 
  FileText, 
  Layers, 
  FileCheck2, 
  ArrowRight 
} from 'lucide-react';

interface HomeWhatWeDoProps {
  onOpenQuote: (service?: string) => void;
}

export const HomeWhatWeDo: React.FC<HomeWhatWeDoProps> = ({ onOpenQuote }) => {
  const services = [
    {
      id: 'buying',
      title: 'Buying a Property',
      desc: 'Understand your contract, property checks and important dates before moving towards settlement.',
      icon: ShoppingBag
    },
    {
      id: 'selling',
      title: 'Selling a Property',
      desc: 'Get help with seller disclosure documents, your lender and the paperwork needed to complete the sale.',
      icon: Home
    },
    {
      id: 'family-transfer',
      title: 'Family Property Transfers',
      desc: 'Discuss a change of ownership between family members and ask which documents and costs apply.',
      icon: Users
    },
    {
      id: 'contract-review',
      title: 'Contract and Pre-purchase Advice',
      desc: 'Ask the team to explain the contract and the seller’s disclosure statement before you sign.',
      icon: FileText
    },
    {
      id: 'land-division',
      title: 'Land Divisions',
      desc: 'Discuss the title paperwork and coordination needed when dividing or changing a property boundary.',
      icon: Layers
    },
    {
      id: 'private-contracts',
      title: 'Private Contract Preparation',
      desc: 'Selling without an agent? Ask about preparing the contract and arranging the steps towards settlement.',
      icon: FileCheck2
    }
  ];

  return (
    <section id="services" className="py-16 md:py-24 bg-slate-50/60 border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-12 text-center sm:text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-blue block mb-2">
            How we help
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-serif">
            Conveyancing for your next move
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Choose the help you need. The team will confirm the scope and costs for your property.
          </p>
        </div>

        {/* 6 Minimal Services Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.id}
                className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-slate-100 text-brand-blue flex items-center justify-center mb-5 group-hover:bg-brand-blue group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 font-serif group-hover:text-brand-blue transition-colors">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onOpenQuote(item.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:text-[#043e63] group-hover:translate-x-0.5 transition-all cursor-pointer"
                  >
                    <span>Request Quote</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
