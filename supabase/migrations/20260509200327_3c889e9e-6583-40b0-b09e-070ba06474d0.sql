
-- 1. Track sender on messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);

-- 2. Lookup invite by token (bypasses RLS, returns minimal safe fields)
CREATE OR REPLACE FUNCTION public.get_invite_details(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_conv record;
  v_prof record;
  v_count integer;
BEGIN
  SELECT id, conversation_id, invited_by, invite_email, status, expires_at
    INTO v_invite
    FROM public.conversation_invites
    WHERE invite_token = p_token;

  IF v_invite.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;
  IF v_invite.status <> 'pending' THEN
    RETURN jsonb_build_object('error', 'already_used');
  END IF;
  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;

  SELECT title, mode INTO v_conv FROM public.conversations WHERE id = v_invite.conversation_id;
  SELECT display_name, avatar_url INTO v_prof FROM public.profiles WHERE id = v_invite.invited_by;
  SELECT count(*) INTO v_count FROM public.conversation_members WHERE conversation_id = v_invite.conversation_id;

  RETURN jsonb_build_object(
    'invite_id', v_invite.id,
    'conversation_id', v_invite.conversation_id,
    'invite_email', v_invite.invite_email,
    'conversation_title', COALESCE(v_conv.title, 'Conversation'),
    'conversation_mode', COALESCE(v_conv.mode, 'chat'),
    'inviter_name', v_prof.display_name,
    'inviter_avatar', v_prof.avatar_url,
    'member_count', COALESCE(v_count, 0) + 1
  );
END;
$$;

-- 3. Accept invite (auth required)
CREATE OR REPLACE FUNCTION public.accept_conversation_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite record;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'auth_required');
  END IF;

  SELECT id, conversation_id, status, expires_at INTO v_invite
    FROM public.conversation_invites WHERE invite_token = p_token;

  IF v_invite.id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF v_invite.status <> 'pending' THEN RETURN jsonb_build_object('success', false, 'error', 'already_used'); END IF;
  IF v_invite.expires_at < now() THEN RETURN jsonb_build_object('success', false, 'error', 'expired'); END IF;

  INSERT INTO public.conversation_members (conversation_id, user_id, role)
    VALUES (v_invite.conversation_id, v_user, 'member')
    ON CONFLICT DO NOTHING;

  UPDATE public.conversation_invites
    SET status = 'accepted', accepted_by = v_user
    WHERE id = v_invite.id;

  RETURN jsonb_build_object('success', true, 'conversation_id', v_invite.conversation_id);
END;
$$;
