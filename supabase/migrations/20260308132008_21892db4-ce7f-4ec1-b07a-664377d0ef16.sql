
-- Revoke UPDATE on sensitive columns from authenticated/anon roles
-- Only allow updating safe columns
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (display_name, avatar_url, two_factor_enabled, updated_at) ON public.profiles TO authenticated;
