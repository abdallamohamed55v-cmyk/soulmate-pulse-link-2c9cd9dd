-- Document templates: structured templates for Document, Report, Letter, Resume
CREATE TABLE IF NOT EXISTS public.document_templates (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('document','report','letter','resume')),
  name TEXT NOT NULL,
  description TEXT,
  preview_url TEXT,
  category TEXT NOT NULL DEFAULT 'standard' CHECK (category IN ('standard','premium')),
  structure JSONB NOT NULL DEFAULT '{}'::jsonb,
  style JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Document templates are publicly readable"
ON public.document_templates FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_document_templates_kind ON public.document_templates(kind, sort_order);

-- Telegram-sourced images per document template
CREATE TABLE IF NOT EXISTS public.document_template_images (
  template_id TEXT PRIMARY KEY REFERENCES public.document_templates(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'telegram',
  uploaded_by_chat_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_template_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Document template images are publicly readable"
ON public.document_template_images FOR SELECT USING (true);

-- Daily quota for premium document templates
CREATE TABLE IF NOT EXISTS public.document_premium_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id TEXT,
  kind TEXT,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_premium_usage_user_day
  ON public.document_premium_usage (user_id, used_at);

ALTER TABLE public.document_premium_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own document premium usage"
ON public.document_premium_usage FOR SELECT
USING (auth.uid() = user_id);

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_document_templates_updated_at ON public.document_templates;
CREATE TRIGGER trg_document_templates_updated_at
BEFORE UPDATE ON public.document_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_document_template_images_updated_at ON public.document_template_images;
CREATE TRIGGER trg_document_template_images_updated_at
BEFORE UPDATE ON public.document_template_images
FOR EACH ROW EXECUTE FUNCTION public.tg_template_images_updated_at();

-- Seed minimal starter templates (gradient previews come from frontend gradient generator)
INSERT INTO public.document_templates (id, kind, name, description, category, sort_order, structure) VALUES
  -- Documents
  ('doc-minimal',     'document', 'Minimal',          'Clean single-column layout',           'standard', 10, '{"sections":["title","body"]}'),
  ('doc-academic',    'document', 'Academic',         'Serif typography, structured headings','standard', 20, '{"sections":["title","abstract","body","references"]}'),
  ('doc-modern-blog', 'document', 'Modern Blog',      'Editorial style with hero section',    'premium',  30, '{"sections":["hero","intro","body","conclusion"]}'),
  -- Reports
  ('rep-corporate',   'report',   'Corporate Blue',   'Cover, TOC, numbered sections',        'standard', 10, '{"sections":["cover","toc","executive_summary","sections","references"]}'),
  ('rep-financial',   'report',   'Financial',        'Data-heavy with tables and charts',    'premium',  20, '{"sections":["cover","summary","kpis","analysis","appendix"]}'),
  ('rep-consulting',  'report',   'Consulting',       'Findings & recommendations format',    'premium',  30, '{"sections":["cover","context","findings","recommendations"]}'),
  -- Letters
  ('let-classic',     'letter',   'Classic Formal',   'Traditional business letter',          'standard', 10, '{"sections":["letterhead","date","recipient","greeting","body","signature"]}'),
  ('let-modern',      'letter',   'Modern Business',  'Clean contemporary letterhead',        'standard', 20, '{"sections":["letterhead","date","recipient","greeting","body","signature"]}'),
  ('let-cover',       'letter',   'Cover Letter',     'Job application format',               'premium',  30, '{"sections":["header","date","recipient","greeting","body","signature"]}'),
  -- Resumes
  ('cv-modern-tech',  'resume',   'Modern Tech',      'Two-column with skills sidebar',       'premium',  10, '{"sections":["header","summary","experience","education","skills"]}'),
  ('cv-minimal',      'resume',   'Minimal',          'Single column, ATS-friendly',          'standard', 20, '{"sections":["header","summary","experience","education","skills"]}'),
  ('cv-creative',     'resume',   'Creative',         'Bold colors for designers',            'premium',  30, '{"sections":["header","about","experience","portfolio","skills"]}'),
  ('cv-classic',      'resume',   'Classic',          'Traditional serif CV',                 'standard', 40, '{"sections":["header","education","experience","skills","languages"]}')
ON CONFLICT (id) DO NOTHING;