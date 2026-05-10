-- Auto-delete research reports older than 10 days via pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_old_research_reports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.research_reports
  WHERE created_at < (now() - interval '10 days');
END;
$$;

-- Schedule daily cleanup at 03:00 UTC
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-research-reports-10d') THEN
    PERFORM cron.schedule(
      'cleanup-research-reports-10d',
      '0 3 * * *',
      $cron$ SELECT public.cleanup_old_research_reports(); $cron$
    );
  END IF;
END $$;