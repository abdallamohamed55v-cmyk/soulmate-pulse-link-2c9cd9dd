
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Extend ai_personalization with tone, language, interests, tier
ALTER TABLE public.ai_personalization
  ADD COLUMN IF NOT EXISTS tone_formality int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS tone_verbosity int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS tone_creativity int NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS language_style text NOT NULL DEFAULT 'mixed',
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_tier text NOT NULL DEFAULT 'lite';

-- Long-term memory table
CREATE TABLE IF NOT EXISTS public.user_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fact text NOT NULL,
  importance int NOT NULL DEFAULT 5,
  embedding vector(768),
  source text DEFAULT 'auto',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own memories"
  ON public.user_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own memories"
  ON public.user_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own memories"
  ON public.user_memories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users delete own memories"
  ON public.user_memories FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_memories_user ON public.user_memories(user_id, importance DESC, created_at DESC);

-- RAG attachment chunks
CREATE TABLE IF NOT EXISTS public.attachment_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conversation_id uuid,
  file_name text,
  chunk_index int NOT NULL DEFAULT 0,
  content text NOT NULL,
  embedding vector(768),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attachment_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own chunks"
  ON public.attachment_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own chunks"
  ON public.attachment_chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own chunks"
  ON public.attachment_chunks FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_attachment_chunks_user ON public.attachment_chunks(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_attachment_chunks_embedding ON public.attachment_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Search functions for vector retrieval
CREATE OR REPLACE FUNCTION public.search_user_memories(p_user_id uuid, p_query_embedding vector(768), p_match_count int DEFAULT 10)
RETURNS TABLE(id uuid, fact text, importance int, similarity float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.id, m.fact, m.importance, 1 - (m.embedding <=> p_query_embedding) AS similarity
  FROM public.user_memories m
  WHERE m.user_id = p_user_id AND m.embedding IS NOT NULL
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;

CREATE OR REPLACE FUNCTION public.search_attachment_chunks(p_user_id uuid, p_conversation_id uuid, p_query_embedding vector(768), p_match_count int DEFAULT 5)
RETURNS TABLE(id uuid, file_name text, chunk_index int, content text, similarity float)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, c.file_name, c.chunk_index, c.content, 1 - (c.embedding <=> p_query_embedding) AS similarity
  FROM public.attachment_chunks c
  WHERE c.user_id = p_user_id
    AND (p_conversation_id IS NULL OR c.conversation_id = p_conversation_id)
    AND c.embedding IS NOT NULL
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT p_match_count;
$$;
