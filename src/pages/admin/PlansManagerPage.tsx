import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Check, AlertCircle } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  max_products: number;
  features: string[];
  active: boolean;
  payment_link?: string;
}

export default function PlansManagerPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [maxProducts, setMaxProducts] = useState(-1);
  const [features, setFeatures] = useState('');
  const [active, setActive] = useState(true);
  const [paymentLink, setPaymentLink] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price', { ascending: true });

    if (!error && data) {
      setPlans(data);
    }
    setLoading(false);
  };

  const handleEdit = (plan: Plan) => {
    setIsEditing(plan.id);
    setName(plan.name);
    setDescription(plan.description || '');
    setPrice(plan.price);
    setMaxProducts(plan.max_products);
    setFeatures(plan.features ? plan.features.join('\n') : '');
    setActive(plan.active);
    setPaymentLink(plan.payment_link || '');
    setFormError('');
  };

  const resetForm = () => {
    setIsEditing(null);
    setName('');
    setDescription('');
    setPrice(0);
    setMaxProducts(-1);
    setFeatures('');
    setActive(true);
    setPaymentLink('');
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const featuresArray = features.split('\n').filter(f => f.trim() !== '');

    const planData = {
      name,
      description,
      price,
      max_products: maxProducts,
      features: featuresArray,
      active,
      payment_link: paymentLink || null
    };

    if (isEditing) {
      const { error } = await supabase.from('plans').update(planData).eq('id', isEditing);
      if (error) setFormError(error.message);
      else {
        fetchPlans();
        resetForm();
      }
    } else {
      const { error } = await supabase.from('plans').insert([planData]);
      if (error) setFormError(error.message);
      else {
        fetchPlans();
        resetForm();
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Planos SaaS</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie os planos de assinatura disponíveis para os lojistas.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold mb-4">{isEditing ? 'Editar Plano' : 'Criar Novo Plano'}</h2>
        
        {formError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Plano</label>
              <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço Mensal (R$)</label>
              <input type="number" step="0.01" required value={price} onChange={e => setPrice(parseFloat(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Limite de Produtos (-1 para ilimitado)</label>
              <input type="number" required value={maxProducts} onChange={e => setMaxProducts(parseInt(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 text-primary rounded border-gray-300" />
              <label htmlFor="active" className="text-sm font-medium text-gray-700">Plano Ativo (Disponível para venda)</label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link de Pagamento (Kiwify Checkout URL)</label>
            <input type="url" placeholder="https://pay.kiwify.com.br/..." value={paymentLink} onChange={e => setPaymentLink(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
            <p className="text-xs text-gray-500 mt-1">Deixe em branco para planos gratuitos.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Benefícios (Um por linha)</label>
            <textarea rows={4} value={features} onChange={e => setFeatures(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="Ex:&#10;Cardápio Digital&#10;Pedidos Ilimitados" />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            {isEditing && (
              <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-gray-700 cursor-pointer">
                Cancelar
              </button>
            )}
            <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 flex items-center gap-2 cursor-pointer">
              {isEditing ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {isEditing ? 'Salvar Alterações' : 'Criar Plano'}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-gray-500">Carregando planos...</p>
        ) : plans.map(plan => (
          <div key={plan.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col ${!plan.active ? 'opacity-60 grayscale' : 'border-gray-200'}`}>
            <div className="p-6 border-b border-gray-100 flex-1">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                {!plan.active && <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded font-medium">Inativo</span>}
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                R$ {Number(plan.price).toFixed(2).replace('.', ',')}
                <span className="text-sm font-normal text-gray-500">/mês</span>
              </p>
              <p className="text-sm text-gray-600 mb-4 h-10">{plan.description}</p>
              
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                  {plan.max_products === -1 ? 'Produtos ilimitados' : `Até ${plan.max_products} produtos`}
                </li>
                {plan.features?.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button 
                onClick={() => handleEdit(plan)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-slate-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <Edit2 className="w-4 h-4" />
                Editar Plano
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
