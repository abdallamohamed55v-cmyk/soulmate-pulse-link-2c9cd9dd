
-- 1. Add user_id to conversations
ALTER TABLE public.conversations ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Backfill existing conversations with first authenticated user (optional safety)
-- Skip backfill - existing convos will be accessible only via share links

-- 3. Drop insecure policies on conversations
DROP POLICY IF EXISTS "Allow all on conversations" ON public.conversations;

-- 4. Create proper user-scoped policies for conversations
CREATE POLICY "Users can manage own conversations" ON public.conversations
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Drop insecure policies on messages
DROP POLICY IF EXISTS "Allow all on messages" ON public.messages;

-- 6. Create helper function for message access
CREATE OR REPLACE FUNCTION public.owns_conversation(p_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id AND user_id = auth.uid()
  )
$$;

-- 7. Create proper policies for messages
CREATE POLICY "Users can manage own messages" ON public.messages
FOR ALL TO authenticated
USING (public.owns_conversation(conversation_id))
WITH CHECK (public.owns_conversation(conversation_id));

-- 8. Drop insecure policies on memories
DROP POLICY IF EXISTS "Allow all on memories" ON public.memories;
-- memories: no anon/authenticated access, only service_role

-- 9. Fix credit_transactions INSERT policy (currently WITH CHECK true - anyone can insert)
DROP POLICY IF EXISTS "Service role can insert transactions" ON public.credit_transactions;
-- No replacement needed - deduct_credits function uses SECURITY DEFINER

-- 10. Fix email_logs INSERT policy
DROP POLICY IF EXISTS "Service role can insert email logs" ON public.email_logs;
-- No replacement needed - edge functions use service_role

-- 11. Fix notifications INSERT policy  
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
-- No replacement needed - create_notification function uses SECURITY DEFINER

-- 12. Fix status_subscribers read policy (emails exposed)
DROP POLICY IF EXISTS "Public can read subscribers" ON public.status_subscribers;
