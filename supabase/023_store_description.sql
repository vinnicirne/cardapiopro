-- Adiciona o campo description na tabela stores
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS description TEXT;
