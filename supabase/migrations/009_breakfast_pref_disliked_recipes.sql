-- Migration 009: breakfast_preference + recettes non aimées

-- Ajout de la préférence petit-déjeuner dans les préférences utilisateur
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS breakfast_preference text DEFAULT 'both'
    CHECK (breakfast_preference IN ('sweet', 'savory', 'both'));

-- Table des recettes que l'utilisateur ne veut plus voir
CREATE TABLE IF NOT EXISTS user_disliked_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id bigint NOT NULL,
  recipe_name text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

ALTER TABLE user_disliked_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_disliked_recipes_select" ON user_disliked_recipes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_disliked_recipes_insert" ON user_disliked_recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_disliked_recipes_delete" ON user_disliked_recipes
  FOR DELETE USING (auth.uid() = user_id);
