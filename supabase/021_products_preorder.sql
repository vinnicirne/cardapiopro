-- Adicionar colunas para produtos sob encomenda
ALTER TABLE public.products
ADD COLUMN is_preorder boolean DEFAULT false,
ADD COLUMN preorder_notice text;
