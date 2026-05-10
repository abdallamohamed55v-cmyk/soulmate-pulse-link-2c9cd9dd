ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ui_state jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_conversations_user_pinned
ON public.conversations (user_id, is_pinned DESC, pinned_at DESC, updated_at DESC);

CREATE TYPE public.memory_scope AS ENUM ('account', 'conversation', 'project', 'file', 'preference');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_memory_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  account_summary text,
  profile_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_memory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scope public.memory_scope NOT NULL,
  title text,
  summary text NOT NULL,
  source_conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  source_project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  relevance_score numeric(4,3) NOT NULL DEFAULT 0.500,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL UNIQUE REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  summary text NOT NULL,
  key_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_message_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_memory_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memory_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own memory profile" ON public.user_memory_profiles;
CREATE POLICY "Users can view own memory profile"
ON public.user_memory_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own memory profile" ON public.user_memory_profiles;
CREATE POLICY "Users can insert own memory profile"
ON public.user_memory_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own memory profile" ON public.user_memory_profiles;
CREATE POLICY "Users can update own memory profile"
ON public.user_memory_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own memory entries" ON public.user_memory_entries;
CREATE POLICY "Users can view own memory entries"
ON public.user_memory_entries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own memory entries" ON public.user_memory_entries;
CREATE POLICY "Users can insert own memory entries"
ON public.user_memory_entries
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    source_conversation_id IS NULL
    OR public.owns_conversation(source_conversation_id)
  )
  AND (
    source_project_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = source_project_id
        AND projects.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can update own memory entries" ON public.user_memory_entries;
CREATE POLICY "Users can update own memory entries"
ON public.user_memory_entries
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    source_conversation_id IS NULL
    OR public.owns_conversation(source_conversation_id)
  )
  AND (
    source_project_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.projects
      WHERE projects.id = source_project_id
        AND projects.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users can delete own memory entries" ON public.user_memory_entries;
CREATE POLICY "Users can delete own memory entries"
ON public.user_memory_entries
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own conversation summaries" ON public.conversation_summaries;
CREATE POLICY "Users can view own conversation summaries"
ON public.conversation_summaries
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own conversation summaries" ON public.conversation_summaries;
CREATE POLICY "Users can insert own conversation summaries"
ON public.conversation_summaries
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.owns_conversation(conversation_id)
);

DROP POLICY IF EXISTS "Users can update own conversation summaries" ON public.conversation_summaries;
CREATE POLICY "Users can update own conversation summaries"
ON public.conversation_summaries
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND public.owns_conversation(conversation_id)
);

DROP POLICY IF EXISTS "Users can delete own conversation summaries" ON public.conversation_summaries;
CREATE POLICY "Users can delete own conversation summaries"
ON public.conversation_summaries
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_memory_entries_user_scope
ON public.user_memory_entries (user_id, scope, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_memory_entries_conversation
ON public.user_memory_entries (source_conversation_id)
WHERE source_conversation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_user
ON public.conversation_summaries (user_id, updated_at DESC);

DROP TRIGGER IF EXISTS update_user_memory_profiles_updated_at ON public.user_memory_profiles;
CREATE TRIGGER update_user_memory_profiles_updated_at
BEFORE UPDATE ON public.user_memory_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_memory_entries_updated_at ON public.user_memory_entries;
CREATE TRIGGER update_user_memory_entries_updated_at
BEFORE UPDATE ON public.user_memory_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversation_summaries_updated_at ON public.conversation_summaries;
CREATE TRIGGER update_conversation_summaries_updated_at
BEFORE UPDATE ON public.conversation_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();