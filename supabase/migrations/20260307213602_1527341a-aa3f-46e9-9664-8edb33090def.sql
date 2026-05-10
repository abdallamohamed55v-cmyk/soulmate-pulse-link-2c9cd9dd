
-- Table for storing model showcase media (image/video per model)
CREATE TABLE public.model_media (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id text NOT NULL UNIQUE,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Public read access, service role write
ALTER TABLE public.model_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view model media"
  ON public.model_media
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage model media"
  ON public.model_media
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Storage bucket for model media files
INSERT INTO storage.buckets (id, name, public)
VALUES ('model-media', 'model-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for model-media bucket
CREATE POLICY "Public read model media"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'model-media');

-- Service role upload
CREATE POLICY "Service role upload model media"
  ON storage.objects
  FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'model-media');
