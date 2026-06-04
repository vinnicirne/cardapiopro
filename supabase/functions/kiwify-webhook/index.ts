import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.44.0";

// Interface baseada na documentação da Kiwify
interface KiwifyWebhookPayload {
  order_id: string;
  order_ref: string;
  order_status: string; // paid, refunded, chargedback
  Customer?: {
    email: string;
    first_name: string;
    last_name: string;
  };
  customer?: {
    email: string;
    first_name: string;
    last_name: string;
  };
  product: {
    product_id: string;
    product_name: string;
  };
  TrackingParameters?: {
    src?: string; // Aqui passamos o Store ID via link (ex: ?src=xxx)
  };
}

serve(async (req) => {
  try {
    // Apenas POST é permitido (Webhook)
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const payload: KiwifyWebhookPayload = await req.json();
    console.log('Recebido webhook da Kiwify:', payload.order_ref, payload.order_status);

    // Conectar ao Supabase com privilégios de Admin (Service Role Key)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase URL ou Service Role Key faltando nas variáveis de ambiente.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Pega o email e storeId de forma segura (prevendo letras maiúsculas ou minúsculas da Kiwify)
    const customerEmail = payload.Customer?.email || payload.customer?.email;
    const storeId = payload.TrackingParameters?.src || payload.trackingParameters?.src;

    if (!customerEmail) {
      console.log('Aviso: Webhook recebido sem email do cliente. Payload:', JSON.stringify(payload));
    }

    if (payload.order_status === 'paid') {
      // 1. Procurar qual é o plano correto no banco de dados baseado no nome ou ID do produto da Kiwify
      // Por enquanto, vamos assumir que queremos jogar para o Plano Profissional se foi pago
      const { data: planData } = await supabase
        .from('plans')
        .select('id')
        .eq('price', 49) // Hardcoded ou mapeado dependendo de como você organizou
        .single();

      if (planData) {
        // Se a loja foi passada via parametro ?src=ID
        if (storeId) {
           await supabase.from('stores').update({ plan_id: planData.id }).eq('id', storeId);
        } else {
           // Fallback: Procura se a loja existe com o email do owner (Isso exige JOIN via rpc ou tabela owners que não temos)
           // Então o ?src=id_da_loja é o mais seguro.
        }
      }
    } 
    else if (payload.order_status === 'refunded' || payload.order_status === 'chargedback') {
      // Remover plano e voltar pro gratuito
      const { data: freePlan } = await supabase
        .from('plans')
        .select('id')
        .eq('price', 0)
        .single();
        
      if (freePlan && storeId) {
        await supabase.from('stores').update({ plan_id: freePlan.id }).eq('id', storeId);
      }
    }

    return new Response(JSON.stringify({ message: 'Webhook processado com sucesso' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error('Erro processando webhook:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
