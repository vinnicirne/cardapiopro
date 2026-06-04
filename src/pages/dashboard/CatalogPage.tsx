import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, Package, Tags, Image as ImageIcon, Upload, X, Settings2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import imageCompression from 'browser-image-compression';
import ImageCropperModal from '../../components/shared/ImageCropperModal';
import ProductOptionsModal from '../../components/dashboard/ProductOptionsModal';

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  categoryId: string;
  imageUrl?: string;
}

export default function CatalogPage() {
  const { store } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [optionsModalProduct, setOptionsModalProduct] = useState<Product | null>(null);

  // Forms state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryName, setCategoryName] = useState('');

  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop State
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');

  useEffect(() => {
    if (store) {
      fetchCategories();
      fetchProducts();
    }
  }, [store]);

  const fetchCategories = async () => {
    if (!store) return;
    const { data } = await supabase.from('categories').select('*').eq('store_id', store.id);
    if (data) setCategories(data);
  };

  const fetchProducts = async () => {
    if (!store) return;
    const { data } = await supabase.from('products').select('*').eq('store_id', store.id);
    if (data) {
      setProducts(data.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        originalPrice: p.original_price,
        categoryId: p.category_id, // Map DB to UI
        imageUrl: p.image_url
      })));
    }
    setLoading(false);
  };

  // --- Category Functions ---
  const openNewCategoryModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setIsSaving(true);

    try {
      if (editingCategory) {
        await supabase.from('categories').update({ name: categoryName }).eq('id', editingCategory.id);
      } else {
        await supabase.from('categories').insert({ store_id: store.id, name: categoryName });
      }
      await fetchCategories();
      setIsCategoryModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar categoria');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (products.some(p => p.categoryId === id)) {
      alert('Não é possível excluir esta categoria pois existem produtos vinculados a ela.');
      return;
    }
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      await supabase.from('categories').delete().eq('id', id);
      fetchCategories();
    }
  };

  // --- Image Upload Functions ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setCropImageSrc(reader.result?.toString() || '');
        setCropModalOpen(true);
      });
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setCropModalOpen(false);
    try {
      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true };
      const compressedFile = await imageCompression(croppedFile, options);
      setImageFile(compressedFile);
      setImagePreview(URL.createObjectURL(compressedFile));
    } catch (error) {
      console.error("Erro na compressão:", error);
      alert("Erro ao processar imagem.");
    }
  };

  const uploadProductImage = async (file: File): Promise<string | null> => {
    if (!store) return null;
    const fileExt = file.name.split('.').pop() || 'jpeg';
    const fileName = `${store.id}/product-${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage.from('store-assets').upload(fileName, file);
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage.from('store-assets').getPublicUrl(fileName);
    return publicUrl;
  };

  // --- Product Functions ---
  const openNewProductModal = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setPrice('');
    setOriginalPrice('');
    setCategoryId(categories[0]?.id || '');
    setImageUrl('');
    setImageFile(null);
    setImagePreview('');
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description);
    setPrice(product.price.toString());
    setOriginalPrice(product.originalPrice ? product.originalPrice.toString() : '');
    setCategoryId(product.categoryId);
    setImageUrl(product.imageUrl || '');
    setImageFile(null);
    setImagePreview('');
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setIsSaving(true);

    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        finalImageUrl = await uploadProductImage(imageFile) || imageUrl;
      }

      const parsedPrice = parseFloat(price.replace(',', '.'));
      const parsedOriginal = originalPrice ? parseFloat(originalPrice.replace(',', '.')) : null;

      const productData = {
        store_id: store.id,
        category_id: categoryId,
        name,
        description,
        price: parsedPrice,
        original_price: parsedOriginal,
        image_url: finalImageUrl
      };

      if (editingProduct) {
        await supabase.from('products').update(productData).eq('id', editingProduct.id);
      } else {
        await supabase.from('products').insert(productData);
      }
      
      await fetchProducts();
      setIsProductModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar produto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts();
    }
  };

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || 'Sem Categoria';
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando catálogo...</div>;

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
          <p className="text-gray-500">Gerencie os produtos e categorias da sua loja.</p>
        </div>
        <button 
          onClick={activeTab === 'products' ? openNewProductModal : openNewCategoryModal}
          className="bg-primary hover:bg-primary text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> 
          {activeTab === 'products' ? 'Novo Produto' : 'Nova Categoria'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button 
          onClick={() => setActiveTab('products')}
          className={`pb-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${activeTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Package className="w-4 h-4" /> Produtos
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={`pb-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${activeTab === 'categories' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Tags className="w-4 h-4" /> Categorias
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder={`Buscar ${activeTab === 'products' ? 'produtos' : 'categorias'}...`} 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'products' ? (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-sm">
                <tr>
                  <th className="p-4 font-medium">Produto</th>
                  <th className="p-4 font-medium">Categoria</th>
                  <th className="p-4 font-medium">Preço</th>
                  <th className="p-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {products.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          <p className="text-sm text-gray-500 truncate max-w-xs">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium">
                        {getCategoryName(product.categoryId)}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-gray-900">
                      <div className="flex flex-col">
                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}</span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-400 line-through">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.originalPrice)}
                            </span>
                            <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded">
                              -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setOptionsModalProduct(product)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Complementos e Adicionais">
                          <Settings2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditProductModal(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">Nenhum produto cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-600 text-sm">
                <tr>
                  <th className="p-4 font-medium">Nome da Categoria</th>
                  <th className="p-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {categories.map(category => (
                  <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">{category.name}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditCategoryModal(category)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteCategory(category.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-gray-500">Nenhuma categoria cadastrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setIsProductModalOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
              
              {/* Product Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto do Produto</label>
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group shadow-sm">
                    {(imagePreview || imageUrl) ? (
                      <>
                        <img src={imagePreview || imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => { setImageFile(null); setImagePreview(''); setImageUrl(''); }} 
                          className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white cursor-pointer transition-colors"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" id="product-upload" />
                    <label htmlFor="product-upload" className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer inline-flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Enviar Foto
                    </label>
                    <p className="text-xs text-gray-500 mt-2">Recomendado: 800x800px.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Produto</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço Atual de Venda (R$)</label>
                  <input required type="number" step="0.01" placeholder="Ex: 40.00" value={price} onChange={e => setPrice(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço Original Riscado (R$)</label>
                  <input type="number" step="0.01" placeholder="Ex: 50.00 (Opcional)" value={originalPrice} onChange={e => setOriginalPrice(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Categoria</label>
                  <select required value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none bg-white">
                    <option value="" disabled>Selecione...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
                <div className="flex gap-3">
                  <Settings2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-blue-900">Complementos e Adicionais</h4>
                    <p className="text-sm text-blue-800 mt-1">
                      Para criar opções (ex: "Escolha sua carne" ou "Adicionais Extras"), {editingProduct ? "clique no ícone de ajustes ⚙️ na lista de produtos." : "primeiro salve este produto e depois clique no ícone de ajustes ⚙️ na lista."}
                    </p>
                  </div>
                </div>
              </div>

              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0 rounded-b-2xl">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary text-white px-6 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50">
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h2>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Categoria</label>
                <input required autoFocus type="text" value={categoryName} onChange={e => setCategoryName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary text-white px-6 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50">
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {optionsModalProduct && (
        <ProductOptionsModal
          isOpen={true}
          onClose={() => setOptionsModalProduct(null)}
          productId={optionsModalProduct.id}
          productName={optionsModalProduct.name}
        />
      )}

      <ImageCropperModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        aspectRatio={1} // Square images for products
        onClose={() => setCropModalOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
