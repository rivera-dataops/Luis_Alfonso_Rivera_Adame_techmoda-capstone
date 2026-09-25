import { useRef, useState } from 'react';
import { Bot, ChevronDown, Loader2, Send, Sparkles } from 'lucide-react';
import { ai, errorMessage } from '../lib/ai';
import type { ChatTurn, SearchHit } from '../lib/ai';
import type { Product } from '../lib/types';

export function ShoppingAssistant({ products, onProduct }: { products: Product[]; onProduct: (product: Product) => void }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [retrieved, setRetrieved] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const send = async () => {
    const text = message.trim();
    if (!text || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const response = await ai.chat(text, turns);
      if (!response.reply) throw new Error('El asistente no devolvió una respuesta. Intenta de nuevo.');
      setTurns(previous => [...previous, { role: 'user', text }, { role: 'assistant', text: response.reply }]);
      setRetrieved(response.blocked ? [] : response.retrieved || []); setMessage('');
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); lock.current = false; }
  };
  return <section className="mb-7 overflow-hidden rounded-2xl border border-blue-100 bg-white">
    <button className="flex w-full items-center gap-3 p-5 text-left" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="shopping-chat">
      <span className="rounded-xl bg-blue-50 p-3 text-blue-700"><Bot size={22} /></span>
      <span className="flex-1"><span className="block font-semibold">Tu asistente de compras</span><span className="block text-sm text-slate-500">Cuéntame qué buscas y te ayudo a elegir.</span></span>
      <ChevronDown className={open ? 'rotate-180' : ''} size={20} />
    </button>
    {open && <div id="shopping-chat" className="border-t border-slate-100 p-5">
      {turns.length === 0 && <div className="mb-4 flex flex-wrap gap-2">{['Algo cómodo para caminar', 'Un regalo por menos de $100', 'Ropa para una ocasión especial'].map(example =>
        <button className="badge hover:bg-blue-100" key={example} onClick={() => setMessage(example)}><Sparkles size={13} />{example}</button>
      )}</div>}
      <div className="chat-history" role="log" aria-label="Conversación con el asistente" aria-live="polite">
        {turns.map((turn, index) => <div key={index} className={'chat-bubble ' + (turn.role === 'user' ? 'chat-user' : '')}><p className="mb-1 text-xs font-semibold">{turn.role === 'user' ? 'Tú' : 'TechModa'}</p><p className="whitespace-pre-wrap">{turn.text}</p></div>)}
      </div>
      {retrieved.length > 0 && <div className="mb-4 flex flex-wrap gap-2">{retrieved.map(hit => {
        const product = products.find(item => item.productId === hit.productId);
        return product ? <button className="badge hover:bg-blue-100" key={hit.productId} onClick={() => onProduct(product)}>Ver {product.name}</button> : null;
      })}</div>}
      <form onSubmit={event => { event.preventDefault(); void send(); }} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="chat-input" className="sr-only">Pregunta al asistente</label>
        <input id="chat-input" className="field flex-1" value={message} onChange={event => setMessage(event.target.value)} maxLength={1500} placeholder="Busco algo cómodo y blanco para caminar…" disabled={busy} />
        <button className="btn-primary" disabled={!message.trim() || busy}>{busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} {busy ? 'Consultando…' : 'Preguntar'}</button>
      </form>
      {error && <p role="alert" className="error-box mt-3">{error}</p>}
      <p className="mt-3 text-xs text-slate-400">Respuestas generadas por IA a partir del catálogo. Verifica los detalles del producto.</p>
    </div>}
  </section>;
}
