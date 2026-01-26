-- Migration pour créer les tables du journal alimentaire
-- Tables: food_log_entries, daily_summaries, weekly_insights

-- Table food_log_entries
CREATE TABLE IF NOT EXISTS food_log_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  raw_text TEXT NOT NULL,
  parsed JSONB NOT NULL DEFAULT '{}',
  confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 100),
  hunger_before INTEGER CHECK (hunger_before >= 1 AND hunger_before <= 5),
  satiety_after INTEGER CHECK (satiety_after >= 1 AND satiety_after <= 5),
  mood_energy INTEGER CHECK (mood_energy >= 1 AND mood_energy <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_food_log_user_date ON food_log_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_food_log_user_created ON food_log_entries(user_id, created_at DESC);

-- Table daily_summaries
CREATE TABLE IF NOT EXISTS daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  strengths TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  priority_tip TEXT,
  tip_options JSONB DEFAULT '[]',
  missing_components TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  plan_for_tomorrow JSONB DEFAULT '{}',
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_daily_summary_user_date ON daily_summaries(user_id, date DESC);

-- Table weekly_insights (optionnel MVP+)
CREATE TABLE IF NOT EXISTS weekly_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  patterns JSONB DEFAULT '{}',
  one_action TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_weekly_insights_user_week ON weekly_insights(user_id, week_start DESC);

-- RLS (Row Level Security) pour food_log_entries
ALTER TABLE food_log_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own food log entries"
  ON food_log_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own food log entries"
  ON food_log_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own food log entries"
  ON food_log_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own food log entries"
  ON food_log_entries FOR DELETE
  USING (auth.uid() = user_id);

-- RLS pour daily_summaries
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily summaries"
  ON daily_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily summaries"
  ON daily_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily summaries"
  ON daily_summaries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS pour weekly_insights
ALTER TABLE weekly_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly insights"
  ON weekly_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly insights"
  ON weekly_insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly insights"
  ON weekly_insights FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_food_log_entries_updated_at
  BEFORE UPDATE ON food_log_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_summaries_updated_at
  BEFORE UPDATE ON daily_summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_insights_updated_at
  BEFORE UPDATE ON weekly_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

