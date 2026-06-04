-- Remove as políticas antigas para substituí-las
DROP POLICY IF EXISTS "Lojista pode fazer upload na sua pasta" ON storage.objects;
DROP POLICY IF EXISTS "Lojista pode atualizar arquivos na sua pasta" ON storage.objects;
DROP POLICY IF EXISTS "Lojista pode deletar arquivos na sua pasta" ON storage.objects;

-- Nova política: Permite o upload se o usuário for o dono da loja OU se ele for superadmin
CREATE POLICY "Lojista ou Admin pode fazer upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'store-assets' AND 
  (
    (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
    OR 
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id::text = (string_to_array(name, '/'))[1] 
      AND stores.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Lojista ou Admin pode atualizar" ON storage.objects FOR UPDATE USING (
  bucket_id = 'store-assets' AND 
  (
    (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
    OR 
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id::text = (string_to_array(name, '/'))[1] 
      AND stores.owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Lojista ou Admin pode deletar" ON storage.objects FOR DELETE USING (
  bucket_id = 'store-assets' AND 
  (
    (auth.jwt() -> 'user_metadata' ->> 'is_superadmin')::boolean = true
    OR 
    EXISTS (
      SELECT 1 FROM public.stores 
      WHERE stores.id::text = (string_to_array(name, '/'))[1] 
      AND stores.owner_id = auth.uid()
    )
  )
);
