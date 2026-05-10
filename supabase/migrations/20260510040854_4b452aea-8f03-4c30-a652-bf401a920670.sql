
-- Persona, Knowledge Graph, Cache, Citations, Followups
CREATE TABLE IF NOT EXISTS public.user_chat_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  persona text NOT NULL DEFAULT 'default',
  preferred_dialect text,
  preferred_language text,
  enable_followups boolean NOT NULL DEFAULT true,
  enable_pii_redaction boolean NOT NULL DEFAULT true,
  enable_semantic_cache boolean NOT NULL DEFAULT true,
  enable_citations boolean NOT NULL DEFAULT true,
  learning_mode_default boolean NOT NULL DEFAULT false,
  custom_instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_knowledge_graph (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity text NOT NULL,
  entity_type text NOT NULL,
  relation text,
  target_entity text,
  confidence numeric(4,3) NOT NULL DEFAULT 0.700,
  source_message_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entity, relation, target_entity)
);
CREATE INDEX IF NOT EXISTS idx_kg_user_entity ON public.user_knowledge_graph(user_id, entity);

CREATE TABLE IF NOT EXISTS public.chat_semantic_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash text NOT NULL,
  query_text text NOT NULL,
  query_embedding jsonb,
  response text NOT NULL,
  model text,
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE (query_hash)
);
CREATE INDEX IF NOT EXISTS idx_cache_hash ON public.chat_semantic_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON public.chat_semantic_cache(expires_at);

CREATE TABLE IF NOT EXISTS public.chat_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  index_num integer NOT NULL,
  title text,
  url text,
  snippet text,
  source_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_citations_message ON public.chat_citations(message_id);

CREATE TABLE IF NOT EXISTS public.chat_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_followups_message ON public.chat_followups(message_id);

CREATE TABLE IF NOT EXISTS public.chat_router_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  user_text text,
  routed jsonb NOT NULL DEFAULT '{}'::jsonb,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_router_user ON public.chat_router_logs(user_id, created_at DESC);

ALTER TABLE public.user_chat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_knowledge_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_semantic_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_router_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chat settings" ON public.user_chat_settings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own KG" ON public.user_knowledge_graph
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service inserts KG" ON public.user_knowledge_graph
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own KG" ON public.user_knowledge_graph
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Cache is shared (anonymous queries) — read open, write via service role only
CREATE POLICY "Cache read all" ON public.chat_semantic_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users view own citations" ON public.chat_citations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own citations" ON public.chat_citations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own followups" ON public.chat_followups
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own followups" ON public.chat_followups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own router logs" ON public.chat_router_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_chat_settings_updated
  BEFORE UPDATE ON public.user_chat_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
