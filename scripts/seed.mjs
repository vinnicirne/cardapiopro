import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].replace(/['"]/g, "").trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].replace(/['"]/g, "").trim();
});

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

async function seed() {
  for (const plan of plans) {
    const res = await fetch(`${supabaseUrl}/rest/v1/plans`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(plan)
    });
    console.log(`Plan ${plan.name} status: ${res.status}`);
  }
}

seed();
