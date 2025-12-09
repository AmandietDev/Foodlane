-- ============================================
-- Migration Supabase : Ajout des colonnes Premium
-- ============================================
-- 
-- 📍 Où exécuter ce SQL :
--   1. Va sur https://app.supabase.com/
--   2. Sélectionne ton projet
--   3. Va dans "SQL Editor" (dans le menu de gauche)
--   4. Clique sur "New query"
--   5. Colle ce SQL complet
--   6. Clique sur "Run" (ou Ctrl+Enter)
--
-- ⚠️ Cette requête est safe : elle utilise ADD COLUMN IF NOT EXISTS
--    donc elle ne cassera rien si les colonnes existent déjà
--
-- 📝 NOTE : Ce SQL est pour la table "profiles" (en anglais)
--    Si ta table s'appelle "profils" (en français), utilise SUPABASE_MIGRATION_PROFILS.sql
-- ============================================

-- Ajouter la colonne email si elle n'existe pas
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Ajouter les colonnes pour l'abonnement Premium
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS premium_active BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS premium_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS premium_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Créer des index pour améliorer les performances des recherches
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON public.profiles(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_premium_active ON public.profiles(premium_active);

-- Vérification : Afficher les colonnes créées
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('email', 'premium_active', 'premium_start_date', 'premium_end_date', 'stripe_customer_id', 'stripe_subscription_id')
ORDER BY column_name;

