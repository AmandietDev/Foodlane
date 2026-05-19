-- Résiliation en fin de période (Stripe cancel_at_period_end), pour l’affichage dans l’app.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.subscription_cancel_at_period_end IS 'true si l’abonnement Stripe est programmé pour s’arrêter en fin de période';
