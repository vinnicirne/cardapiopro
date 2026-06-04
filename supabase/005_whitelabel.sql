-- 1. Criação da tabela de configurações globais
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    platform_name TEXT NOT NULL DEFAULT 'SaaS Cardápio',
    logo_url TEXT,
    primary_color TEXT NOT NULL DEFAULT '#ea580c', -- orange-600
    landing_title TEXT NOT NULL DEFAULT 'Transforme seu negócio com um Cardápio Digital',
    landing_subtitle TEXT NOT NULL DEFAULT 'Crie sua loja em minutos, receba pedidos no WhatsApp e aumente suas vendas sem pagar taxas abusivas.',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    -- Garante que exista apenas uma linha
    CONSTRAINT single_row CHECK (id = 1)
);

-- 2. Inserir a linha padrão caso não exista
INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3. Habilitar RLS e criar políticas
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Leitura pública permitida para que a Landing Page e o Login carreguem as cores e textos
CREATE POLICY "Leitura pública das configurações" ON public.platform_settings FOR SELECT USING (true);

-- Apenas superadmin pode alterar
CREATE POLICY "Superadmin pode alterar configurações" ON public.platform_settings FOR UPDATE USING (
  (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
);

CREATE POLICY "Superadmin pode inserir configurações (fallback)" ON public.platform_settings FOR INSERT WITH CHECK (
  (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
);

-- 4. Criação do Bucket de Storage (Se não existir, terá que ser criado manualmente no painel)
-- Abaixo tentaremos criar via SQL (disponível em algumas versões do Supabase)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('platform-assets', 'platform-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas do Bucket de Storage
CREATE POLICY "Leitura pública de arquivos da plataforma" ON storage.objects FOR SELECT USING (
  bucket_id = 'platform-assets'
);

CREATE POLICY "Superadmin pode fazer upload de arquivos da plataforma" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'platform-assets' AND (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
);

CREATE POLICY "Superadmin pode deletar/atualizar arquivos da plataforma" ON storage.objects FOR UPDATE USING (
  bucket_id = 'platform-assets' AND (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
);
CREATE POLICY "Superadmin pode deletar arquivos da plataforma" ON storage.objects FOR DELETE USING (
  bucket_id = 'platform-assets' AND (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
);
