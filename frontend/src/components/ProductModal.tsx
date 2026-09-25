import { useState, useEffect } from 'react';
import type { Product } from '../lib/types';
import { ModalShell } from './ModalShell';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>) => Promise<void> | void;
  product?: Product;
}

export function ProductModal({ isOpen, onClose, onSave, product }: ProductModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Ropa',
    stock: '',
    imageUrl: '',
  });

  useEffect(() => {
    setError('');
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        category: product.category,
        stock: product.stock.toString(),
        imageUrl: product.imageUrl,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        category: 'Ropa',
        stock: '',
        imageUrl: '',
      });
    }
  }, [product, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true); setError('');
    try {
    await onSave({
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      category: formData.category,
      stock: parseInt(formData.stock),
      imageUrl: formData.imageUrl,
    });
    onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.');
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <ModalShell title={product ? 'Editar Producto' : 'Nuevo Producto'} onClose={() => { if (!saving) onClose(); }}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <fieldset disabled={saving} className="space-y-4">
          <div>
            <label htmlFor="product-name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Producto
            </label>
            <input
              type="text"
              required
              id="product-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Camiseta Clásica"
            />
          </div>
          <div>
            <label htmlFor="product-desc" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              required
              id="product-desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Describe el producto..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="product-price" className="block text-sm font-medium text-gray-700 mb-1">
                Precio ($)
              </label>
              <input
                type="number"
                required
                step="0.01"
                id="product-price"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="29.99"
              />
            </div>
            <div>
              <label htmlFor="product-stock" className="block text-sm font-medium text-gray-700 mb-1">
                Stock
              </label>
              <input
                type="number"
                required
                min="0"
                id="product-stock"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="50"
              />
            </div>
          </div>
          <div>
            <label htmlFor="product-category" className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              required
              id="product-category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Ropa">Ropa</option>
              <option value="Zapatos">Zapatos</option>
              <option value="Accesorios">Accesorios</option>
              <option value="Vestidos">Vestidos</option>
              <option value="Chaquetas">Chaquetas</option>
              <option value="Calzado">Calzado</option>
              {!['Ropa', 'Zapatos', 'Accesorios', 'Vestidos', 'Chaquetas', 'Calzado'].includes(formData.category) && <option value={formData.category}>{formData.category}</option>}
            </select>
          </div>
          <div>
            <label htmlFor="product-image" className="block text-sm font-medium text-gray-700 mb-1">
              URL de Imagen
            </label>
            <input
              type="url"
              required
              id="product-image"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {saving ? 'Guardando…' : product ? 'Actualizar' : 'Crear'}
            </button>
          </div>
          </fieldset>
          {error && <p role="alert" className="error-box">{error}</p>}
        </form>
    </ModalShell>
  );
}
