
-- Trigger: send welcome email when new profile is created
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  user_name text;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
  user_name := COALESCE(NEW.display_name, split_part(COALESCE(user_email, ''), '@', 1));
  
  PERFORM extensions.http_post(
    'https://ltgampdtawuefwwayncx.supabase.co/functions/v1/send-email'::text,
    jsonb_build_object(
      'to', user_email,
      'template', 'welcome',
      'user_id', NEW.id::text,
      'type', 'system',
      'variables', jsonb_build_object(
        'name', user_name,
        'app_url', 'https://smart-hub-egy.lovable.app'
      )
    )::text,
    'application/json'::text
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_welcome
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_welcome_email();

-- Trigger: send email on withdrawal request
CREATE OR REPLACE FUNCTION public.trigger_withdrawal_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email text;
  user_name text;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
  SELECT COALESCE(display_name, split_part(COALESCE(user_email, ''), '@', 1)) INTO user_name
    FROM public.profiles WHERE id = NEW.user_id;
  
  PERFORM extensions.http_post(
    'https://ltgampdtawuefwwayncx.supabase.co/functions/v1/send-email'::text,
    jsonb_build_object(
      'to', user_email,
      'template', 'transaction',
      'user_id', NEW.user_id::text,
      'type', 'credits',
      'variables', jsonb_build_object(
        'name', user_name,
        'action', 'Withdrawal Request',
        'amount', NEW.amount::text || ' MC',
        'remaining', '—',
        'app_url', 'https://smart-hub-egy.lovable.app'
      )
    )::text,
    'application/json'::text
  );
  
  -- Also create in-app notification
  PERFORM public.create_notification(
    NEW.user_id, 'credits',
    'Withdrawal Request Submitted',
    'Your withdrawal of ' || NEW.amount::text || ' MC via ' || NEW.method || ' is being processed.',
    jsonb_build_object('amount', NEW.amount)
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_withdrawal_created
  AFTER INSERT ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_withdrawal_email();

-- Trigger: notify on referral
CREATE OR REPLACE FUNCTION public.trigger_referral_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.referrer_id, 'referral',
    'New Referral!',
    'Someone signed up using your referral code. You''ll earn 20% commission on their activity!',
    jsonb_build_object('referral_id', NEW.id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_referral_created
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_referral_notification();
