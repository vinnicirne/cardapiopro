-- Adiciona a coluna de taxa de entrega na tabela stores
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0.00;

-- Adiciona as colunas de tipo de pedido e taxa cobrada na tabela orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'delivery',
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0.00;
