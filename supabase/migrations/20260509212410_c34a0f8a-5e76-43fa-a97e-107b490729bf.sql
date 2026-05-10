
-- 1) message_reads: who read which message
CREATE TABLE IF NOT EXISTS public.message_reads (
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_conv ON public.message_reads(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user ON public.message_reads(user_id);

ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view reads in their conversations"
  ON public.message_reads FOR SELECT
  USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Users can mark messages as read for themselves"
  ON public.message_reads FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Users can delete their own read marks"
  ON public.message_reads FOR DELETE
  USING (auth.uid() = user_id);

-- 2) message_reactions: emoji reactions per user per message
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_msg ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_conv ON public.message_reactions(conversation_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view reactions in their conversations"
  ON public.message_reactions FOR SELECT
  USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Users can add their own reactions"
  ON public.message_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Users can delete their own reactions"
  ON public.message_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- 3) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
