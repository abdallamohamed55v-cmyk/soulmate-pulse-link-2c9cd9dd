CREATE TABLE public.headshot_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gender TEXT DEFAULT 'both',
  prompt TEXT NOT NULL,
  preview_url TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.headshot_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active headshot templates" ON public.headshot_templates
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Service role manages headshot templates" ON public.headshot_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);