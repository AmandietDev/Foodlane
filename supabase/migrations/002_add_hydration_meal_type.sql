-- Autoriser le type « hydration » dans le journal alimentaire
ALTER TABLE food_log_entries DROP CONSTRAINT IF EXISTS food_log_entries_meal_type_check;

ALTER TABLE food_log_entries
  ADD CONSTRAINT food_log_entries_meal_type_check
  CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'hydration'));
