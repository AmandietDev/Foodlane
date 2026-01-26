-- Table pour stocker l'historique des conseils et défis du jour suggérés
CREATE TABLE IF NOT EXISTS daily_tips_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  tip_id text NOT NULL,
  challenge_id text NOT NULL,
  tip_category text,
  challenge_category text,
  created_at timestamp WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_daily_tips_history_user_date ON daily_tips_history(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_tips_history_user_tip ON daily_tips_history(user_id, tip_id);
CREATE INDEX IF NOT EXISTS idx_daily_tips_history_user_challenge ON daily_tips_history(user_id, challenge_id);

-- RLS (Row Level Security)
ALTER TABLE daily_tips_history ENABLE ROW LEVEL SECURITY;

-- Politique : les utilisateurs peuvent voir uniquement leurs propres historiques
CREATE POLICY "Users can view their own daily_tips_history." 
  ON daily_tips_history FOR SELECT 
  USING (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent insérer leurs propres historiques
CREATE POLICY "Users can insert their own daily_tips_history." 
  ON daily_tips_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent mettre à jour leurs propres historiques
CREATE POLICY "Users can update their own daily_tips_history." 
  ON daily_tips_history FOR UPDATE 
  USING (auth.uid() = user_id);

-- Politique : les utilisateurs peuvent supprimer leurs propres historiques
CREATE POLICY "Users can delete their own daily_tips_history." 
  ON daily_tips_history FOR DELETE 
  USING (auth.uid() = user_id);

