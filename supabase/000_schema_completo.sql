-- EXTENSÕES E UTILITÁRIOS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 0. LIMPANDO O BANCO DE DADOS (RESET)
-- ATENÇÃO: Isso apagará os dados das tabelas abaixo para recriá-las com a estrutura correta.
-- ==========================================
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.delivery_areas CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.stores CASCADE;

-- ==========================================
-- 1. LOJAS (STORES - MULTI-TENANCY)
-- ==========================================
CREATE TABLE public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de lojas" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Lojista pode editar sua própria loja" ON public.stores FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Lojista pode criar sua loja" ON public.stores FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- ==========================================
-- 2. CATEGORIAS
-- ==========================================
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de categorias" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Lojista gerencia suas categorias" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.stores WHERE stores.id = categories.store_id AND stores.owner_id = auth.uid())
);

-- ==========================================
-- 3. PRODUTOS
-- ==========================================
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de produtos" ON public.products FOR SELECT USING (true);
CREATE POLICY "Lojista gerencia seus produtos" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.owner_id = auth.uid())
);

-- ==========================================
-- 4. ÁREAS DE ENTREGA
-- ==========================================
CREATE TABLE public.delivery_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    estimated_time TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública de áreas de entrega" ON public.delivery_areas FOR SELECT USING (true);
CREATE POLICY "Lojista gerencia suas áreas de entrega" ON public.delivery_areas FOR ALL USING (
  EXISTS (SELECT 1 FROM public.stores WHERE stores.id = delivery_areas.store_id AND stores.owner_id = auth.uid())
);

-- ==========================================
-- 5. PEDIDOS E ITENS DO PEDIDO
-- ==========================================
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir criação pública de pedidos" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir criação pública de itens" ON public.order_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Lojista gerencia seus pedidos" ON public.orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid())
);
CREATE POLICY "Lojista gerencia itens dos seus pedidos" ON public.order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.stores WHERE stores.id = order_items.store_id AND stores.owner_id = auth.uid())
);

-- ==========================================
-- 6. CRIAÇÃO DO USUÁRIO ADMIN E LOJA TESTE
-- ==========================================
DO $$
DECLARE
  new_user_id UUID := '00000000-0000-0000-0000-000000000000';
  new_store_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@admin.com') THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
      role, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      new_user_id, '00000000-0000-0000-0000-000000000000', 'admin@admin.com', 
      crypt('admin', gen_salt('bf')), now(), 
      '{"provider": "email", "providers": ["email"]}', '{}', now(), now(), 
      'authenticated', '', '', '', ''
    );
    
    INSERT INTO public.stores (id, owner_id, name, slug)
    VALUES (new_store_id, new_user_id, 'Loja Admin', 'admin');
  END IF;
END $$;
