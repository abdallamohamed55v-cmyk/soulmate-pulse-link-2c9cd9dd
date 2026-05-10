CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove previous schedule if any
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-learn-recap') THEN
    PERFORM cron.unschedule('weekly-learn-recap');
  END IF;
END $$;

SELECT cron.schedule(
  'weekly-learn-recap',
  '0 9 * * 5',
  $$
  SELECT net.http_post(
    url := 'https://ltgampdtawuefwwayncx.supabase.co/functions/v1/weekly-learn-recap',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);