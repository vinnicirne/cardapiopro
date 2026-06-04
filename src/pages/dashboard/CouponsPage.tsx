import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Ticket, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import PremiumFeatureOverlay from '../../components/dashboard/PremiumFeatureOverlay';

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  active: boolean;
  created_at: string;
}

export default function CouponsPage() {
  const { store } = useAuthStore();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [minOrderValue, setMinOrderValue] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (store) fetchCoupons();
  }, [store]);

  const fetchCoupons = async () => {
    if (!store) return;
    const { data } = await supabase
      .from('coupons')
      .select('*')
      .eq('store_id', store.id)
      .order('created_at', { ascending: false });
    
    if (data) setCoupons(data as Coupon[]);
    setLoading(false);
  };

  const openNewModal = () => {
    setEditingCoupon(null);
    setCode('');
    setDiscountType('percentage');
    setDiscountValue('');
    setMinOrderValue('0');
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setCode(coupon.code);
    setDiscountType(coupon.discount_type);
    setDiscountValue(coupon.discount_value.toString());
    setMinOrderValue(coupon.min_order_value.toString());
    setActive(coupon.active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setIsSaving(true);

    try {
      const couponData = {
        store_id: store.id,
        code: code.toUpperCase().trim().replace(/\s+/g, ''),
        discount_type: discountType,
        discount_value: parseFloat(discountValue.replace(',', '.')),
        min_order_value: parseFloat(minOrderValue.replace(',', '.')),
        active
      };

      if (editingCoupon) {
        await supabase.from('coupons').update(couponData).eq('id', editingCoupon.id);
      } else {
        await supabase.from('coupons').insert(couponData);
      }
      
      await fetchCoupons();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar cupom. Verifique se o código já existe.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cupom?')) {
      await supabase.from('coupons').delete().eq('id', id);
      fetchCoupons();
    }
  };

  const toggleStatus = async (coupon: Coupon) => {
    await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id);
    fetchCoupons();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando cupons...</div>;

  // Bloqueio do Plano Básico
  const isFreePlan = !store?.plan || store.plan.price <= 0;

  return (
    <div className="relative h-full">
      {isFreePlan && (
        <PremiumFeatureOverlay 
          title="Sistema de Cupons" 
          description="Crie campanhas de marketing, atraia novos clientes e fidelize os antigos com cupons de desconto. Recurso exclusivo do Plano Profissional." 
        />
      )}
      <div className={`max-w-5xl mx-auto pb-12 ${isFreePlan ? 'opacity-30 pointer-events-none select-none' : ''}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cupons de Desconto</h1>
          <p className="text-gray-500">Crie códigos promocionais para seus clientes.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-primary hover:bg-primary text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Novo Cupom
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
              <tr>
                <th className="p-4 font-medium">Código</th>
                <th className="p-4 font-medium">Desconto</th>
                <th className="p-4 font-medium">Pedido Mín.</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {coupons.map(coupon => (
                <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-primary" />
                      <span className="font-mono font-bold text-gray-900">{coupon.code}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-900 font-medium">
                    {coupon.discount_type === 'percentage' 
                      ? `${coupon.discount_value}%` 
                      : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(coupon.discount_value)}
                  </td>
                  <td className="p-4 text-gray-600">
                    {coupon.min_order_value > 0 
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(coupon.min_order_value)
                      : 'Sem mínimo'}
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => toggleStatus(coupon)}
                      className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                        coupon.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {coupon.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(coupon)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(coupon.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">Nenhum cupom cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-gray-900">{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código do Cupom</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Ex: PROMO10"
                    value={code} 
                    onChange={e => setCode(e.target.value.toUpperCase())} 
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none font-mono uppercase" 
                  />
                  <p className="text-xs text-gray-500 mt-1">Apenas letras e números, sem espaços.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Desconto</label>
                    <select 
                      value={discountType} 
                      onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')} 
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none bg-white"
                    >
                      <option value="percentage">Porcentagem (%)</option>
                      <option value="fixed">Valor Fixo (R$)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor ({discountType === 'percentage' ? '%' : 'R$'})
                    </label>
                    <input 
                      required 
                      type="number" 
                      step="0.01" 
                      min="0.01"
                      placeholder={discountType === 'percentage' ? "10" : "15.00"}
                      value={discountValue} 
                      onChange={e => setDiscountValue(e.target.value)} 
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Mínimo do Pedido (R$)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    placeholder="0.00 para não exigir mínimo"
                    value={minOrderValue} 
                    onChange={e => setMinOrderValue(e.target.value)} 
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none" 
                  />
                  <p className="text-xs text-gray-500 mt-1">Se 0, o cupom vale para qualquer valor.</p>
                </div>
              </div>
              
              <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="w-full bg-primary hover:bg-primary text-white py-2 rounded-lg font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Cupom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
