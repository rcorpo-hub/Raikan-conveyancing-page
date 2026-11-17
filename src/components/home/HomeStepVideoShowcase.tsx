import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    title: 'Tell us what you need',
    description: 'Start with a few details about your property and the help you need.',
    points: ['Choose buying, selling or a family transfer.', 'Review the starting professional fee and discuss any additional costs.', 'Contact the team to confirm your quote and next steps.'],
  },
  {
    title: 'We get things moving',
    description: 'Your conveyancer reviews the documents and explains what needs to happen.',
    points: ['Review contract terms, special conditions and Form 1 disclosure.', 'Arrange the relevant title, council and water searches.', 'Help you track key contract and finance dates.'],
  },
  {
    title: 'Stay informed along the way',
    description: 'Know where your transaction stands and what comes next.',
    points: ['Receive updates and ask questions by phone or email.', 'We coordinate with your bank, broker and the other parties.', 'Review settlement figures, including rate adjustments.'],
  },
  {
    title: 'Ready for settlement',
    description: 'We coordinate the final steps and confirm when settlement is complete.',
    points: ['Arrange the required documents and electronic settlement.', 'Coordinate funds and title registration.', 'Confirm completion and the arrangements for keys, where applicable.'],
  },
];

export function HomeStepVideoShowcase({ onOpenQuote }: { onOpenQuote: (service?: string) => void }) {
  const [index, setIndex] = useState(0);
  const [hoverSide, setHoverSide] = useState<'left' | 'right' | null>(null);
  const touchStart = useRef<number | null>(null);
  const move = (direction: number) => setIndex(current => (current + direction + STEPS.length) % STEPS.length);

  return <section id="how-it-works" className="process-showcase" aria-labelledby="how-title">
    <div className="landing-container">
      <div className="process-heading">
        <p className="eyebrow">From first enquiry to settlement</p>
        <h2 id="how-title">How it works</h2>
        <p>Your property journey, explained in four simple slides.</p>
      </div>
      <div className="process-player process-hover-navigation" role="region" aria-roledescription="carousel"
        aria-label="Conveyancing process" aria-describedby="slide-navigation-help" tabIndex={0}
        onPointerMove={event => {
          if (event.pointerType === 'touch') return;
          const bounds = event.currentTarget.getBoundingClientRect();
          setHoverSide(event.clientX - bounds.left < bounds.width / 2 ? 'left' : 'right');
        }}
        onPointerLeave={() => setHoverSide(null)}
        onPointerDown={event => {
          if (event.pointerType === 'touch' && !(event.target as HTMLElement).closest('button')) touchStart.current = event.clientX;
        }}
        onPointerUp={event => {
          if (event.pointerType !== 'touch' || touchStart.current === null) return;
          const distance = event.clientX - touchStart.current;
          touchStart.current = null;
          if (Math.abs(distance) > 45) move(distance < 0 ? 1 : -1);
        }}
        onPointerCancel={() => { touchStart.current = null; }}
        onKeyDown={event => {
          if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
          if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
          if (event.key === 'Home') { event.preventDefault(); setIndex(0); }
          if (event.key === 'End') { event.preventDefault(); setIndex(STEPS.length - 1); }
        }}>
        <p id="slide-navigation-help" className="sr-only">Hover on the left or right to reveal slide navigation. Use the arrow keys or swipe on a touch screen. Slides advance only when you choose.</p>
        <div className="process-slide-viewport" aria-live="polite" aria-atomic="true">
          <div className="process-slide-track" style={{ transform: 'translateX(-' + index * 100 + '%)' }}>
            {STEPS.map((step, stepIndex) => <div key={step.title} className="process-slide" role="group"
              aria-roledescription="slide" aria-label={(stepIndex + 1) + ' of ' + STEPS.length} aria-hidden={stepIndex !== index}>
              <div className="process-slide-copy">
                <p className="eyebrow">Step 0{stepIndex + 1} <span>/ 04</span></p>
                <h3>{step.title}</h3>
                <p className="process-description">{step.description}</p>
                <ul>{step.points.map(point => <li key={point}><Check size={18} aria-hidden="true" /><span>{point}</span></li>)}</ul>
              </div>
            </div>)}
          </div>
        </div>
        <button type="button" className={'slide-edge previous' + (hoverSide === 'left' ? ' revealed' : '')}
          aria-label="Previous slide" onClick={() => move(-1)}><ChevronLeft size={24} aria-hidden="true" /><span>Previous</span></button>
        <button type="button" className={'slide-edge next' + (hoverSide === 'right' ? ' revealed' : '')}
          aria-label="Next slide" onClick={() => move(1)}><ChevronRight size={24} aria-hidden="true" /><span>Next</span></button>
      </div>
      <div className="process-quote-cta"><button type="button" className="gold-button" onClick={() => onOpenQuote('buying')}>Start with a quote <ArrowRight size={17} /></button></div>
    </div>
  </section>;
}
