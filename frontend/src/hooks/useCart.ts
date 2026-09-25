import { useEffect, useState } from 'react';
import type { Product } from '../lib/types';

interface Entry { id: string; quantity: number }
const storageKey = 'techmoda-cart-v1';
export function useCart(products: Product[], loaded: boolean) {
  const [entries, setEntries] = useState<Entry[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(saved)) return [];
      const seen = new Set<string>();
      return saved.filter((item): item is Entry => {
        if (!item || typeof item.id !== 'string' || !Number.isInteger(item.quantity) || item.quantity <= 0 || seen.has(item.id)) return false;
        seen.add(item.id); return true;
      });
    } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(entries)); } catch { /* Private browsing may restrict storage. */ }
  }, [entries]);
  useEffect(() => {
    if (loaded) setEntries(previous => previous.flatMap(entry => {
      const product = products.find(item => item.productId === entry.id);
      return product && product.stock > 0 ? [{ ...entry, quantity: Math.min(entry.quantity, product.stock) }] : [];
    }));
  }, [products, loaded]);
  const items = entries.flatMap(entry => {
    const product = products.find(item => item.productId === entry.id);
    return product && product.stock > 0 ? [{ product, quantity: Math.min(entry.quantity, product.stock) }] : [];
  });
  const add = (product: Product) => setEntries(previous => {
    if (product.stock <= 0) return previous;
    const found = previous.find(item => item.id === product.productId);
    return found ? previous.map(item => item.id === product.productId ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item)
      : [...previous, { id: product.productId, quantity: 1 }];
  });
  const quantity = (id: string, value: number) => setEntries(previous => {
    const product = products.find(item => item.productId === id);
    if (!product || !Number.isInteger(value)) return previous;
    return value <= 0 ? previous.filter(item => item.id !== id)
      : previous.map(item => item.id === id ? { ...item, quantity: Math.min(value, product.stock) } : item);
  });
  return { items, add, quantity, count: items.reduce((sum, item) => sum + item.quantity, 0), total: items.reduce((sum, item) => sum + item.quantity * item.product.price, 0) };
}
