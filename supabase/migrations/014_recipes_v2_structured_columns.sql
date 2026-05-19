-- 014: garantir la présence des colonnes structurées de recipes_v2
-- exploitées par le moteur de génération de menus (filtres + scoring + diversité).
-- Idempotent : aucune colonne n'est recréée si elle existe déjà.

alter table if exists public.recipes_v2
  add column if not exists meal_slot text,
  add column if not exists dish_type text,
  add column if not exists main_protein text,
  add column if not exists main_carb text,
  add column if not exists main_vegetables text,
  add column if not exists allergens text,
  add column if not exists igredient_tags text,
  add column if not exists diet_tags text,
  add column if not exists ingredients_quantites text,
  add column if not exists equipements_necessaires text,
  add column if not exists calories_par_portion numeric;

-- Index pour les filtres les plus utilisés (sélection rapide par créneau, protéine, type de plat)
create index if not exists idx_recipes_v2_meal_slot      on public.recipes_v2 (meal_slot);
create index if not exists idx_recipes_v2_dish_type      on public.recipes_v2 (dish_type);
create index if not exists idx_recipes_v2_main_protein   on public.recipes_v2 (main_protein);
create index if not exists idx_recipes_v2_main_carb      on public.recipes_v2 (main_carb);
create index if not exists idx_recipes_v2_diet_tags      on public.recipes_v2 (diet_tags);
create index if not exists idx_recipes_v2_allergens      on public.recipes_v2 (allergens);
