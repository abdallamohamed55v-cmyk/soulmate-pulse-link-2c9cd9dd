
CREATE TABLE public.slide_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id TEXT NOT NULL UNIQUE,
  image_url TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.slide_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active slide templates"
ON public.slide_templates
FOR SELECT
USING (is_active = true);
