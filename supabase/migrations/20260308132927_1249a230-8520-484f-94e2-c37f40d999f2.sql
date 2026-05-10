
-- 1. Trigger to protect profiles plan/credits columns from non-service_role updates
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow service_role to modify anything
  IF current_setting('role', true) = 'service_role' OR current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  
  -- Block changes to plan and credits for non-service_role
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'Cannot modify plan column directly';
  END IF;
  
  IF NEW.credits IS DISTINCT FROM OLD.credits THEN
    RAISE EXCEPTION 'Cannot modify credits column directly';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_columns();

-- 2. Fix withdrawal_requests INSERT policy to enforce status = 'pending'
DROP POLICY IF EXISTS "Users can insert own withdrawals" ON public.withdrawal_requests;
CREATE POLICY "Users can insert own withdrawals" ON public.withdrawal_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
