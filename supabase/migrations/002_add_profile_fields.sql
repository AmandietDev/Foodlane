-- Migration pour ajouter les champs nécessaires à la table profiles
-- allergies, diets, objective, behavioral_preferences

-- Ajouter les colonnes si elles n'existent pas déjà
DO $$ 
BEGIN
  -- Colonne allergies (tableau de text)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'allergies'
  ) THEN
    ALTER TABLE profiles ADD COLUMN allergies TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  -- Colonne diets (tableau de text)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'diets'
  ) THEN
    ALTER TABLE profiles ADD COLUMN diets TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  -- Colonne objective (text)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'objective'
  ) THEN
    ALTER TABLE profiles ADD COLUMN objective TEXT;
  END IF;

  -- Colonne behavioral_preferences (tableau de text)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'behavioral_preferences'
  ) THEN
    ALTER TABLE profiles ADD COLUMN behavioral_preferences TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;

