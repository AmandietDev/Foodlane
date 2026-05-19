-- 019: ajout des colonnes batch cooking sur weekly_menu_meals
--
-- Permet de lier plusieurs creneaux a une seule preparation reelle.
-- Exemple : un gateau prepare le lundi sert aussi de collation mardi
-- et mercredi. Les 3 creneaux partagent le meme batch_group_id, seul
-- le creneau "origin" represente la preparation reelle (et compte dans
-- la liste de courses).
--
-- Idempotent : peut etre relancee sans risque.

alter table if exists public.weekly_menu_meals
  add column if not exists batch_group_id uuid,
  add column if not exists is_batch_origin boolean,
  add column if not exists batch_servings integer;

-- Index leger pour retrouver rapidement tous les creneaux d'un meme batch
create index if not exists weekly_menu_meals_batch_group_id_idx
  on public.weekly_menu_meals (batch_group_id)
  where batch_group_id is not null;

-- Commentaires pour la doc auto
comment on column public.weekly_menu_meals.batch_group_id is
  'UUID partage par tous les creneaux issus d''une meme preparation reelle (batch cooking).';

comment on column public.weekly_menu_meals.is_batch_origin is
  'TRUE pour le creneau ou la preparation est reellement faite, FALSE pour une reprise.';

comment on column public.weekly_menu_meals.batch_servings is
  'Nombre total de portions prepares (= household_size * nb_creneaux du batch).';
