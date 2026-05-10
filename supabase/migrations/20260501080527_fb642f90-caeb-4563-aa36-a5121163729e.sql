-- Public bucket for fallback static publishes from the code workspace
INSERT INTO storage.buckets (id, name, public)
VALUES ('published-sites', 'published-sites', true)
ON CONFLICT (id) DO NOTHING;

-- Allow service role full access (default), public read via bucket flag.
-- Add an explicit anon read policy to be safe.
CREATE POLICY "Public read published sites"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'published-sites');