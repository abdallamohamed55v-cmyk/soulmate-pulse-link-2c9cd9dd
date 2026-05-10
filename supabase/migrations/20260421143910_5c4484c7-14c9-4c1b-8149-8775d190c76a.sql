-- 1) Fix cleanup: only blank images, never delete the report
CREATE OR REPLACE FUNCTION public.cleanup_old_research_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.research_reports
  SET images = '[]'::jsonb,
      updated_at = now()
  WHERE created_at < (now() - interval '10 days')
    AND jsonb_array_length(images) > 0;
END;
$$;

-- 2) Slide templates: add engine + component columns
ALTER TABLE public.slide_templates
  ADD COLUMN IF NOT EXISTS template_engine text NOT NULL DEFAULT '2slides',
  ADD COLUMN IF NOT EXISTS component_name text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text;

-- 3) Insert 5 premium React templates at the top (negative display_order)
INSERT INTO public.slide_templates (template_id, display_order, is_active, image_url, template_engine, component_name, name, description)
VALUES
  ('premium-aurora-keynote',  -5, true, null, 'react-native', 'AuroraKeynote',  'Aurora Keynote',   'Animated gradient + glassmorphism (Apple Keynote style)'),
  ('premium-editorial-noir',  -4, true, null, 'react-native', 'EditorialNoir',  'Editorial Noir',   'Luxury black & white with Playfair Display (NYT/Vogue style)'),
  ('premium-neo-brutalist',   -3, true, null, 'react-native', 'NeoBrutalist',   'Neo Brutalist',    'Bold colors + hard shadows (Linear/Gumroad style)'),
  ('premium-glass-pitch',     -2, true, null, 'react-native', 'GlassPitch',     'Glass Pitch',      'Backdrop blur + particles + charts (YC pitch deck style)'),
  ('premium-cairo-modern',    -1, true, null, 'react-native', 'CairoModern',    'Cairo Modern',     'Native RTL Arabic with Cairo font, gold & navy')
ON CONFLICT (template_id) DO UPDATE
  SET display_order = EXCLUDED.display_order,
      template_engine = EXCLUDED.template_engine,
      component_name = EXCLUDED.component_name,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      is_active = true;