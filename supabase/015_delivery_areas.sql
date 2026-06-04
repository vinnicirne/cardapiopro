-- Criação da tabela de Áreas de Entrega
CREATE TABLE IF NOT EXISTS public.delivery_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estimated_time TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(store_id, name)
);

-- Configuração de Row Level Security (RLS)
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Permitir leitura pública de áreas de entrega" 
ON public.delivery_areas FOR SELECT USING (true);

CREATE POLICY "Permitir gerenciamento de áreas de entrega pelo dono da loja" 
ON public.delivery_areas FOR ALL 
USING (
  store_id IN (
    SELECT id FROM public.stores WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  store_id IN (
    SELECT id FROM public.stores WHERE owner_id = auth.uid()
  )
);
