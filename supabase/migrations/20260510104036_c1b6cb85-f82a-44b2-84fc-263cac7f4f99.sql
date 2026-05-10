-- Public sharing for deep research reports
ALTER TABLE public.research_reports
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE;

CREATE INDEX IF NOT EXISTS research_reports_share_token_idx
  ON public.research_reports(share_token)
  WHERE share_token IS NOT NULL;

-- Anyone (even unauthenticated) can read a report when it has a share_token.
DROP POLICY IF EXISTS "Public can view shared research reports" ON public.research_reports;
CREATE POLICY "Public can view shared research reports"
  ON public.research_reports
  FOR SELECT
  TO anon, authenticated
  USING (share_token IS NOT NULL);