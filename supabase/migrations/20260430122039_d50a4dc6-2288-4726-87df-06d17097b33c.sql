-- Add columns to projects for Webly integration
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS webly_project_id text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS repo_url text;

-- Per-user / per-project integrations (GitHub token, Supabase backend config)
CREATE TABLE IF NOT EXISTS public.code_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('github','supabase')),
  -- GitHub: { access_token, login, avatar_url }
  -- Supabase: { url, anon_key }
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, project_id, provider)
);

ALTER TABLE public.code_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own integrations"
  ON public.code_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own integrations"
  ON public.code_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own integrations"
  ON public.code_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own integrations"
  ON public.code_integrations FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_code_integrations_updated_at
  BEFORE UPDATE ON public.code_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_code_integrations_user_provider
  ON public.code_integrations(user_id, provider);