-- 1. Adicionar coluna owner_email na tabela stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- 2. Regras de Segurança (RLS) para o Superadmin
-- Permite que qualquer pessoa com a tag 'is_superadmin': true no JWT tenha acesso total às lojas

CREATE POLICY "Superadmin pode ver todas as lojas" ON public.stores FOR SELECT USING (
  (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
);

CREATE POLICY "Superadmin pode editar todas as lojas" ON public.stores FOR UPDATE USING (
  (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
);

CREATE POLICY "Superadmin pode deletar lojas" ON public.stores FOR DELETE USING (
  (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
);

-- (Opcional) Podemos criar regras parecidas para as outras tabelas se o superadmin precisar ver produtos/categorias futuramente.
