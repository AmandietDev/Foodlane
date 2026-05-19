-- Compteurs d'usage freemium (persistés), incrément atomique sous plafond.

CREATE TABLE IF NOT EXISTS public.user_usage_counters (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  period_key text NOT NULL,
  metric text NOT NULL,
  count integer NOT NULL DEFAULT 0 CHECK (count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_key, metric)
);

CREATE INDEX IF NOT EXISTS idx_user_usage_counters_user
  ON public.user_usage_counters (user_id);

ALTER TABLE public.user_usage_counters ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.user_usage_counters IS
  'Compteurs par utilisateur / période / métrique pour les quotas plan gratuit (écriture via service role).';

-- Incrémente si count < p_limit ; sinon ne modifie pas la ligne. Sérialisé par verrou transactionnel.
CREATE OR REPLACE FUNCTION public.try_increment_usage (
  p_user_id uuid,
  p_period_key text,
  p_metric text,
  p_limit integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cur integer;
BEGIN
  IF p_limit IS NULL OR p_limit <= 0 THEN
    RETURN jsonb_build_object('allowed', false, 'count', 0, 'limit', p_limit);
  END IF;

  PERFORM pg_advisory_xact_lock (
    hashtext(p_user_id::text || '|' || p_period_key || '|' || p_metric)
  );

  SELECT c.count INTO v_cur
  FROM public.user_usage_counters c
  WHERE c.user_id = p_user_id
    AND c.period_key = p_period_key
    AND c.metric = p_metric;

  v_cur := COALESCE(v_cur, 0);

  IF v_cur >= p_limit THEN
    RETURN jsonb_build_object('allowed', false, 'count', v_cur, 'limit', p_limit);
  END IF;

  INSERT INTO public.user_usage_counters (user_id, period_key, metric, count)
  VALUES (p_user_id, p_period_key, p_metric, v_cur + 1)
  ON CONFLICT (user_id, period_key, metric)
  DO UPDATE SET
    count = public.user_usage_counters.count + 1,
    updated_at = now();

  RETURN jsonb_build_object('allowed', true, 'count', v_cur + 1, 'limit', p_limit);
END;
$$;

REVOKE ALL ON FUNCTION public.try_increment_usage (uuid, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_increment_usage (uuid, text, text, integer) TO service_role;
