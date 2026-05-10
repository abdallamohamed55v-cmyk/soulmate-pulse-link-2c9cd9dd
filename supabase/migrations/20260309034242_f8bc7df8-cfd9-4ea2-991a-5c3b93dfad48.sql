
CREATE TABLE public.showcase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  prompt text NOT NULL DEFAULT '',
  model_id text NOT NULL DEFAULT '',
  model_name text NOT NULL DEFAULT '',
  aspect_ratio text NOT NULL DEFAULT '1:1',
  quality text NOT NULL DEFAULT '2K',
  duration text,
  style text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.showcase_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view showcase items"
  ON public.showcase_items FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage showcase items"
  ON public.showcase_items FOR ALL
  USING (true)
  WITH CHECK (true);
