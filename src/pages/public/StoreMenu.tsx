import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import CheckoutModal from '../../components/public/CheckoutModal';
import PublicProductModal from '../../components/public/PublicProductModal';
import CustomerOrdersModal from '../../components/public/CustomerOrdersModal';
import { supabase } from '../../lib/supabase';
import { checkStoreOpen } from '../../utils/storeHours';
import type { Product } from '../../store/cartStore';

export default function StoreMenu() {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { items, getTotal } = useCartStore();
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);

  // Mock data as default fallback
  const [store, setStore] = useState({
    id: '',
    name: 'Loja',
    description: '',
    logoUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=150&h=150&fit=crop',
    coverUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&h=400&fit=crop',
    phone: '5511999999999', // Phone for WhatsApp
    is_open: true,
    opening_hours: null as any
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    // Verifica se o cliente tem um telefone salvo para poder ver "Meus Pedidos"
    const savedPhone = localStorage.getItem('saas_cardapio_phone');
    if (savedPhone) {
      setCustomerPhone(savedPhone);
    }

    async function fetchStore() {
      if (!storeSlug) return;
      const { data } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', storeSlug)
        .single();
        
      if (data) {
        setStore(prev => ({
          ...prev,
          id: data.id,
          name: data.name || prev.name,
          description: data.description || prev.description,
          logoUrl: data.logo_url || prev.logoUrl,
          coverUrl: data.cover_url || prev.coverUrl,
          phone: data.phone || prev.phone,
          is_open: data.is_open,
          opening_hours: data.opening_hours
        }));

        // Fetch categories and products for this store
        const [categoriesRes, productsRes] = await Promise.all([
          supabase.from('categories').select('*').eq('store_id', data.id).order('created_at', { ascending: true }),
          supabase.from('products').select('*').eq('store_id', data.id)
        ]);

        if (categoriesRes.data) {
          setCategories(categoriesRes.data.map(c => ({ id: c.id, name: c.name })));
        }

        if (productsRes.data) {
          setProducts(productsRes.data.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            originalPrice: p.original_price,
            categoryId: p.category_id,
            imageUrl: p.image_url,
            is_preorder: p.is_preorder,
            preorder_notice: p.preorder_notice
          })));
        }
      }
    }
    fetchStore();
  }, [storeSlug]);

  const anyModalOpen = isCheckoutOpen || !!selectedProduct || isOrdersModalOpen;

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.hash !== '#modal') {
        setIsCheckoutOpen(false);
        setSelectedProduct(null);
        setIsOrdersModalOpen(false);
      }
    };

    if (anyModalOpen) {
      if (window.location.hash !== '#modal') {
        window.history.pushState(null, '', window.location.pathname + window.location.search + '#modal');
      }
      window.addEventListener('popstate', handlePopState);
    } else {
      if (window.location.hash === '#modal') {
        window.history.back();
      }
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [anyModalOpen]);

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const isOpen = checkStoreOpen(store);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Cover and Header */}
      <div className="h-48 md:h-64 w-full bg-gray-200 relative">
        <img src={store.coverUrl} alt="Capa" className={`w-full h-full object-cover ${!isOpen ? 'grayscale' : ''}`} />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {!isOpen && (
        <div className="bg-red-600 text-white text-center py-3 font-bold shadow-md sticky top-0 z-50">
          ⚠️ LOJA FECHADA NO MOMENTO - Não estamos aceitando pedidos.
        </div>
      )}

      <div className={`max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 ${isOpen ? '-mt-16' : 'mt-4'} relative z-10`}>
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left relative">
          <img src={store.logoUrl} alt={store.name} className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
            <p className="text-gray-500 mt-1">{store.description}</p>
          </div>
          {customerPhone && store.id && (
            <button 
              onClick={() => setIsOrdersModalOpen(true)}
              className="sm:absolute sm:top-6 sm:right-6 bg-orange-100 text-orange-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-200 transition-colors cursor-pointer"
            >
              Meus Pedidos
            </button>
          )}
        </div>

        {/* Categories */}
        <div className="mt-8 flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map(cat => (
            <button key={cat.id} className="px-6 py-2 rounded-full bg-white border border-gray-200 text-gray-700 font-medium whitespace-nowrap hover:border-primary hover:text-primary transition-colors cursor-pointer">
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product List */}
        <div className="mt-6 space-y-8">
          {categories.map(category => {
            const categoryProducts = products.filter(p => p.categoryId === category.id);
            if (categoryProducts.length === 0) return null;

            return (
              <div key={category.id}>
                <h2 className="text-xl font-bold text-gray-900 mb-4">{category.name}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {categoryProducts.map(product => (
                    <div 
                      key={product.id} 
                      onClick={() => isOpen ? setSelectedProduct(product as Product) : alert('A loja está fechada no momento.')}
                      className={`bg-white rounded-xl p-4 flex gap-4 shadow-sm border border-gray-100 transition-shadow group ${isOpen ? 'hover:shadow-md cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 group-hover:text-primary transition-colors">{product.name}</h3>
                          {product.is_preorder && (
                            <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                              Sob Encomenda
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                        <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          {product.originalPrice && product.originalPrice > product.price && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-gray-400 line-through">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.originalPrice)}
                              </span>
                              <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded uppercase">
                                -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                              </span>
                            </div>
                          )}
                          <div className="font-bold text-gray-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                          </div>
                        </div>
                      </div>
                      {product.imageUrl && (
                        <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0">
                          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Cart Button */}
      {totalItems > 0 && isOpen && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 sm:bg-transparent sm:border-t-0 sm:p-6 sm:max-w-3xl sm:mx-auto z-40">
          <button 
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full bg-primary text-white rounded-xl py-4 px-6 flex items-center justify-between font-medium shadow-lg hover:bg-primary transition-colors cursor-pointer active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center font-bold">{totalItems}</div>
              <span>Ver Carrinho</span>
            </div>
            <span>R$ {getTotal().toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
        storePhone={store.phone}
      />

      {/* Product Modal */}
      {selectedProduct && (
        <PublicProductModal
          isOpen={true}
          onClose={() => setSelectedProduct(null)}
          product={selectedProduct}
        />
      )}

      {/* Customer Orders Tracking Modal */}
      <CustomerOrdersModal 
        isOpen={isOrdersModalOpen}
        onClose={() => setIsOrdersModalOpen(false)}
        phone={customerPhone || ''}
        storeId={store.id}
      />
    </div>
  );
}
