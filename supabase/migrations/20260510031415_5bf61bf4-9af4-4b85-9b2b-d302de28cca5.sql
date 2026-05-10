
-- Bucket for user-uploaded music files (Learn mode)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-music', 'user-music', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: each user can manage files only inside their own user-id folder
CREATE POLICY "Users read their own music"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-music' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload their own music"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-music' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete their own music"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'user-music' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Table to track saved music tracks per user
CREATE TABLE public.user_music_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_music_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their tracks"
  ON public.user_music_tracks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their tracks"
  ON public.user_music_tracks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their tracks"
  ON public.user_music_tracks FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_user_music_tracks_user ON public.user_music_tracks(user_id, created_at DESC);
