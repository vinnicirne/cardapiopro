import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { CheckCircle2, CreditCard, ExternalLink } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  max_products: number;
  features: string[];
  payment_link?: string;
}

export default function SubscriptionPage() {
  const { user, store } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlans() {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true });
      if (data) setPlans(data);
      setLoading(false);
    }
    loadPlans();
  }, []);

  const handleSubscribe = (plan: Plan) => {
    if (plan.price <= 0) {
      alert('Você já está neste plano ou ele é gratuito.');
      return;
    }

    if (!plan.payment_link) {
      alert('Link de pagamento não configurado para este plano.');
      return;
    }

    // Se o usuário existir, anexa o email na URL da Kiwify
    const checkoutUrl = new URL(plan.payment_link);
    if (user?.email) {
      checkoutUrl.searchParams.set('email', user.email);
    }
    
    // Anexa um campo customizado com o ID da loja para o Webhook processar facilmente
    if (store?.id) {
      checkoutUrl.searchParams.set('src', store.id);
    }

    window.open(checkoutUrl.toString(), '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Minha Assinatura</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie seu plano e faça upgrade para liberar novos recursos.</p>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm text-gray-500 font-medium">Plano Atual</h3>
            <p className="text-lg font-bold text-gray-900">
              {store?.plan_id ? plans.find(p => p.id === store.plan_id)?.name || 'Plano Personalizado' : 'Plano Gratuito / Básico'}
            </p>
          </div>
        </div>
        <div>
          <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
            Ativo
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-gray-500">Carregando planos...</p>
        ) : (
          plans.map((plan, index) => {
            const isCurrentPlan = store?.plan_id === plan.id || (!store?.plan_id && plan.price === 0);
            const isPro = index === 1;

            return (
              <div key={plan.id} className={`bg-white rounded-2xl border ${isPro ? 'border-primary ring-1 ring-primary' : 'border-gray-200'} p-6 flex flex-col relative`}>
                {isPro && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-white text-xs font-bold uppercase rounded-bl-lg rounded-tr-lg">Recomendado</div>
                )}
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-6 h-10">{plan.description}</p>
                
                <div className="mb-6">
                  {plan.price <= 0 ? (
                    <span className="text-4xl font-bold text-gray-900">Grátis</span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-gray-900">R${Number(plan.price).toFixed(0)}</span>
                      <span className="text-gray-500">/mês</span>
                    </>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.max_products !== -1 && (
                     <li className="flex items-center gap-3 text-sm text-gray-600">
                       <CheckCircle2 className={`w-4 h-4 ${isPro ? 'text-primary' : 'text-green-500'}`} />
                       {`Até ${plan.max_products} produtos`}
                     </li>
                  )}
                  {(plan.features || []).map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isPro ? 'text-primary' : 'text-green-500'}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => handleSubscribe(plan)}
                  disabled={isCurrentPlan}
                  className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                    isCurrentPlan 
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                      : isPro 
                        ? 'bg-primary hover:bg-orange-600 text-white cursor-pointer shadow-md' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  {isCurrentPlan ? 'Plano Atual' : plan.price <= 0 ? 'Assinar Grátis' : 'Assinar Agora'}
                  {!isCurrentPlan && plan.price > 0 && <ExternalLink className="w-4 h-4" />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
