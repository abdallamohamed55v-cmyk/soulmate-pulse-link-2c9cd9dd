
-- OAuth Clients table
CREATE TABLE public.oauth_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id text UNIQUE NOT NULL,
  client_secret_hash text NOT NULL,
  name text NOT NULL,
  logo_url text,
  redirect_uris text[] NOT NULL DEFAULT '{}',
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages oauth_clients"
  ON public.oauth_clients FOR ALL
  USING (true) WITH CHECK (true);

-- OAuth Authorization Codes table
CREATE TABLE public.oauth_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  client_id text NOT NULL,
  user_id uuid NOT NULL,
  redirect_uri text NOT NULL,
  scope text DEFAULT 'read',
  used boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.oauth_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages oauth_codes"
  ON public.oauth_codes FOR ALL
  USING (true) WITH CHECK (true);

-- OAuth Access Tokens table
CREATE TABLE public.oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token text UNIQUE NOT NULL,
  client_id text NOT NULL,
  user_id uuid NOT NULL,
  scope text DEFAULT 'read',
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages oauth_tokens"
  ON public.oauth_tokens FOR ALL
  USING (true) WITH CHECK (true);
