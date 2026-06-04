-- Adiciona o campo de WhatsApp na loja
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS phone TEXT;
