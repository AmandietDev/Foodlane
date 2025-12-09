-- Tables pour les favoris et collections par utilisateur

-- Table des favoris utilisateur
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

-- Table des collections utilisateur
CREATE TABLE IF NOT EXISTS user_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table de liaison entre collections et recettes
CREATE TABLE IF NOT EXISTS user_collection_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES user_collections(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, recipe_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_recipe_id ON user_favorites(recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_collections_user_id ON user_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_collection_recipes_collection_id ON user_collection_recipes(collection_id);
CREATE INDEX IF NOT EXISTS idx_user_collection_recipes_recipe_id ON user_collection_recipes(recipe_id);

-- RLS (Row Level Security) pour sécuriser les données
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_collection_recipes ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour user_favorites
CREATE POLICY "Users can view their own favorites"
  ON user_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
  ON user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON user_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Politiques RLS pour user_collections
CREATE POLICY "Users can view their own collections"
  ON user_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections"
  ON user_collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON user_collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON user_collections FOR DELETE
  USING (auth.uid() = user_id);

-- Politiques RLS pour user_collection_recipes
CREATE POLICY "Users can view recipes in their collections"
  ON user_collection_recipes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_collections
      WHERE user_collections.id = user_collection_recipes.collection_id
      AND user_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert recipes in their collections"
  ON user_collection_recipes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_collections
      WHERE user_collections.id = user_collection_recipes.collection_id
      AND user_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recipes from their collections"
  ON user_collection_recipes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_collections
      WHERE user_collections.id = user_collection_recipes.collection_id
      AND user_collections.user_id = auth.uid()
    )
  );

