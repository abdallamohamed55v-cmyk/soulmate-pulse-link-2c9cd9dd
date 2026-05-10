
-- Create credit_transactions table
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions" ON public.credit_transactions
  FOR INSERT WITH CHECK (true);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Project',
  fly_machine_id TEXT,
  fly_app_name TEXT,
  preview_url TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  files_snapshot JSONB DEFAULT '{}'::jsonb,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON public.projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON public.projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON public.projects
  FOR DELETE USING (auth.uid() = user_id);

-- Secure deduct_credits function (server-side only)
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id UUID, p_amount NUMERIC, p_action_type TEXT, p_description TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_credits NUMERIC;
BEGIN
  SELECT credits INTO current_credits FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  
  IF current_credits IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;
  
  IF current_credits < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits', 'credits', current_credits);
  END IF;
  
  UPDATE public.profiles SET credits = credits - p_amount, updated_at = now() WHERE id = p_user_id;
  
  INSERT INTO public.credit_transactions (user_id, amount, action_type, description)
  VALUES (p_user_id, p_amount, p_action_type, p_description);
  
  RETURN jsonb_build_object('success', true, 'credits', current_credits - p_amount);
END;
$$;
