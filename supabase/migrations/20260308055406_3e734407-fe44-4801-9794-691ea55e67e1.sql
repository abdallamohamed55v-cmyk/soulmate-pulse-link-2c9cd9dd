
-- 1. Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, read);

-- 2. Email logs table
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  to_email text NOT NULL,
  subject text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'sent',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email logs"
  ON public.email_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert email logs"
  ON public.email_logs FOR INSERT
  WITH CHECK (true);

-- 3. Notification preferences table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_welcome boolean NOT NULL DEFAULT true,
  email_low_balance boolean NOT NULL DEFAULT true,
  email_transactions boolean NOT NULL DEFAULT true,
  email_newsletter boolean NOT NULL DEFAULT true,
  app_credits boolean NOT NULL DEFAULT true,
  app_system boolean NOT NULL DEFAULT true,
  app_generation boolean NOT NULL DEFAULT true,
  app_referral boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_user_id uuid, p_notification_ids uuid[] DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_notification_ids IS NULL THEN
    UPDATE public.notifications SET read = true WHERE user_id = p_user_id AND read = false;
  ELSE
    UPDATE public.notifications SET read = true WHERE user_id = p_user_id AND id = ANY(p_notification_ids);
  END IF;
END;
$$;

-- 5. Function to create notification (callable from edge functions)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_metadata)
  RETURNING id INTO notification_id;
  RETURN notification_id;
END;
$$;

-- 6. Update deduct_credits to create notification when balance < 5
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_amount numeric, p_action_type text, p_description text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_credits NUMERIC;
  new_credits NUMERIC;
BEGIN
  SELECT credits INTO current_credits FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  
  IF current_credits IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF current_credits < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits', 'credits', current_credits);
  END IF;
  
  new_credits := current_credits - p_amount;
  
  UPDATE public.profiles SET credits = new_credits, updated_at = now() WHERE id = p_user_id;
  
  INSERT INTO public.credit_transactions (user_id, amount, action_type, description)
  VALUES (p_user_id, p_amount, p_action_type, p_description);
  
  -- Create notification when balance drops below 5
  IF new_credits < 5 AND current_credits >= 5 THEN
    PERFORM public.create_notification(
      p_user_id, 'credits',
      'رصيدك منخفض',
      'رصيدك الحالي ' || new_credits::text || ' MC. قم بشحن رصيدك للاستمرار.',
      jsonb_build_object('credits', new_credits)
    );
  END IF;
  
  RETURN jsonb_build_object('success', true, 'credits', new_credits);
END;
$$;

-- 7. Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
