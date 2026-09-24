import { useState } from 'react';
import { Store, Settings, Search, Plus, Loader2 } from 'lucide-react';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { useProducts } from './hooks/useProducts';
import type { Product } from './lib/types';
import { AiWorkspace } from './components/AiWorkspace';
function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');

  const { products, loading, error, createProduct, updateProduct, deleteProduct } = useProducts();

  const handleSaveProduct = async (productData: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>) => {
    if (editingProduct) {
      const result = await updateProduct(editingProduct.productId, productData);
      if (result.success) {
        setEditingProduct(undefined);
      } else {
        alert(result.error);
      }
    } else {
      const result = await createProduct(productData);
      if (!result.success) {
        alert(result.error);
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      const result = await deleteProduct(productId);
      if (!result.success) {
        alert(result.error);
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(undefined);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todos' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">TechModa</h1>
                <p className="text-sm text-gray-500">Catálogo de Productos</p>
              </div>
            </div>
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isAdmin
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              {isAdmin ? 'Modo Admin' : 'Modo Cliente'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="Todos">Todas las Categorías</option>
              <option value="Ropa">Ropa</option>
              <option value="Zapatos">Zapatos</option>
              <option value="Accesorios">Accesorios</option>
            </select>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
            >
              <Plus className="w-5 h-5" />
              Agregar Nuevo Producto
            </button>
          )}
        </div>

<AiWorkspace products={products} />
        {loading ? (
          // role="status" + aria-live: un lector de pantalla anuncia la carga.
          <div role="status" aria-live="polite" className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" aria-hidden="true" />
            <span className="sr-only">Cargando productos…</span>
          </div>
        ) : error ? (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Error: {error}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-500">
              {searchTerm || categoryFilter !== 'Todos'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Agrega productos para comenzar'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.productId}
                product={product}
                isAdmin={isAdmin}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveProduct}
        product={editingProduct}
      />

      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            TechModa © 2024 - E-commerce de Moda Serverless
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
