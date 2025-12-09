-- Script SQL pour créer la table recipes dans Supabase
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Créer la table recipes
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  difficulte TEXT NOT NULL,
  temps_preparation_min INTEGER NOT NULL DEFAULT 0,
  categorie_temps TEXT NOT NULL DEFAULT '',
  nb_personnes INTEGER NOT NULL DEFAULT 1,
  nom TEXT NOT NULL,
  description_courte TEXT NOT NULL DEFAULT '',
  ingredients TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  equipements TEXT NOT NULL DEFAULT '',
  calories INTEGER,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer un index sur le nom pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_recipes_nom ON recipes(nom);

-- Créer un index sur le type pour améliorer les performances de filtrage
CREATE INDEX IF NOT EXISTS idx_recipes_type ON recipes(type);

-- Créer un index sur la difficulté pour améliorer les performances de filtrage
CREATE INDEX IF NOT EXISTS idx_recipes_difficulte ON recipes(difficulte);

-- Activer Row Level Security (RLS) - pour permettre l'accès public en lecture
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- Créer une politique pour permettre la lecture publique (tout le monde peut lire)
CREATE POLICY "Allow public read access" ON recipes
  FOR SELECT
  USING (true);

-- Créer une fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaire sur la table
COMMENT ON TABLE recipes IS 'Table contenant toutes les recettes de l''application Foodlane';

