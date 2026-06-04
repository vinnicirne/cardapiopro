-- Inserir o plano Iniciante (Grátis)
INSERT INTO public.plans (name, description, price, max_products, features, active)
VALUES (
    'Iniciante',
    'Para quem está começando agora.',
    0.00,
    -1, -- Ilimitado
    '["Até 50 pedidos/mês", "Integração WhatsApp", "Painel de controle básico", "Cardápio online (com anúncios)"]'::jsonb,
    true
);

-- Inserir o plano Profissional
INSERT INTO public.plans (name, description, price, max_products, features, active)
VALUES (
    'Profissional',
    'Tudo que você precisa para escalar.',
    49.00,
    -1, -- Ilimitado
    '["Pedidos ilimitados", "Sem taxa por pedido", "Gestão de Áreas de Entrega", "Painel de Gestão Completo", "Sem anúncios"]'::jsonb,
    true
);
