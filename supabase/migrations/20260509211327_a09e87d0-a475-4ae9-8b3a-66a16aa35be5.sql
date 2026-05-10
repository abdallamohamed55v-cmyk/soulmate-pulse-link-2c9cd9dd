CREATE OR REPLACE FUNCTION public.accept_conversation_invite(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Bump conversation so it appears at the top of the joiner's recent list
  UPDATE public.conversations
    SET updated_at = now()
    WHERE id = v_invite.conversation_id;

  RETURN jsonb_build_object('success', true, 'conversation_id', v_invite.conversation_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.bump_conversation(p_conversation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF NOT public.is_conversation_member(p_conversation_id, auth.uid()) THEN RETURN; END IF;
  UPDATE public.conversations SET updated_at = now() WHERE id = p_conversation_id;
END;
$function$;