CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_setting('role', true) = 'service_role'
     OR current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'Cannot modify plan column directly';
  END IF;
  IF NEW.credits IS DISTINCT FROM OLD.credits THEN
    RAISE EXCEPTION 'Cannot modify credits column directly';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Cannot modify created_at column directly';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Cannot modify id column directly';
  END IF;
  RETURN NEW;
END;
$function$;

DO $$
DECLARE u RECORD;
BEGIN
  FOR u IN
    SELECT user_id, MIN(payload->'data'->>'id') as order_id
    FROM payment_events
    WHERE event_type = 'order.created'
      AND user_id IN ('e75f6147-c8bc-4055-bb5e-fe0c9e19eb41','fb90bc23-221d-4908-a5d6-008d2d389370','bdabe145-b6e4-4ae6-9720-845d1ca2d4cd')
    GROUP BY user_id
  LOOP
    -- Skip if already credited
    IF EXISTS (SELECT 1 FROM credit_transactions WHERE user_id = u.user_id AND description LIKE 'Backfill: Starter%') THEN
      CONTINUE;
    END IF;
    PERFORM public.add_credits(u.user_id, 1000, 'Backfill: Starter subscription credits');
    UPDATE public.profiles SET plan = 'starter' WHERE id = u.user_id;
  END LOOP;
END $$;