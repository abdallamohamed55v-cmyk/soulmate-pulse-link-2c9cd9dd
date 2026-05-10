-- Remove the UPDATE policy entirely - all updates go through update_profile_safe RPC
DROP POLICY IF EXISTS "Users can update own safe fields" ON public.profiles;