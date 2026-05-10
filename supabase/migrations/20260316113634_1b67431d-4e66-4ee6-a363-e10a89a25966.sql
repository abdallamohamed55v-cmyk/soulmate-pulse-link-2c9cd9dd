
CREATE TABLE public.deapi_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text NOT NULL,
  label text,
  usage_count int DEFAULT 0,
  last_used_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.deapi_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only deapi_keys" ON public.deapi_keys FOR ALL TO service_role USING (true) WITH CHECK (true);
