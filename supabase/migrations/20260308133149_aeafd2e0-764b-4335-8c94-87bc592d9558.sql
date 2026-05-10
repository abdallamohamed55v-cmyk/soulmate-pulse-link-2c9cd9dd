
-- 1. Fix search_path on protect_profile_columns
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'Cannot modify plan column directly';
  END IF;
  
  IF NEW.credits IS DISTINCT FROM OLD.credits THEN
    RAISE EXCEPTION 'Cannot modify credits column directly';
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Fix service_status: replace authenticated read with sanitized view
DROP POLICY IF EXISTS "Authenticated read service_status" ON public.service_status;
CREATE POLICY "Service role read service_status" ON public.service_status FOR SELECT TO service_role USING (true);

-- Create a sanitized view for authenticated users
CREATE OR REPLACE VIEW public.service_status_public AS
SELECT service_name, status, checked_at, response_time_ms
FROM public.service_status;

-- Grant access to the view
GRANT SELECT ON public.service_status_public TO authenticated;
