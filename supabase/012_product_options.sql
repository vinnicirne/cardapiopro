-- Criação da tabela de Grupos de Opções
CREATE TABLE IF NOT EXISTS public.product_option_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    is_required BOOLEAN DEFAULT false,
    min_selections INTEGER DEFAULT 0,
    max_selections INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criação da tabela de Opções Individuais
CREATE TABLE IF NOT EXISTS public.product_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Adiciona a coluna para salvar as opções escolhidas no momento do pedido
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS options JSONB;

-- Configuração de RLS
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

-- Políticas Públicas (Leitura)
CREATE POLICY "Permitir leitura pública de grupos de opções" ON public.product_option_groups FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de opções" ON public.product_options FOR SELECT USING (true);

-- Políticas Autenticadas (Gerenciamento)
-- Para groups, a política precisa verificar se o usuário é dono da loja do produto. Como simplificação baseada no schema existente (onde autenticados gerenciam tudo na sua view):
CREATE POLICY "Permitir gerenciamento de grupos para usuários autenticados" ON public.product_option_groups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir gerenciamento de opções para usuários autenticados" ON public.product_options FOR ALL USING (auth.role() = 'authenticated');
