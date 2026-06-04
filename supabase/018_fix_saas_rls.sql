-- Remove as políticas antigas que estavam com e-mail fixo
DROP POLICY IF EXISTS "Superadmin tem acesso total aos planos" ON public.plans;
DROP POLICY IF EXISTS "Superadmin tem acesso total as assinaturas" ON public.subscriptions;

-- Cria as políticas corretas baseadas na tag is_superadmin do JWT (mesmo padrão das lojas)
CREATE POLICY "Superadmin tem acesso total aos planos" ON public.plans FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
);

CREATE POLICY "Superadmin tem acesso total as assinaturas" ON public.subscriptions FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
);
