-- Portions pour recettes / courses : pour un foyer à 5 personnes, l'utilisateur peut choisir 4, 5 ou 6.
alter table public.user_preferences
  add column if not exists recipe_scaling_portions int null;

comment on column public.user_preferences.recipe_scaling_portions is
  'Si non null (ex. 4–6 pour un foyer de 5), utilise cette valeur pour mettre à l’échelle les quantités ; sinon household_size.';
