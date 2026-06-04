-- 1. Criação da tabela Stores (Restaurantes/Lojistas)
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Adicionar store_id nas tabelas existentes e atualizar políticas (RLS)
-- Deleta políticas antigas
DROP POLICY IF EXISTS "Permitir gerenciamento de categorias para usuários autenticados" ON public.categories;
DROP POLICY IF EXISTS "Permitir gerenciamento de produtos para usuários autenticados" ON public.products;
DROP POLICY IF EXISTS "Permitir gerenciamento de pedidos para usuários autenticados" ON public.orders;
DROP POLICY IF EXISTS "Permitir gerenciamento de itens do pedido para usuários autenticados" ON public.order_items;
DROP POLICY IF EXISTS "Permitir gerenciamento de áreas de entrega para usuários autenticados" ON public.delivery_areas;

-- Adiciona coluna store_id
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.delivery_areas ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Atualizar RLS da tabela Stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lojista pode ler sua própria loja" ON public.stores FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Lojista pode editar sua própria loja" ON public.stores FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Lojista pode criar sua loja" ON public.stores FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Leitura pública de lojas (para acessar o cardápio)
CREATE POLICY "Leitura pública de lojas" ON public.stores FOR SELECT USING (true);

-- Novas políticas de gerenciamento (Isolamento por Loja)
-- Um usuário só gerencia dados se a store_id pertencer a uma store onde ele é owner_id
CREATE POLICY "Lojista gerencia suas categorias" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.stores WHERE stores.id = categories.store_id AND stores.owner_id = auth.uid())
);
CREATE POLICY "Lojista gerencia seus produtos" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.stores WHERE stores.id = products.store_id AND stores.owner_id = auth.uid())
);
CREATE POLICY "Lojista gerencia seus pedidos" ON public.orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.stores WHERE stores.id = orders.store_id AND stores.owner_id = auth.uid())
);
CREATE POLICY "Lojista gerencia seus itens de pedido" ON public.order_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.stores WHERE stores.id = order_items.store_id AND stores.owner_id = auth.uid())
);
CREATE POLICY "Lojista gerencia suas áreas de entrega" ON public.delivery_areas FOR ALL USING (
  EXISTS (SELECT 1 FROM public.stores WHERE stores.id = delivery_areas.store_id AND stores.owner_id = auth.uid())
);


-- 3. Criação do Usuário e Loja "Admin" para Testes
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  new_user_id UUID := '00000000-0000-0000-0000-000000000000';
  new_store_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@admin.com') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@admin.com',
      crypt('admin', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{}',
      now(),
      now(),
      'authenticated',
      '',
      '',
      '',
      ''
    );
    
    INSERT INTO public.stores (id, owner_id, name, slug)
    VALUES (new_store_id, new_user_id, 'Loja Admin', 'admin');
    
    -- Atualiza dados mockados antigos caso existam para pertencer à loja do admin
    UPDATE public.categories SET store_id = new_store_id WHERE store_id IS NULL;
    UPDATE public.products SET store_id = new_store_id WHERE store_id IS NULL;
    UPDATE public.orders SET store_id = new_store_id WHERE store_id IS NULL;
    UPDATE public.order_items SET store_id = new_store_id WHERE store_id IS NULL;
    UPDATE public.delivery_areas SET store_id = new_store_id WHERE store_id IS NULL;
    
  END IF;
END $$;
