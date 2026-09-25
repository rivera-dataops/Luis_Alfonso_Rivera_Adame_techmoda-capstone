import type { Product } from './types';

/** Visual-only inventory for the customer demo. It is never sent to the API. */
export const demoProducts: Product[] = [
  {
    productId: 'demo-bolso-minimal',
    name: 'Bolso Minimal de Piel',
    description: 'Diseño limpio y espacioso para acompañarte todos los días.',
    price: 89.99,
    category: 'Accesorios',
    stock: 18,
    imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85',
  },
  {
    productId: 'demo-sneakers-urban',
    name: 'Sneakers Urban Cloud',
    description: 'Comodidad ligera con una silueta urbana para moverte sin pausa.',
    price: 119.99,
    category: 'Zapatos',
    stock: 24,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85',
  },
  {
    productId: 'demo-gafas-sol',
    name: 'Gafas Solar Studio',
    description: 'Montura contemporánea y protección UV para tus planes al aire libre.',
    price: 64.99,
    category: 'Accesorios',
    stock: 31,
    imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85',
  },
  {
    productId: 'demo-mochila-tech',
    name: 'Mochila Daily Tech',
    description: 'Compartimentos inteligentes para laptop, accesorios y esenciales.',
    price: 74.99,
    category: 'Accesorios',
    stock: 16,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=85',
  },
  {
    productId: 'demo-hoodie-studio',
    name: 'Hoodie Studio Soft',
    description: 'Textura suave y corte relajado para una rutina con más estilo.',
    price: 69.99,
    category: 'Ropa',
    stock: 22,
    imageUrl: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=85',
  },
  {
    productId: 'demo-gorra-classic',
    name: 'Gorra Classic Cotton',
    description: 'Un básico versátil con ajuste cómodo y acabado atemporal.',
    price: 34.99,
    category: 'Accesorios',
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=900&q=85',
  },
];
