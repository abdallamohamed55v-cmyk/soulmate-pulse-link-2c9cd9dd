
-- Tool templates table (for clothes-changer, face-swap, headshot, cartoon, character-swap, hair-changer)
CREATE TABLE public.tool_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id text NOT NULL,
  name text NOT NULL,
  prompt text,
  preview_url text,
  gender text DEFAULT 'both',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tool_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active tool templates"
  ON public.tool_templates FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Service role manages tool templates"
  ON public.tool_templates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tool landing images table
CREATE TABLE public.tool_landing_images (
  tool_id text PRIMARY KEY,
  image_url text,
  description text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.tool_landing_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tool landing images"
  ON public.tool_landing_images FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role manages tool landing images"
  ON public.tool_landing_images FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
