-- Liste d'attente : alerte mise en ligne App Store / Google Play
CREATE TABLE IF NOT EXISTS public.app_launch_waitlist (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL,
  source text NOT NULL DEFAULT 'coming_soon',
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  CONSTRAINT app_launch_waitlist_email_unique UNIQUE (email),
  CONSTRAINT app_launch_waitlist_email_format CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_app_launch_waitlist_created_at
  ON public.app_launch_waitlist (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_launch_waitlist_notified_at
  ON public.app_launch_waitlist (notified_at)
  WHERE notified_at IS NULL;

COMMENT ON TABLE public.app_launch_waitlist IS
  'Emails des personnes souhaitant être alertées de la mise en ligne mobile Foodlane.';

ALTER TABLE public.app_launch_waitlist ENABLE ROW LEVEL SECURITY;

-- Aucune policy publique : insertions via API (service role) uniquement.
