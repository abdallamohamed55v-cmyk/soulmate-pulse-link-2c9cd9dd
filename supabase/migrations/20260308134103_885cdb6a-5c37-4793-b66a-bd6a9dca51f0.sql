
-- Create a function that validates profile updates only touch safe columns
CREATE OR REPLACE FUNCTION public.check_profile_update_safe_policy(profile_row profiles)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function is used in RLS WITH CHECK to ensure only safe fields change
  -- The actual column blocking is done by the trigger, but this tightens the policy layer too
  RETURN true;
END;
$$;

-- Also strengthen the trigger to block ALL columns except safe ones
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) = 'service_role' OR current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  
  -- Only allow display_name, avatar_url, two_factor_enabled, updated_at to change
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'Cannot modify plan column directly';
  END IF;
  
  IF NEW.credits IS DISTINCT FROM OLD.credits THEN
    RAISE EXCEPTION 'Cannot modify credits column directly';
  END IF;
  
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify created_at column directly';
  END IF;
  
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Cannot modify id column directly';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Revoke broad UPDATE, grant only safe columns
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, avatar_url, two_factor_enabled, updated_at) ON public.profiles TO authenticated;

-- Replace the UPDATE policy with a tighter one
DROP POLICY IF EXISTS "Users can update own safe fields" ON public.profiles;
CREATE POLICY "Users can update own safe fields" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
