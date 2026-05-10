
-- Fix security definer view - make it SECURITY INVOKER
ALTER VIEW public.service_status_public SET (security_invoker = on);
