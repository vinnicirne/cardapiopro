-- Extensão necessária para geração de UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criação da tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criação da tabela de Produtos
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criação da tabela de Pedidos (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, preparing, ready, delivered, cancelled
    order_type TEXT DEFAULT 'delivery', -- delivery ou pickup
    delivery_fee DECIMAL(10,2) DEFAULT 0.00,
    coupon_code TEXT,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Criação da tabela de Itens do Pedido (Order Items)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL, -- Preço no momento do pedido
    observations TEXT,
    options JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- Configuração de Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso para leitura (Catálogo público)
CREATE POLICY "Permitir leitura pública de categorias" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de produtos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de grupos de opções" ON public.product_option_groups FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de opções" ON public.product_options FOR SELECT USING (true);
CREATE POLICY "Permitir leitura pública de cupons" ON public.coupons FOR SELECT USING (active = true);

-- Políticas para criação de pedidos (Público pode criar)
CREATE POLICY "Permitir criação pública de pedidos" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir criação pública de itens do pedido" ON public.order_items FOR INSERT WITH CHECK (true);

-- Políticas de gerenciamento (Apenas usuários autenticados da loja)
CREATE POLICY "Permitir gerenciamento de categorias para usuários autenticados" ON public.categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir gerenciamento de produtos para usuários autenticados" ON public.products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir gerenciamento de pedidos para usuários autenticados" ON public.orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir gerenciamento de itens do pedido para usuários autenticados" ON public.order_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir gerenciamento de grupos de opções para usuários autenticados" ON public.product_option_groups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir gerenciamento de opções para usuários autenticados" ON public.product_options FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir gerenciamento de cupons para usuários autenticados" ON public.coupons FOR ALL USING (auth.role() = 'authenticated');
