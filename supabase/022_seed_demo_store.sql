-- ==========================================
-- SCRIPT: LOJA DE DEMONSTRAÇÃO
-- Cria uma loja pública sem owner_id para que 
-- qualquer um possa testar o app sem cadastro
-- ==========================================

DO $$
DECLARE
  v_store_id UUID := 'de300000-0000-0000-0000-000000000000';
  v_cat_lanches UUID := 'ca711111-0000-0000-0000-000000000000';
  v_cat_bebidas UUID := 'ca722222-0000-0000-0000-000000000000';
BEGIN
  -- Se a loja 'demo' não existir, cria a loja e os produtos
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE slug = 'demo') THEN
    
    -- Inserir loja
    INSERT INTO public.stores (id, owner_id, name, slug)
    VALUES (
      v_store_id, 
      NULL, -- Sem dono, portanto ineditável via RLS do painel
      'Cardápio Pro (Demonstração)', 
      'demo'
    );

    -- Inserir Categorias
    INSERT INTO public.categories (id, store_id, name)
    VALUES 
      (v_cat_lanches, v_store_id, 'Smash Burgers'),
      (v_cat_bebidas, v_store_id, 'Bebidas Geladas');

    -- Inserir Produtos
    INSERT INTO public.products (store_id, category_id, name, description, price, original_price, image_url, is_preorder)
    VALUES 
      (v_store_id, v_cat_lanches, 'Smash Pro Duplo', 'Dois blends de 90g de costela, muito cheddar derretido, bacon crocante, maionese da casa no pão brioche selado na manteiga.', 32.90, 39.90, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=600&auto=format&fit=crop', false),
      (v_store_id, v_cat_lanches, 'Chicken Supreme', 'Sobrecoxa empanada super crocante, alface americana, picles artesanal e molho honey mustard no pão de gergelim.', 28.50, NULL, 'https://images.unsplash.com/photo-1615719413546-198b25453f85?q=80&w=600&auto=format&fit=crop', false),
      (v_store_id, v_cat_lanches, 'Caixa com 10 Mini Burgers (Sob Encomenda)', 'Ideal para festas. 10 mini smash burgers com cheddar. Necessário encomendar com 24h de antecedência.', 120.00, 140.00, 'https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=600&auto=format&fit=crop', true),
      
      (v_store_id, v_cat_bebidas, 'Refrigerante Cola Lata 350ml', 'Geladíssimo.', 6.50, NULL, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=600&auto=format&fit=crop', false),
      (v_store_id, v_cat_bebidas, 'Milkshake de Morango 400ml', 'Feito com sorvete artesanal, morangos frescos e muita calda.', 18.90, NULL, 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?q=80&w=600&auto=format&fit=crop', false);
      
    -- Inserir Horário Falso (Sempre Aberta)
    -- NOTA: Você pode precisar ajustar dependendo da estrutura exata de store_hours se existir
    INSERT INTO public.store_hours (store_id, day_of_week, open_time, close_time, is_closed)
    VALUES 
      (v_store_id, 0, '00:00', '23:59', false),
      (v_store_id, 1, '00:00', '23:59', false),
      (v_store_id, 2, '00:00', '23:59', false),
      (v_store_id, 3, '00:00', '23:59', false),
      (v_store_id, 4, '00:00', '23:59', false),
      (v_store_id, 5, '00:00', '23:59', false),
      (v_store_id, 6, '00:00', '23:59', false);

  END IF;
END $$;
