-- 1) Add new columns to skills
ALTER TABLE public.skills
  ADD COLUMN IF NOT EXISTS body text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS triggers text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true;

-- Backfill body from instructions where empty
UPDATE public.skills SET body = instructions WHERE body = '' AND instructions IS NOT NULL;

-- 2) Add new columns to system_skills
ALTER TABLE public.system_skills
  ADD COLUMN IF NOT EXISTS body text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS triggers text[] NOT NULL DEFAULT '{}';

UPDATE public.system_skills SET body = instructions WHERE body = '' AND instructions IS NOT NULL;

-- 3) skill_files table
CREATE TABLE IF NOT EXISTS public.skill_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  path text NOT NULL,
  storage_path text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skill_files_skill_idx ON public.skill_files(skill_id);
CREATE UNIQUE INDEX IF NOT EXISTS skill_files_skill_path_uniq ON public.skill_files(skill_id, path);

ALTER TABLE public.skill_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own skill files"
  ON public.skill_files
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4) Storage bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('skill-files', 'skill-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: first folder = user_id
CREATE POLICY "Users read own skill files in storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'skill-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own skill files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'skill-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own skill files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'skill-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own skill files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'skill-files' AND auth.uid()::text = (storage.foldername(name))[1]);