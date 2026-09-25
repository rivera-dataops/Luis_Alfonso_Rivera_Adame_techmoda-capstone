import { useState } from 'react';
import { ShoppingCart, Package, ImageOff } from 'lucide-react';
import type { Product } from '../lib/types';

interface ProductCardProps {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (productId: string) => void;
  isAdmin?: boolean;
  onAdd?: (product: Product) => void;
  onView?: (product: Product) => void;
}

export function ProductCard({ product, onEdit, onDelete, isAdmin, onAdd, onView }: ProductCardProps) {
  const [failedSource, setFailedSource] = useState('');
  return (
    <article className="product-card group">
      <div className="product-image-wrap">
        {(!product.imageUrl || failedSource === product.imageUrl) ? <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400"><ImageOff size={32} /><span className="text-sm">Imagen no disponible</span></div> : <img
          src={product.imageUrl}
          alt={product.altText || product.aiAltText || product.name}
          className="product-image"
          loading="lazy"
          onError={() => setFailedSource(product.imageUrl)}
        />}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-slate-950">
            {product.name}
          </h3>
          <span className="category-pill">
            {product.category}
          </span>
        </div>
        <p className="mb-5 line-clamp-2 text-sm leading-6 text-slate-500">
          {product.description}
        </p>
        <div className="mt-auto flex items-center justify-between mb-4">
          <span className="text-2xl font-semibold tracking-tight text-slate-950">
            ${product.price.toFixed(2)}
          </span>
          <div className="flex items-center gap-1 text-xs font-medium text-slate-400">
            <Package className="w-4 h-4" />
            <span>{product.stock} disponibles</span>
          </div>
        </div>
        {isAdmin ? (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit?.(product)}
              className="btn-primary flex-1"
            >
              Editar
            </button>
            <button
              onClick={() => onDelete?.(product.productId)}
              className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-700"
            >
              Eliminar
            </button>
          </div>
        ) : (
          <div className="space-y-2">
          {onView && <button className="btn-secondary w-full" onClick={() => onView(product)}>Ver detalles</button>}
          <button
            onClick={() => onAdd?.(product)}
            disabled={product.stock <= 0}
            className={`btn-primary w-full ${
              product.stock === 0
                ? 'bg-slate-200 text-slate-500 hover:bg-slate-200'
                : ''
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            {product.stock === 0 ? 'Agotado' : 'Agregar al Carrito'}
          </button>
          </div>
        )}
      </div>
    </article>
  );
}
