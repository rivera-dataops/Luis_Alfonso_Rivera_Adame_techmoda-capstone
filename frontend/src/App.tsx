import { useMemo, useRef, useState } from 'react';
import { Store, Settings, Search, Plus, Loader2, ShoppingBag, Minus, Trash2, Sparkles } from 'lucide-react';
import { ProductCard } from './components/ProductCard';
import { ProductModal } from './components/ProductModal';
import { useProducts } from './hooks/useProducts';
import type { Product } from './lib/types';
import { AiWorkspace } from './components/AiWorkspace';
import { ShoppingAssistant } from './components/ShoppingAssistant';
import { ProductDetails } from './components/ProductDetails';
import { ModalShell } from './components/ModalShell';
import { useCart } from './hooks/useCart';
import { ai, errorMessage } from './lib/ai';
import { demoProducts } from './lib/demoProducts';
function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [searchMode, setSearchMode] = useState<'text' | 'semantic'>('text');
  const [semanticIds, setSemanticIds] = useState<string[] | null>(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchVersion = useRef(0);

  const { products, loading, error, createProduct, updateProduct, deleteProduct, refetch } = useProducts();
  // Productos visuales solo para cliente: no se escriben en el backend.
  const cartProducts = useMemo(
    () => products.length > 0 ? [...products, ...demoProducts] : products,
    [products],
  );
  const catalogProducts = isAdmin ? products : cartProducts;
  const cart = useCart(cartProducts, !loading && !error);
  const addToCart = (product: Product) => {
    cart.add(product);
    setNotice('Carrito actualizado. Puedes revisar las cantidades en Mi carrito.');
  };
  const categories = Array.from(new Set(catalogProducts.map(product => product.category))).sort();
  const resetSearch = () => { searchVersion.current += 1; setSemanticIds(null); setSearchError(''); setSearchBusy(false); };
  const search = async () => {
    if (searchMode !== 'semantic' || !searchTerm.trim() || searchBusy) return;
    const version = ++searchVersion.current;
    setSearchBusy(true); setSearchError('');
    try {
      const response = await ai.search(searchTerm.trim());
      if (version === searchVersion.current) {
        setSemanticIds(response.results.map(hit => hit.productId));
        if (!response.results.length && response.hint) setSearchError('Todavía no hay un índice de productos disponible para esta búsqueda.');
      }
    } catch (err) { if (version === searchVersion.current) setSearchError(errorMessage(err)); }
    finally { if (version === searchVersion.current) setSearchBusy(false); }
  };

  const handleSaveProduct = async (productData: Omit<Product, 'productId' | 'createdAt' | 'updatedAt'>) => {
    if (editingProduct) {
      const result = await updateProduct(editingProduct.productId, productData);
      if (result.success) {
        setEditingProduct(undefined);
      } else {
        throw new Error(result.error || 'No se pudo actualizar el producto.');
      }
    } else {
      const result = await createProduct(productData);
      if (!result.success) {
        throw new Error(result.error || 'No se pudo crear el producto.');
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

  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const filteredProducts = catalogProducts.filter((product) => {
    const matchesSearch = searchMode === 'semantic' ? semanticIds === null || semanticIds.includes(product.productId) :
      normalize(product.name).includes(normalize(searchTerm)) || normalize(product.description).includes(normalize(searchTerm));
    const matchesCategory = categoryFilter === 'Todos' || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => semanticIds && searchMode === 'semantic' ? semanticIds.indexOf(a.productId) - semanticIds.indexOf(b.productId) : 0);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-slate-950">
      <header className="site-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="brand-mark">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-950">TechModa</h1>
                <p className="text-xs font-medium text-slate-500">Catálogo de Productos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
            {!isAdmin && <button className="btn-secondary" onClick={() => setCartOpen(true)}><ShoppingBag size={18} /><span>Mi carrito ({cart.count})</span></button>}
            <button
              onClick={() => { setIsAdmin(!isAdmin); setIsModalOpen(false); }}
              className={`mode-toggle ${
                isAdmin
                  ? 'bg-slate-950 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              {isAdmin ? 'Modo Admin' : 'Modo Cliente'}
            </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAdmin && <>
          <section className="store-hero">
            <div><p className="eyebrow">TU ESTILO, A TU MANERA</p><h2 className="mt-3 max-w-xl text-3xl font-bold leading-tight sm:text-5xl">Encuentra algo<br /><span className="text-blue-600">muy tú.</span></h2><p className="mt-4 max-w-lg text-slate-600">Explora el catálogo o cuéntanos qué necesitas. Te ayudamos a encontrar tu próxima elección.</p></div>
            <div className="hero-note"><Sparkles size={28} /><p className="mt-4 font-semibold">Una búsqueda más personal</p><p className="mt-2 text-sm text-slate-600">Prueba “algo cómodo para caminar” en la búsqueda inteligente.</p></div>
          </section>
          <ShoppingAssistant products={catalogProducts} onProduct={setActiveProduct} />
        </>}
        {isAdmin && <AiWorkspace products={products} onChanged={refetch} />}
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">{isAdmin ? 'PANEL DE CONTROL' : 'COLECCIÓN CURADA'}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">{isAdmin ? 'Tus productos' : 'Explora el catálogo'}</h2></div><span className="catalog-count">{catalogProducts.length} productos</span></div>
        {notice && <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">{notice}<button onClick={() => setNotice('')} aria-label="Cerrar aviso">✕</button></div>}
        <div className="mb-8 space-y-4">
          <div className="flex gap-2" aria-label="Tipo de búsqueda">
            <button className={searchMode === 'text' ? 'search-tab active' : 'search-tab'} aria-pressed={searchMode === 'text'} onClick={() => { setSearchMode('text'); resetSearch(); }}>Por nombre</button>
            <button className={searchMode === 'semantic' ? 'search-tab active' : 'search-tab'} aria-pressed={searchMode === 'semantic'} onClick={() => { setSearchMode('semantic'); resetSearch(); }}><Sparkles size={15} /> Búsqueda inteligente</button>
          </div>
          <form onSubmit={event => { event.preventDefault(); void search(); }} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                aria-label="Buscar productos"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); resetSearch(); }}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              aria-label="Filtrar por categoría"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="Todos">Todas las Categorías</option>
              {categories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
            {searchMode === 'semantic' && <button className="btn-primary" disabled={!searchTerm.trim() || searchBusy}>{searchBusy ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}Buscar</button>}
          </form>
          {searchError && <p role="alert" className="error-box">{searchError}</p>}

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

        {loading ? (
          // role="status" + aria-live: un lector de pantalla anuncia la carga.
          <div role="status" aria-live="polite" className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" aria-hidden="true" />
            <span className="sr-only">Cargando productos…</span>
          </div>
        ) : error ? (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            Error: {error}
            <button className="btn-secondary ml-3" onClick={refetch}>Reintentar</button>
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
                onAdd={addToCart}
                onView={setActiveProduct}
              />
            ))}
          </div>
        )}
      </main>
      {activeProduct && <ProductDetails key={activeProduct.productId} product={products.find(product => product.productId === activeProduct.productId) || activeProduct} onClose={() => setActiveProduct(null)} onAdd={product => { addToCart(product); setActiveProduct(null); setCartOpen(true); }} />}
      {cartOpen && <ModalShell title="Mi carrito" onClose={() => setCartOpen(false)}>
        {cart.items.length === 0 ? <p className="py-8 text-center text-slate-500">Tu carrito está vacío. Elige algo que te guste.</p> : <>
          <div className="space-y-4">{cart.items.map(({ product, quantity }) => <div key={product.productId} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 p-3">
            <img src={product.imageUrl} alt="" className="h-16 w-16 rounded-lg object-contain" />
            <div className="min-w-32 flex-1"><p className="font-semibold">{product.name}</p><p className="text-sm text-slate-500">${product.price.toFixed(2)} por unidad</p></div>
            <div className="flex items-center gap-3"><button className="icon-button" aria-label={'Quitar una unidad de ' + product.name} onClick={() => cart.quantity(product.productId, quantity - 1)}><Minus size={16} /></button><span>{quantity}</span><button className="icon-button" disabled={quantity >= product.stock} aria-label={'Añadir una unidad de ' + product.name} onClick={() => cart.quantity(product.productId, quantity + 1)}><Plus size={16} /></button><button className="icon-button" aria-label={'Quitar ' + product.name + ' del carrito'} onClick={() => cart.quantity(product.productId, 0)}><Trash2 size={16} /></button></div>
          </div>)}</div>
          <p className="mt-6 flex justify-between text-xl font-bold"><span>Total</span><span>${cart.total.toFixed(2)}</span></p>
          <p className="mt-3 text-sm text-slate-500">Carrito de demostración. No se procesan pagos ni se reservan existencias.</p>
        </>}
        <button className="btn-primary mt-6 w-full" onClick={() => setCartOpen(false)}>Seguir explorando</button>
      </ModalShell>}

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
