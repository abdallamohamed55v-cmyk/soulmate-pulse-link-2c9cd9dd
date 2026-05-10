INSERT INTO public.slide_templates (template_id, name, description, template_engine, component_name, display_order, is_active)
VALUES ('premium-megsy', 'Megsy', 'Signature Megsy landing-style template with bold display typography and gradient glows', 'react-native', 'Megsy', -100, true)
ON CONFLICT DO NOTHING;