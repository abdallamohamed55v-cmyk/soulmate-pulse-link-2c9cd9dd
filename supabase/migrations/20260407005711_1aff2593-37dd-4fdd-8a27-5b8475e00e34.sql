
CREATE TABLE public.generated_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prompt text NOT NULL,
  audio_url text NOT NULL,
  title text DEFAULT 'Untitled Track',
  duration_seconds integer DEFAULT 60,
  status text DEFAULT 'completed',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.generated_songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own songs"
  ON public.generated_songs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages songs"
  ON public.generated_songs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
