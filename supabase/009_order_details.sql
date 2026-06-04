-- Adiciona os campos faltantes na tabela de pedidos
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS change_for DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS delivery_address TEXT;
