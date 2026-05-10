
-- Table: lemondata_keys - manages 500+ API keys for LemonData provider
CREATE TABLE public.lemondata_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key text NOT NULL,
  label text,
  is_active boolean DEFAULT true,
  is_blocked boolean DEFAULT false,
  block_reason text,
  usage_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  last_used_at timestamptz,
  last_error_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.lemondata_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only lemondata" ON public.lemondata_keys FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Table: bot_admins - manages Telegram bot admin access
CREATE TABLE public.bot_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_chat_id bigint UNIQUE NOT NULL,
  added_by bigint,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.bot_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only bot_admins" ON public.bot_admins FOR ALL TO service_role USING (true) WITH CHECK (true);
