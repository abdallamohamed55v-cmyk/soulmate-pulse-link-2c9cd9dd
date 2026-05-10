-- Research sessions persistence (backend storage instead of sessionStorage)
CREATE TABLE IF NOT EXISTS public.research_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  session_key text NOT NULL,
  query text NOT NULL,
  report text NOT NULL DEFAULT '',
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, session_key)
);

ALTER TABLE public.research_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own research reports" ON public.research_reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own research reports" ON public.research_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own research reports" ON public.research_reports
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own research reports" ON public.research_reports
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_research_reports_user_created ON public.research_reports(user_id, created_at DESC);

CREATE TRIGGER update_research_reports_updated_at
  BEFORE UPDATE ON public.research_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Shopping product reports cache
CREATE TABLE IF NOT EXISTS public.shopping_product_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_key text NOT NULL,
  product_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_report text NOT NULL DEFAULT '',
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_product_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own product reports" ON public.shopping_product_reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own product reports" ON public.shopping_product_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_shopping_product_reports_user ON public.shopping_product_reports(user_id, created_at DESC);