-- Colonnes abonnement (Premium / Premium Plus) + statut Stripe
-- À appliquer sur public.profiles (Supabase SQL editor ou CLI migrate).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS premium_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS premium_ended_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.subscription_tier IS 'Palier: premium, premium_plus, free (après annulation)';
COMMENT ON COLUMN public.profiles.subscription_status IS 'Statut Stripe de l''abonnement (active, trialing, past_due, canceled, …)';
COMMENT ON COLUMN public.profiles.premium_started_at IS 'Début d''abonnement payant (webhook checkout.session.completed)';
COMMENT ON COLUMN public.profiles.premium_ended_at IS 'Fin d''abonnement (annulation définitive)';
