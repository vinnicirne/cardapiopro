-- Permitir que clientes públicos leiam seus próprios pedidos (filtrado no frontend, mas aberto no RLS)
CREATE POLICY "Leitura pública de pedidos" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Leitura pública de itens do pedido" ON public.order_items FOR SELECT USING (true);
