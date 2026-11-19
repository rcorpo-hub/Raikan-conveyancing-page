import { useEffect, useRef, useState } from 'react';
import { X, Send, MessageCircle, ArrowRight, RotateCcw, Phone, ChevronDown } from 'lucide-react';
import { generateBotResponse, INITIAL_SUGGESTIONS, type ChatAction, type MessageContext } from './knowledgeEngine';
import { MessageContent } from './MessageContent';

interface ChatMessage { id: string; sender: 'user' | 'assistant'; text: string; actions?: ChatAction[]; suggestedFollowups?: string[]; }
interface RaikanChatbotProps {
  onOpenQuote?: (service?: string) => void;
  onNavigateHowItWorks?: () => void;
  onOpenVoi?: () => void;
}
const welcome = (): ChatMessage => ({
  id: 'welcome', sender: 'assistant',
  text: '**Welcome to Raikan.**\n\nI’m an automated guide to the information on this site—not a live adviser. Ask about the process, fees or services. Please keep personal and document details out of the chat.',
  suggestedFollowups: INITIAL_SUGGESTIONS,
});

export function RaikanChatbot({ onOpenQuote, onNavigateHowItWorks, onOpenVoi }: RaikanChatbotProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([welcome()]);
  const context = useRef<MessageContext>({});
  const dialog = useRef<HTMLDialogElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const latestReply = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);

  function openChat() {
    trigger.current = document.activeElement as HTMLElement;
    setOpen(true);
  }
  function closeChat(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
  }
  useEffect(() => {
    const listener = () => openChat();
    window.addEventListener('raikan:open-help', listener);
    return () => window.removeEventListener('raikan:open-help', listener);
  }, []);
  useEffect(() => {
    if (!dialog.current) return;
    if (open) {
      dialog.current.showModal();
      dialog.current.querySelector<HTMLElement>('#chat-title')?.focus();
    } else if (dialog.current.open) dialog.current.close();
  }, [open]);
  useEffect(() => {
    if (open && latestReply.current && log.current) {
      // Start reading at the reply heading, not below its action buttons.
      log.current.scrollTo({ top: latestReply.current.offsetTop - log.current.offsetTop - 12, behavior: 'smooth' });
    }
  }, [messages, open]);

  function send(text = input) {
    const question = text.trim().slice(0, 600);
    if (!question) return;
    const response = generateBotResponse(question, context.current);
    setMessages(previous => [...previous, { id: crypto.randomUUID(), sender: 'user', text: question },
      { id: crypto.randomUUID(), sender: 'assistant', ...response }]);
    setInput('');
  }
  function handleSuggestionClick(text: string) {
    if (/get\s*your\s*quote|instant\s*quote|^quote\b/i.test(text)) {
      const question = text.trim();
      const response = generateBotResponse(question, context.current);
      setMessages(previous => [
        ...previous,
        { id: crypto.randomUUID(), sender: 'user', text: question },
        { id: crypto.randomUUID(), sender: 'assistant', ...response },
      ]);
      closeChat(false);
      requestAnimationFrame(() => {
        onOpenQuote?.(context.current.serviceCategory || 'buying');
      });
      return;
    }
    send(text);
  }
  function actionClick(action: ChatAction) {
    closeChat(false);
    requestAnimationFrame(() => {
      if (action.actionType === 'open-quote') onOpenQuote?.(action.payload);
      if (action.actionType === 'open-page') onNavigateHowItWorks?.();
      if (action.actionType === 'open-voi') onOpenVoi?.();
      if (action.actionType === 'call') window.location.href = 'tel:' + (action.payload || '0870769899');
    });
  }

  return <>
    {!open && <button className="chat-launcher" type="button" onClick={openChat} aria-label="Open Raikan help" aria-haspopup="dialog">
      <MessageCircle size={22} aria-hidden="true" /><span>Need help?</span>
    </button>}
    <dialog ref={dialog} className="chat-window" aria-labelledby="chat-title" aria-describedby="chat-description"
      onCancel={event => { event.preventDefault(); closeChat(); }}
      onClick={event => { if (event.target === dialog.current) closeChat(); }}>
      <header className="chat-header">
        <div><h2 id="chat-title" tabIndex={-1}>Raikan guide</h2><p id="chat-description">Automated help · No live adviser</p></div>
        <div className="chat-header-actions">
          <button type="button" onClick={() => { setMessages([welcome()]); context.current = {}; setInput(''); }} aria-label="Start a new conversation" title="Start over"><RotateCcw size={18} /></button>
          <button type="button" onClick={() => closeChat()} aria-label="Minimise chat" title="Minimise"><ChevronDown size={21} /></button>
          <button type="button" onClick={() => closeChat()} aria-label="Close chat"><X size={21} /></button>
        </div>
      </header>
      <div className="chat-messages" ref={log} role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation">
        {messages.map((message, index) => <div key={message.id} className={'chat-message ' + message.sender}
          ref={message.sender === 'assistant' && index === messages.length - 1 ? latestReply : undefined}>
          <span className="chat-speaker">{message.sender === 'assistant' ? 'Raikan guide' : 'You'}</span>
          <div className="chat-bubble">{message.sender === 'assistant' ? <MessageContent text={message.text} /> : <p>{message.text}</p>}</div>
          {message.sender === 'assistant' && index === messages.length - 1 && <>
            {!!message.actions?.length && <div className="chat-actions">{message.actions.map(action =>
              action.actionType === 'call'
                ? <a key={action.label} href={'tel:' + (action.payload || '0870769899')}><Phone size={15} />{action.label}</a>
                : <button type="button" key={action.label} onClick={() => actionClick(action)}>{action.label}<ArrowRight size={15} /></button>
            )}</div>}
            {!!message.suggestedFollowups?.length && <div className="chat-suggestions" aria-label="Suggested questions">{message.suggestedFollowups.map(text =>
              <button type="button" key={text} onClick={() => handleSuggestionClick(text)}>{text}</button>
            )}</div>}
          </>}
        </div>)}
      </div>
      <form className="chat-composer" onSubmit={event => { event.preventDefault(); send(); }}>
        <label className="sr-only" htmlFor="chat-question">Your question</label>
        <input id="chat-question" value={input} onChange={event => setInput(event.target.value)} maxLength={600}
          placeholder="Ask about fees, services or the process" autoComplete="off" />
        <button type="submit" disabled={!input.trim()} aria-label="Send message"><Send size={19} /></button>
      </form>
      <p className="chat-disclaimer">General website information, not legal advice.<br />Conversation resets when you reload this page.</p>
    </dialog>
  </>;
}
