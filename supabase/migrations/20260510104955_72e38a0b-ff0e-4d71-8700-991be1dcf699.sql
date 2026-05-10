
-- 1. contact_submissions: replace overly permissive policy
DROP POLICY IF EXISTS "Service role can manage contact_submissions" ON public.contact_submissions;

CREATE POLICY "Anyone can submit contact form"
ON public.contact_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Service role manages contact submissions"
ON public.contact_submissions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. chat_semantic_cache: remove cross-user read
DROP POLICY IF EXISTS "Cache read all" ON public.chat_semantic_cache;

CREATE POLICY "Service role manages cache"
ON public.chat_semantic_cache
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. slide-images: remove anon upload
DROP POLICY IF EXISTS "Service upload slide images" ON storage.objects;

-- 4. spreadsheets: add ownership check on DELETE
DROP POLICY IF EXISTS "Users can delete own spreadsheets" ON storage.objects;

CREATE POLICY "Users can delete own spreadsheets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'spreadsheets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Also constrain spreadsheet uploads to user folder
DROP POLICY IF EXISTS "Authenticated users can upload spreadsheets" ON storage.objects;

CREATE POLICY "Authenticated users can upload spreadsheets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'spreadsheets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own spreadsheets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'spreadsheets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. slide-presentations: add ownership and DELETE/UPDATE
DROP POLICY IF EXISTS "Users can upload slide presentations" ON storage.objects;

CREATE POLICY "Users can upload own slide presentations"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'slide-presentations'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own slide presentations"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'slide-presentations'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own slide presentations"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'slide-presentations'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
