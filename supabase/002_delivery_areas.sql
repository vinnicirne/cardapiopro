-- Criação da tabela de Áreas de Entrega
CREATE TABLE IF NOT EXISTS public.delivery_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    fee DECIMAL(10,2) NOT NULL DEFAULT 0,
    estimated_time TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Configuração de Row Level Security (RLS)
ALTER TABLE public.delivery_areas ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para leitura
CREATE POLICY "Permitir leitura pública de áreas de entrega" ON public.delivery_areas
    FOR SELECT USING (true);

-- Políticas de gerenciamento (Apenas usuários autenticados)
CREATE POLICY "Permitir gerenciamento de áreas de entrega para usuários autenticados" ON public.delivery_areas
    FOR ALL USING (auth.role() = 'authenticated');
