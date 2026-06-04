-- Adiciona a coluna de preço original na tabela products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2);

-- Criação da tabela de Cupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' ou 'fixed'
    discount_value DECIMAL(10,2) NOT NULL,
    active BOOLEAN DEFAULT true,
    min_order_value DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(store_id, code)
);

-- Adiciona as colunas de cupom e desconto na tabela orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS coupon_code TEXT,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0.00;

-- Configuração de Row Level Security (RLS) para cupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para leitura (Público pode ler cupons ativos da loja para validar no checkout)
CREATE POLICY "Permitir leitura pública de cupons" ON public.coupons FOR SELECT USING (active = true);

-- Políticas de gerenciamento (Apenas usuários autenticados da loja)
CREATE POLICY "Permitir gerenciamento de cupons para usuários autenticados" ON public.coupons FOR ALL USING (auth.role() = 'authenticated');
