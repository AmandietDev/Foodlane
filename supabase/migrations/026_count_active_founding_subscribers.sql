-- Comptage fiable des abonnements « fondateur » actifs (Stripe), hors bêta.
-- Évite les erreurs PostgREST sur certaines combinaisons count + filtres.

CREATE OR REPLACE FUNCTION public.count_active_founding_subscribers ()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM public.profiles
  WHERE is_founder IS TRUE
    AND COALESCE(is_beta_tester, FALSE) IS FALSE
    AND stripe_subscription_id IS NOT NULL
    AND subscription_status IN ('active', 'trialing');
$$;

COMMENT ON FUNCTION public.count_active_founding_subscribers () IS
  'Nombre de profils fondateur avec abonnement Stripe actif/trialing, hors whitelist bêta. Réservé au service_role.';

REVOKE ALL ON FUNCTION public.count_active_founding_subscribers () FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_active_founding_subscribers () TO service_role;
