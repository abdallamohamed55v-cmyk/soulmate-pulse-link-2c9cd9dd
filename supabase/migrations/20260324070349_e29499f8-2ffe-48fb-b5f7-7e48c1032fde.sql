
-- Drop the problematic policy that queries auth.users directly
DROP POLICY IF EXISTS "Invited user can view own invites" ON public.conversation_invites;

-- Create a security definer function to check invite email
CREATE OR REPLACE FUNCTION public.is_invite_for_current_user(p_invite_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_invite_email = (SELECT email FROM auth.users WHERE id = auth.uid())
$$;

-- Recreate policy using the function
CREATE POLICY "Invited user can view own invites"
ON public.conversation_invites FOR SELECT
TO authenticated
USING (public.is_invite_for_current_user(invite_email));
