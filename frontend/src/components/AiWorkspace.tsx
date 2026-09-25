import { useState } from 'react';
import { Database, Languages, ShieldCheck, Sparkles, Tags, Volume2, MessageSquare } from 'lucide-react';
import type { Product } from '../lib/types';
import { ai } from '../lib/ai';
import { api } from '../lib/api';
import { AiAction } from './AiAction';

export function AiWorkspace({ products, onChanged }: { products: Product[]; onChanged?: () => Promise<void> }) {
  const [selectedId, setSelectedId] = useState('');
  const [text, setText] = useState('');
  const selected = products.find(product => product.productId === selectedId) || products[0];
  const id = selected?.productId || '';
  return <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-7" aria-label="Herramientas de administración">
    <p className="eyebrow">GESTIÓN DEL CATÁLOGO</p>
    <h2 className="mt-2 text-2xl font-bold">Centro IA TechModa</h2>
    <p className="mb-6 mt-2 text-sm text-slate-500">Prepara tus productos y revisa cada resultado antes de publicarlo.</p>
    <label htmlFor="ai-product" className="mb-2 block text-sm font-medium">Producto que quieres mejorar</label>
    <select id="ai-product" className="field mb-5" value={id} onChange={event => setSelectedId(event.target.value)}>
      {!products.length && <option value="">Agrega un producto para comenzar</option>}
      {products.map(product => <option key={product.productId} value={product.productId}>{product.name}</option>)}
    </select>
    <div key={id} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <AiAction title="Etiquetar imagen" description="Detecta prendas y características de la foto." icon={<Tags size={18} />} disabled={!id}
        action={async () => { const result = await ai.product('VITE_ENRICH_LABELS_URL', id, 'labels'); await onChanged?.(); return result; }} />
      <AiAction title="Moderar imagen" description="Revisa la imagen y crea su texto accesible." icon={<ShieldCheck size={18} />} disabled={!id}
        action={async () => { const result = await ai.product('VITE_MODERATE_IMAGE_URL', id, 'moderate'); await onChanged?.(); return result; }} />
      <AiAction title="Traducir a inglés" description="Obtén el nombre y la descripción en inglés." icon={<Languages size={18} />} disabled={!id}
        action={() => ai.product('VITE_TRANSLATE_URL', id, 'translate', { target: 'en' })} />
      <AiAction title="Generar audio" description="Escucha el nombre y la descripción del producto." icon={<Volume2 size={18} />} disabled={!id}
        action={() => ai.product('VITE_VOICE_URL', id, 'voice', { lang: 'es' })} />
      <AiAction title="Generar descripción" description="Crea un borrador. Publicarlo será una acción aparte." icon={<Sparkles size={18} />} disabled={!id}
        action={() => ai.product('VITE_DESCRIBE_URL', id, 'describe', { tone: 'claro y cercano', save: false })}
        onPublish={async description => { await api.updateProduct(id, { description }); await onChanged?.(); }} />
      <AiAction title="Indexar catálogo" description="Actualiza la búsqueda inteligente después de editar productos." icon={<Database size={18} />} disabled={!products.length}
        action={() => ai.index()} />
    </div>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl bg-slate-50 p-5">
        <label htmlFor="review-text" className="mb-2 block font-semibold">Sentimiento de reseña</label>
        <textarea id="review-text" className="field min-h-28" value={text} onChange={event => setText(event.target.value)} maxLength={1000} placeholder="Pega aquí una reseña escrita por un cliente…" />
        <p className="mt-2 text-xs text-slate-500">El cliente escribe la reseña; el administrador usa esta herramienta para analizar su tono.</p>
      </div>
      <AiAction title="Analizar sentimiento" description="Consulta si una reseña es positiva, negativa, neutral o mixta." icon={<MessageSquare size={18} />} disabled={!text.trim()}
        action={() => ai.sentiment(text.trim())} />
    </div>
    <p className="mt-5 text-xs text-slate-500">Vista de demostración. El cambio de modo no sustituye una autenticación de administrador.</p>
  </section>;
}
