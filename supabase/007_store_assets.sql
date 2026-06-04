-- ==========================================
-- 8. ASSETS DA LOJA (LOGO E CAPA)
-- ==========================================

-- Adiciona colunas para as imagens na tabela stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Criação do Bucket de Storage para os assets das lojas
INSERT INTO storage.buckets (id, name, public) 
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas do Bucket de Storage
CREATE POLICY "Leitura pública de arquivos das lojas" ON storage.objects FOR SELECT USING (
  bucket_id = 'store-assets'
);

-- Permite ao dono da loja subir/alterar/deletar arquivos apenas na pasta correspondente ao seu store_id
-- O caminho do arquivo será formatado como: store_id/nome-do-arquivo.extensao
CREATE POLICY "Lojista pode fazer upload na sua pasta" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'store-assets' AND 
  (EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id::text = (string_to_array(name, '/'))[1] 
      AND stores.owner_id = auth.uid()
  ))
);

CREATE POLICY "Lojista pode atualizar arquivos na sua pasta" ON storage.objects FOR UPDATE USING (
  bucket_id = 'store-assets' AND 
  (EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id::text = (string_to_array(name, '/'))[1] 
      AND stores.owner_id = auth.uid()
  ))
);

CREATE POLICY "Lojista pode deletar arquivos na sua pasta" ON storage.objects FOR DELETE USING (
  bucket_id = 'store-assets' AND 
  (EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id::text = (string_to_array(name, '/'))[1] 
      AND stores.owner_id = auth.uid()
  ))
);
