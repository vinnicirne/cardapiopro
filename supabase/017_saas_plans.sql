-- ==========================================
-- 18. PLANOS DE ASSINATURA SAAS E GERENCIAMENTO
-- ==========================================

-- Tabela de Planos do Sistema (Visível e gerenciada pelo Superadmin)
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    max_products INTEGER NOT NULL DEFAULT -1, -- -1 significa ilimitado
    features JSONB DEFAULT '[]'::jsonb, -- Array de strings com os benefícios
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabela de Assinaturas (Vincula as Lojas aos Planos)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL UNIQUE,
    plan_id UUID REFERENCES public.plans(id) ON DELETE RESTRICT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing'
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso: Planos
-- Lojistas podem ver todos os planos ativos (para assinar)
CREATE POLICY "Qualquer um pode ver planos ativos" ON public.plans FOR SELECT USING (active = true);
-- Superadmin (usuários com is_superadmin=true ou baseados na lógica de app) tem acesso total
CREATE POLICY "Superadmin tem acesso total aos planos" ON public.plans FOR ALL USING (
    (auth.jwt() ->> 'email') IN ('admin@saascardapio.com', 'seuemail@aqui.com') -- Mudar depois se usar tabela admin_users
);

-- Políticas de Acesso: Assinaturas
-- Lojistas podem ver sua própria assinatura
CREATE POLICY "Lojista pode ver sua propria assinatura" ON public.subscriptions FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stores WHERE stores.id = subscriptions.store_id AND stores.owner_id = auth.uid())
);
-- Superadmin gerencia as assinaturas
CREATE POLICY "Superadmin tem acesso total as assinaturas" ON public.subscriptions FOR ALL USING (true);


-- Inserir um Plano Gratuito Inicial como Default
INSERT INTO public.plans (name, description, price, max_products, features, active)
VALUES (
    'Plano Inicial',
    'Ideal para quem está começando e validando o negócio.',
    0.00,
    50,
    '["Até 50 Produtos", "Suporte Básico", "Recebimento de Pedidos no WhatsApp", "Cardápio Digital QR Code"]'::jsonb,
    true
) ON CONFLICT DO NOTHING;
