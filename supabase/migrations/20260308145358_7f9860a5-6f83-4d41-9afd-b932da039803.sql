
-- service_status_public is a VIEW, enable RLS on it
ALTER VIEW public.service_status_public SET (security_invoker = true);

-- status_subscribers: replace open INSERT with authenticated-only
DROP POLICY IF EXISTS "Public can insert subscribers" ON public.status_subscribers;
CREATE POLICY "Authenticated subscribe" ON public.status_subscribers 
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete own" ON public.status_subscribers
  FOR DELETE TO authenticated USING (contact = (SELECT email FROM auth.users WHERE id = auth.uid()));
