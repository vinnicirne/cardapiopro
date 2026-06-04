import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Store } from '../../store/authStore';
import { Calendar, CreditCard, ShieldAlert } from 'lucide-react';
import { RadixConfirm } from '../../components/shared/RadixConfirm';

// Estendendo o tipo Store para incluir relacionamentos
interface Plan {
  id: string;
  name: string;
  price: number;
}

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_end: string | null;
  plans: Plan;
}

interface BuyerStore extends Store {
  owner_email?: string;
  created_at: string;
  subscriptions: Subscription | Subscription[] | null;
}

export default function BuyersManagerPage() {
  const [stores, setStores] = useState<BuyerStore[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingPlanStoreId, setChangingPlanStoreId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Stores with Subscriptions and Plans
    const { data: storesData, error: storesError } = await supabase
      .from('stores')
      .select(`
        *,
        subscriptions (
          id,
          status,
          current_period_end,
          plan_id,
          plans ( id, name, price )
        )
      `)
      .order('created_at', { ascending: false });

    // Fetch available Plans for the dropdown
    const { data: plansData } = await supabase
      .from('plans')
      .select('id, name, price')
      .eq('active', true)
      .order('price', { ascending: true });

    if (!storesError && storesData) {
      setStores(storesData as any);
    }
    if (plansData) {
      setPlans(plansData);
    }
    setLoading(false);
  };

  const getActiveSubscription = (store: BuyerStore): Subscription | null => {
    if (!store.subscriptions) return null;
    if (Array.isArray(store.subscriptions)) {
      return store.subscriptions.length > 0 ? store.subscriptions[0] : null;
    }
    return store.subscriptions;
  };

  const handleChangePlan = async (storeId: string, newPlanId: string) => {
    if (!newPlanId) return;
    
    // Check if store already has a subscription
    const store = stores.find(s => s.id === storeId);
    const currentSub = store ? getActiveSubscription(store) : null;

    try {
      if (currentSub) {
        // Update existing
        const { error } = await supabase
          .from('subscriptions')
          .update({ plan_id: newPlanId, status: 'active', updated_at: new Date().toISOString() })
          .eq('id', currentSub.id);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('subscriptions')
          .insert([{ store_id: storeId, plan_id: newPlanId, status: 'active' }]);
        if (error) throw error;
      }
      
      setChangingPlanStoreId(null);
      fetchData(); // Reload to get nested data correctly
    } catch (err: any) {
      console.error('Erro ao mudar plano:', err);
      alert('Erro ao mudar plano do usuário: ' + err.message);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active': return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Ativo</span>;
      case 'past_due': return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Atrasado</span>;
      case 'canceled': return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">Cancelado</span>;
      case 'trialing': return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Trial</span>;
      default: return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">Sem Plano</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Assinantes</h1>
          <p className="text-sm text-gray-500 mt-1">Veja quais planos os lojistas estão usando e gerencie as assinaturas.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Lojistas:</span>
          <span className="text-lg font-bold text-primary">{stores.length}</span>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lojista</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plano Atual</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações (Mudar Plano)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Carregando assinantes...
                  </td>
                </tr>
              ) : stores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma loja cadastrada no sistema.
                  </td>
                </tr>
              ) : (
                stores.map((store) => {
                  const sub = getActiveSubscription(store);
                  const isChangingPlan = changingPlanStoreId === store.id;

                  return (
                    <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{store.name}</div>
                        <div className="text-sm text-gray-500">{store.owner_email || 'Email não informado'}</div>
                        <a href={`/${store.slug}`} target="_blank" className="text-xs text-primary hover:underline mt-1 inline-block">/{store.slug}</a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(sub?.status)}
                      </td>
                      <td className="px-6 py-4">
                        {sub?.plans ? (
                          <div>
                            <div className="font-medium text-gray-900">{sub.plans.name}</div>
                            <div className="text-sm text-gray-500">R$ {Number(sub.plans.price).toFixed(2).replace('.', ',')} /mês</div>
                            {sub.current_period_end && (
                              <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Vence em: {new Date(sub.current_period_end).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-sm italic">Nenhum plano vinculado</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {isChangingPlan ? (
                          <div className="flex items-center gap-2">
                            <select 
                              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                              onChange={(e) => handleChangePlan(store.id, e.target.value)}
                              defaultValue=""
                            >
                              <option value="" disabled>Selecione um plano...</option>
                              {plans.map(p => (
                                <option key={p.id} value={p.id}>{p.name} (R$ {Number(p.price).toFixed(2)})</option>
                              ))}
                            </select>
                            <button onClick={() => setChangingPlanStoreId(null)} className="text-gray-500 hover:text-gray-700 text-xs cursor-pointer">Cancelar</button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 items-start">
                            <button 
                              onClick={() => setChangingPlanStoreId(store.id)}
                              className="text-primary hover:text-primary-dark cursor-pointer text-sm font-medium"
                            >
                              Alterar Plano
                            </button>
                            
                            <RadixConfirm
                              title="Suspender Acesso do Lojista?"
                              description={`Isso irá marcar a assinatura da loja "${store.name}" como "past_due" (Atrasada), impedindo que o lojista acesse o painel dele até regularizar.`}
                              onConfirm={async () => {
                                if(sub) {
                                  await supabase.from('subscriptions').update({ status: 'past_due' }).eq('id', sub.id);
                                  fetchData();
                                } else {
                                  alert('O lojista ainda não tem uma assinatura criada.');
                                }
                              }}
                            >
                              <button className="text-red-600 hover:text-red-800 flex items-center gap-1 text-xs cursor-pointer" title="Suspender Acesso">
                                <ShieldAlert className="w-3 h-3" /> Suspender
                              </button>
                            </RadixConfirm>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
