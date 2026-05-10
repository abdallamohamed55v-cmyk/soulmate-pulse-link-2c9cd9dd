
CREATE TABLE public.generated_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Untitled Site',
  prompt text NOT NULL,
  jsx_code text,
  html_compiled text,
  model_used text,
  tokens_used integer DEFAULT 0,
  share_slug text UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  is_public boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'generating',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sites" ON public.generated_sites
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view shared sites" ON public.generated_sites
  FOR SELECT TO anon, authenticated
  USING (is_public = true);

CREATE INDEX idx_generated_sites_user ON public.generated_sites(user_id, created_at DESC);
CREATE INDEX idx_generated_sites_slug ON public.generated_sites(share_slug);

CREATE TRIGGER update_generated_sites_updated_at
  BEFORE UPDATE ON public.generated_sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
