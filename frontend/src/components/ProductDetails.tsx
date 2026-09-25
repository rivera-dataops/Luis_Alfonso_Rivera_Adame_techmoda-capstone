import { Languages, Volume2 } from 'lucide-react';
import type { Product } from '../lib/types';
import { ai } from '../lib/ai';
import { AiAction } from './AiAction';
import { ModalShell } from './ModalShell';

export function ProductDetails({ product, onClose, onAdd }: { product: Product; onClose: () => void; onAdd: (product: Product) => void }) {
  return <ModalShell title={product.name} onClose={onClose}>
    <div className="grid gap-6 sm:grid-cols-2">
      <img src={product.imageUrl} alt={product.altText || product.aiAltText || product.name} className="aspect-square w-full rounded-2xl bg-slate-50 object-contain" />
      <div><span className="badge">{product.category}</span><p className="my-4 leading-relaxed text-slate-600">{product.description}</p><p className="text-3xl font-bold">${product.price.toFixed(2)}</p><p className="my-3 text-sm text-slate-500">{product.stock} disponibles</p>
        <button className="btn-primary w-full" disabled={product.stock <= 0} onClick={() => onAdd(product)}>{product.stock <= 0 ? 'Agotado' : 'Agregar al Carrito'}</button>
      </div>
    </div>
    {product.productId.startsWith('demo-') ? <p className="mt-6 text-sm text-slate-500">Producto de muestra. Las funciones de audio y traducción están disponibles en los productos del catálogo real.</p> : <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <AiAction title="Escuchar descripción" description="Escucha este producto en español." icon={<Volume2 size={18} />} action={() => ai.product('VITE_VOICE_URL', product.productId, 'voice', { lang: 'es' })} />
      <AiAction title="Read in English" description="Consulta la descripción en inglés." icon={<Languages size={18} />} action={() => ai.product('VITE_TRANSLATE_URL', product.productId, 'translate', { target: 'en' })} />
    </div>}
  </ModalShell>;
}
