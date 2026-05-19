-- Fondateurs (tarif lancement à vie), bêta testeurs (whitelist), traçage facturation Stripe

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT,
  ADD COLUMN IF NOT EXISTS is_founder BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_beta_tester BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS founder_offer_type TEXT;

COMMENT ON COLUMN public.profiles.billing_cycle IS 'monthly | yearly — aligné sur l’abonnement Stripe';
COMMENT ON COLUMN public.profiles.is_founder IS 'TRUE si abonnement souscrit au tarif fondateur (Price ID lancement) — ne pas migrer automatiquement';
COMMENT ON COLUMN public.profiles.is_beta_tester IS 'TRUE si accès Premium Plus via whitelist bêta (hors quota fondateurs, sans Stripe)';
COMMENT ON COLUMN public.profiles.stripe_price_id IS 'Dernier Price ID Stripe de l’article d’abonnement (référence)';
COMMENT ON COLUMN public.profiles.founder_offer_type IS 'ex. launch — type d’offre fondateur souscrite';

CREATE INDEX IF NOT EXISTS idx_profiles_founder_active
  ON public.profiles (is_founder, is_beta_tester, subscription_status)
  WHERE is_founder = TRUE AND COALESCE(is_beta_tester, FALSE) = FALSE;
