-- Idempotent payment processing: prevents duplicate crediting
CREATE TABLE IF NOT EXISTS public.processed_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  polar_order_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  product_id text,
  plan text,
  credits numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.processed_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own processed orders"
ON public.processed_orders FOR SELECT
USING (auth.uid() = user_id);

-- Atomic: insert order record + credit user. Unique constraint guarantees once-only.
CREATE OR REPLACE FUNCTION public.process_polar_order(
  p_order_id text,
  p_user_id uuid,
  p_product_id text,
  p_plan text,
  p_credits numeric
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_credits numeric;
BEGIN
  -- Atomic insert; raises 23505 on duplicate
  INSERT INTO public.processed_orders (polar_order_id, user_id, product_id, plan, credits)
  VALUES (p_order_id, p_user_id, p_product_id, p_plan, p_credits);

  -- Credit user
  UPDATE public.profiles
  SET credits = credits + p_credits, plan = p_plan, updated_at = now()
  WHERE id = p_user_id
  RETURNING credits INTO new_credits;

  IF new_credits IS NULL THEN
    RAISE EXCEPTION 'User profile not found: %', p_user_id;
  END IF;

  INSERT INTO public.credit_transactions (user_id, amount, action_type, description)
  VALUES (p_user_id, -p_credits, 'subscription_purchase',
          'Subscription: ' || p_plan || ' (Polar order ' || p_order_id || ')');

  RETURN jsonb_build_object('success', true, 'credits', new_credits, 'duplicate', false);

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true);
END;
$$;