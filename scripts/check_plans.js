import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const plans = [
    {
      name: 'Iniciante',
      description: 'Para quem está começando agora.',
      price: 0.00,
      max_products: -1,
      features: ["Até 50 pedidos/mês", "Integração WhatsApp", "Painel de controle básico", "Cardápio online (com anúncios)"],
      active: true
    },
    {
      name: 'Profissional',
      description: 'Tudo que você precisa para escalar.',
      price: 49.00,
      max_products: -1,
      features: ["Pedidos ilimitados", "Sem taxa por pedido", "Gestão de Áreas de Entrega", "Painel de Gestão Completo", "Sem anúncios"],
      active: true
    }
  ];

  for (const plan of plans) {
    const { error } = await supabase.from('plans').insert(plan);
    if (error) {
      console.error(`Erro ao inserir ${plan.name}:`, error);
    } else {
      console.log(`Plano ${plan.name} inserido com sucesso!`);
    }
  }
}

main();
