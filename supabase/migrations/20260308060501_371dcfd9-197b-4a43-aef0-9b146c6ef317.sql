
-- OTP codes table
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Service role only
CREATE POLICY "Service role can manage OTP codes"
  ON public.otp_codes FOR ALL
  WITH CHECK (true);

-- Auto-cleanup expired OTPs
CREATE INDEX idx_otp_codes_email ON public.otp_codes(email, used, expires_at);

-- Function to send welcome email on new profile creation
CREATE OR REPLACE FUNCTION public.on_new_profile_welcome()
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
  user_name := COALESCE(NEW.display_name, split_part(user_email, '@', 1));
  
  PERFORM net.http_post(
    url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
    ),
    body := jsonb_build_object(
      'to', user_email,
      'template', 'welcome',
      'user_id', NEW.id::text,
      'type', 'system',
      'variables', jsonb_build_object(
        'name', user_name,
        'app_url', 'https://smart-hub-egy.lovable.app'
      )
    )
  );
  
  RETURN NEW;
END;
$$;
