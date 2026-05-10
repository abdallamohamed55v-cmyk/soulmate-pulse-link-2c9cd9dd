-- Stores a single hero image per slide template, sourced from a Telegram bot.
CREATE TABLE IF NOT EXISTS public.template_images (
  template_id TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'telegram',
  uploaded_by_chat_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.template_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Template images are publicly readable"
ON public.template_images FOR SELECT USING (true);

-- Tracks each premium-template generation so we can enforce a daily quota.
CREATE TABLE IF NOT EXISTS public.premium_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_id TEXT,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_premium_usage_user_day
  ON public.premium_usage (user_id, used_at);

ALTER TABLE public.premium_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own premium usage"
ON public.premium_usage FOR SELECT
USING (auth.uid() = user_id);

-- updated_at trigger for template_images
CREATE OR REPLACE FUNCTION public.tg_template_images_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_template_images_updated_at ON public.template_images;
CREATE TRIGGER trg_template_images_updated_at
BEFORE UPDATE ON public.template_images
FOR EACH ROW EXECUTE FUNCTION public.tg_template_images_updated_at();