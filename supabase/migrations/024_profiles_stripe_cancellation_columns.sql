-- Colonnes Stripe : fin de période, annulation, flag cancel_at_period_end (aligné API Stripe).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_cancelled_at timestamptz;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

-- Ancienne colonne (022) → nouveau nom
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'subscription_cancel_at_period_end'
  ) THEN
    UPDATE public.profiles
    SET cancel_at_period_end = COALESCE(subscription_cancel_at_period_end, false)
    WHERE cancel_at_period_end IS DISTINCT FROM COALESCE(subscription_cancel_at_period_end, false);

    ALTER TABLE public.profiles DROP COLUMN subscription_cancel_at_period_end;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.cancel_at_period_end IS
  'Stripe subscription.cancel_at_period_end — résiliation en fin de période, accès conservé jusqu''à current_period_end.';
COMMENT ON COLUMN public.profiles.current_period_end IS
  'Fin de période de facturation Stripe (subscription.current_period_end), accès payant jusqu''à cette date.';
COMMENT ON COLUMN public.profiles.subscription_cancelled_at IS
  'Horodatage Stripe subscription.canceled_at si présent, ou enregistrement côté serveur à la suppression définitive.';
