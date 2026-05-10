INSERT INTO public.slide_templates (template_id, name, description, template_engine, component_name, display_order, is_active)
VALUES
  ('premium-landing-mouse',  'Landing Mouse',  'Modern landing-page slide with mouse-tracked background orbs, parallax dot grid and gradient typography.', 'react-native', 'LandingMouse',  -110, true),
  ('premium-landing-scroll', 'Landing Scroll', 'Clean editorial landing-page slide with smooth scroll-style stagger animations and a single accent color.', 'react-native', 'LandingScroll', -109, true)
ON CONFLICT (template_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  template_engine = EXCLUDED.template_engine,
  component_name = EXCLUDED.component_name,
  display_order = EXCLUDED.display_order,
  is_active = true;