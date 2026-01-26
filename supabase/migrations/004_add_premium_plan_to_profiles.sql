-- Migration pour ajouter le champ premium_plan à la table profiles
-- premium_plan peut être "monthly" | "yearly" | null

DO $$ 
BEGIN
  -- Ajouter la colonne premium_plan si elle n'existe pas déjà
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'premium_plan'
  ) THEN
    ALTER TABLE profiles ADD COLUMN premium_plan TEXT;
    
    -- Ajouter un commentaire pour documenter
    COMMENT ON COLUMN profiles.premium_plan IS 'Plan Premium: monthly, yearly, ou null';
  END IF;
END $$;

