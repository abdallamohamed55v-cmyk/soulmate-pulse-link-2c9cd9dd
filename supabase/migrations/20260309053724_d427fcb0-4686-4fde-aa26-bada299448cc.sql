
-- Change default credits to 0 (no free credits)
ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 0;

-- Allow frontend to read memories (model configs, page settings)
CREATE POLICY "Anyone can read memories"
ON public.memories
FOR SELECT
TO anon, authenticated
USING (true);
