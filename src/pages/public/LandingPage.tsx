import { ArrowRight, Smartphone, Zap, ChartBar, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { usePlatformStore } from '../../store/platformStore';

export default function LandingPage() {
  const { settings } = usePlatformStore();
  const [plans, setPlans] = useState<any[]>([]);
  const platformName = settings?.platform_name || 'Cardápio Pro';

  useEffect(() => {
    async function loadPlans() {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true });
      if (data) setPlans(data);
    }
    loadPlans();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-primary/30">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt={platformName} className="h-8" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-primary flex items-center justify-center">
                <span className="font-bold text-white text-xl">S</span>
              </div>
            )}
            <span className="text-xl font-bold tracking-tight">{platformName}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#recursos" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:block">Recursos</a>
            <a href="#precos" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden md:block">Preços</a>
            <Link to="/dashboard" className="text-sm font-medium hover:text-orange-400 transition-colors">Entrar</Link>
            <Link to="/dashboard" className="text-sm font-medium px-5 py-2.5 rounded-full bg-white text-slate-950 hover:bg-orange-50 transition-colors">
              Testar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 md:pt-48 md:pb-32 overflow-hidden px-6">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-orange-400 text-sm font-medium mb-8">
              <span className="flex h-2 w-2 rounded-full bg-primary" />
              Lançamento Oficial 2.0
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-8 leading-[1.1]">
              {settings?.landing_title || 'O seu cardápio totalmente digital'}
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-10 leading-relaxed max-w-lg">
              {settings?.landing_subtitle || 'Venda mais com um cardápio online moderno, receba pedidos direto no WhatsApp ou painel e fidelize seus clientes sem pagar taxas abusivas.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-primary to-primary hover:from-orange-400 hover:to-primary text-white font-medium text-lg transition-all shadow-[0_0_40px_-10px_#f97316]">
                Criar meu cardápio
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a href="#demo" className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-lg transition-all backdrop-blur-sm">
                Ver demonstração
              </a>
            </div>
            
            <div className="mt-12 flex items-center gap-4 text-sm text-slate-400">
              <div className="flex -space-x-3">
                {[1,2,3,4].map((i) => (
                  <img key={i} src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" className="w-10 h-10 rounded-full border-2 border-slate-950" />
                ))}
              </div>
              <p>Junte-se a mais de <span className="text-white font-bold">2.000+</span> lojistas.</p>
            </div>
          </div>
          
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            {/* Glass decoration */}
            <div className="absolute -inset-4 bg-gradient-to-b from-primary/20 to-transparent rounded-[2.5rem] blur-xl opacity-50" />
            <div className="relative rounded-[2rem] border border-white/10 bg-slate-900/50 backdrop-blur-2xl p-2 shadow-2xl">
              <img 
                src="/hero-mockup.png" 
                alt="Demonstração do Cardápio Digital" 
                className="w-full rounded-[1.5rem] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="py-24 border-t border-white/5 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Tudo que você precisa para decolar seu delivery</h2>
            <p className="text-slate-400 text-lg">Uma plataforma completa, feita para simplificar sua vida e aumentar seus lucros.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Smartphone className="w-6 h-6 text-orange-400" />,
                title: 'Interface Mobile-First',
                desc: 'Seu cardápio lindo e super rápido no celular, onde 90% dos seus clientes estão.'
              },
              {
                icon: <Zap className="w-6 h-6 text-orange-400" />,
                title: 'Pedidos em Tempo Real',
                desc: 'Gerenciador de pedidos ágil, com integração via WhatsApp ou Painel Exclusivo.'
              },
              {
                icon: <ChartBar className="w-6 h-6 text-orange-400" />,
                title: 'Gestão Inteligente',
                desc: 'Controle de estoque, áreas de entrega e relatórios de vendas na palma da mão.'
              }
            ].map((feature, i) => (
              <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Planos simples e transparentes</h2>
            <p className="text-slate-400 text-lg">Sem taxas escondidas. Cancele quando quiser.</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              // Mantém o design exato: o segundo plano (index 1) ganha o destaque Pro (Mais Popular)
              const isPro = index === 1;

              return (
                <div key={plan.id} className={`w-full md:w-[400px] p-8 rounded-3xl flex flex-col relative overflow-hidden ${
                  isPro 
                    ? 'bg-gradient-to-b from-primary/20 to-orange-900/10 border border-primary/30' 
                    : 'bg-white/5 border border-white/10'
                }`}>
                  {isPro && (
                    <div className="absolute top-0 right-0 px-4 py-1 bg-primary text-white text-xs font-bold uppercase rounded-bl-xl">Mais Popular</div>
                  )}
                  
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className={isPro ? "text-orange-200 mb-6 min-h-[48px]" : "text-slate-400 mb-6 min-h-[48px]"}>
                    {plan.description}
                  </p>
                  
                  <div className="mb-8">
                    {plan.price <= 0 ? (
                      <span className="text-5xl font-bold">Grátis</span>
                    ) : (
                      <>
                        <span className="text-5xl font-bold">R${Number(plan.price).toFixed(0)}</span>
                        <span className="text-slate-400">/mês</span>
                      </>
                    )}
                  </div>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                    {/* Exibir o limite de produtos como uma das features para manter o visual original */}
                    {plan.max_products !== -1 && (
                       <li className={`flex items-center gap-3 ${isPro ? 'text-slate-100' : 'text-slate-300'}`}>
                         <CheckCircle2 className={`w-5 h-5 shrink-0 ${isPro ? 'text-orange-400' : 'text-primary'}`} />
                         {`Até ${plan.max_products} produtos`}
                       </li>
                    )}
                    
                    {(plan.features || []).map((item: string, i: number) => (
                      <li key={i} className={`flex items-start gap-3 ${isPro ? 'text-slate-100' : 'text-slate-300'}`}>
                        <CheckCircle2 className={`w-5 h-5 shrink-0 ${isPro ? 'text-orange-400' : 'text-primary'}`} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link 
                    to={plan.price > 0 && plan.payment_link ? `/register?checkout=${encodeURIComponent(plan.payment_link)}` : '/register'} 
                    className={`w-full py-4 rounded-xl text-center font-medium transition-colors ${
                      isPro 
                        ? 'bg-primary hover:bg-orange-600 text-white shadow-lg' 
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {plan.price <= 0 ? 'Começar Grátis' : 'Assinar Agora'}
                  </Link>
                </div>
              );
            })}
            
            {plans.length === 0 && (
              <div className="text-center text-slate-500 w-full py-10">
                <p>Nenhum plano ativo encontrado. Adicione planos no painel Admin.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-slate-950 text-center text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">{platformName} © 2026</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-300">Termos</a>
            <a href="#" className="hover:text-slate-300">Privacidade</a>
            <a href="#" className="hover:text-slate-300">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
