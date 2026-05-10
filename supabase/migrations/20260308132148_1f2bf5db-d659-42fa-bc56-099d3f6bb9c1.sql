
-- Fix service_status: restrict public SELECT to safe columns only via a view
-- Drop the public read policy and create authenticated-only read
DROP POLICY IF EXISTS "Public read access for service_status" ON public.service_status;
CREATE POLICY "Authenticated read service_status" ON public.service_status FOR SELECT TO authenticated USING (true);
