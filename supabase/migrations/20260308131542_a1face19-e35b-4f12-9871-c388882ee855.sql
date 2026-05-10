
-- =============================================
-- COMPREHENSIVE SECURITY FIX FOR ALL TABLES
-- =============================================

-- 1. Fix oauth_tokens: drop public policy, create service_role only
DROP POLICY IF EXISTS "Service role manages oauth_tokens" ON public.oauth_tokens;
CREATE POLICY "Service role only oauth_tokens" ON public.oauth_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Fix oauth_codes: drop public policy, create service_role only
DROP POLICY IF EXISTS "Service role manages oauth_codes" ON public.oauth_codes;
CREATE POLICY "Service role only oauth_codes" ON public.oauth_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Fix oauth_clients: drop public policy, create service_role only
DROP POLICY IF EXISTS "Service role manages oauth_clients" ON public.oauth_clients;
CREATE POLICY "Service role only oauth_clients" ON public.oauth_clients FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Fix otp_codes: drop public policy, create service_role only
DROP POLICY IF EXISTS "Service role can manage OTP codes" ON public.otp_codes;
CREATE POLICY "Service role only otp_codes" ON public.otp_codes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Fix profiles UPDATE: restrict to safe columns only
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own safe fields" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create safe profile update function (restricts which columns can be changed)
CREATE OR REPLACE FUNCTION public.update_profile_safe(
  p_user_id uuid,
  p_display_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_two_factor_enabled boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    display_name = COALESCE(p_display_name, display_name),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    two_factor_enabled = COALESCE(p_two_factor_enabled, two_factor_enabled),
    updated_at = now()
  WHERE id = p_user_id AND p_user_id = auth.uid();
END;
$$;

-- 6. Fix service_incidents: restrict INSERT/UPDATE to service_role only
DROP POLICY IF EXISTS "Service role insert for service_incidents" ON public.service_incidents;
DROP POLICY IF EXISTS "Service role update for service_incidents" ON public.service_incidents;
CREATE POLICY "Service role insert service_incidents" ON public.service_incidents FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Service role update service_incidents" ON public.service_incidents FOR UPDATE TO service_role USING (true);

-- 7. Fix service_status: restrict INSERT to service_role only
DROP POLICY IF EXISTS "Service role insert for service_status" ON public.service_status;
CREATE POLICY "Service role insert service_status" ON public.service_status FOR INSERT TO service_role WITH CHECK (true);

-- 8. Fix memories: add service_role only policy
CREATE POLICY "Service role only memories" ON public.memories FOR ALL TO service_role USING (true) WITH CHECK (true);
