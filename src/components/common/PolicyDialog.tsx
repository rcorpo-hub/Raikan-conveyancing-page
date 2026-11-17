import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export function PolicyDialog({ type, onClose }: { type: 'privacy' | 'terms' | null; onClose: () => void }) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (type) element.showModal();
    else if (element.open) element.close();
  }, [type]);
  return <dialog ref={dialog} className="policy-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <button type="button" className="policy-close" onClick={onClose} aria-label="Close information"><X size={22} /></button>
    <h2 id={titleId}>{type === 'privacy' ? 'Privacy in this preview' : 'Before you engage the team'}</h2>
    {type === 'privacy' ? <>
      <p><strong>Enquiry form:</strong> the details you enter stay in this page’s memory. Preparing an enquiry does not send it to Raikan or store a draft on this device.</p>
      <p>If you choose “Open email draft”, your email application receives the details you entered. You can review them before sending. Your email provider’s privacy settings then apply.</p>
      <p><strong>Automated guide:</strong> messages stay in this page’s memory and reset on reload. Do not enter identity documents, banking information or private contract details.</p>
      <p>To ask about the company’s privacy practices or a secure way to share documents, email <a href="mailto:info@rcorpo.com">info@rcorpo.com</a> or call <a href="tel:0870769899">08 7076 9899</a>.</p>
    </> : <>
      <p>The figures on this site are indicative. Ask the team for a written quote that confirms your service, the work included and additional charges.</p>
      <p>Preparing an enquiry does not appoint a conveyancer or accept a quote. Confirm the engagement terms with the team before proceeding.</p>
      <p>Do not rely on this preview to determine legal deadlines, government charges or eligibility for concessions. The team needs to review your circumstances.</p>
    </>}
    <button type="button" className="gold-button" onClick={onClose}>Close</button>
  </dialog>;
}
