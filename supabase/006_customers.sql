-- ==========================================
-- 7. CLIENTES (CUSTOMERS) - PARA REMARKETING E FACILIDADE
-- ==========================================
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT, -- Pode armazenar um JSON em string se precisar de mais detalhes como CEP, número, complemento
    is_blocked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_order_date TIMESTAMP WITH TIME ZONE,
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    
    UNIQUE (store_id, phone)
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lojista gerencia seus clientes" ON public.customers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.stores WHERE stores.id = customers.store_id AND stores.owner_id = auth.uid())
);

-- Permitir que o sistema (público) crie e leia clientes baseado no telefone para o checkout
CREATE POLICY "Permitir leitura publica por telefone" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Permitir inserção publica no checkout" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização publica no checkout" ON public.customers FOR UPDATE USING (true);


-- Adicionar customer_id opcional na tabela orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Função Trigger para atualizar as estatísticas do cliente quando um pedido é criado/atualizado
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.customer_id IS NOT NULL THEN
        UPDATE public.customers
        SET total_orders = total_orders + 1,
            total_spent = total_spent + NEW.total,
            last_order_date = NEW.created_at
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_stats
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION update_customer_stats();
