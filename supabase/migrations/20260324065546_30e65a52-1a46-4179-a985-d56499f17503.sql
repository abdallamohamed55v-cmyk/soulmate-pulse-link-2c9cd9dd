
-- Create conversation_members table for group chat
CREATE TABLE public.conversation_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

-- Create conversation_invites table
CREATE TABLE public.conversation_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_email TEXT,
  invite_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_by UUID REFERENCES auth.users(id),
  UNIQUE(invite_token)
);

ALTER TABLE public.conversation_invites ENABLE ROW LEVEL SECURITY;

-- Security definer function to check membership
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations WHERE id = p_conversation_id AND user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.conversation_members WHERE conversation_id = p_conversation_id AND user_id = p_user_id
  )
$$;

-- RLS for conversation_members
CREATE POLICY "Members can view conversation members"
ON public.conversation_members FOR SELECT
TO authenticated
USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Owner can insert members"
ON public.conversation_members FOR INSERT
TO authenticated
WITH CHECK (public.owns_conversation(conversation_id));

CREATE POLICY "Owner can delete members"
ON public.conversation_members FOR DELETE
TO authenticated
USING (public.owns_conversation(conversation_id));

-- RLS for conversation_invites
CREATE POLICY "Owner can manage invites"
ON public.conversation_invites FOR ALL
TO authenticated
USING (public.owns_conversation(conversation_id))
WITH CHECK (public.owns_conversation(conversation_id));

CREATE POLICY "Invited user can view own invites"
ON public.conversation_invites FOR SELECT
TO authenticated
USING (invite_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Allow members to read messages (update existing policy concept)
-- Members who joined via invite can also read/write messages
CREATE POLICY "Members can view conversation messages"
ON public.messages FOR SELECT
TO authenticated
USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Members can insert messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (public.is_conversation_member(conversation_id, auth.uid()));
