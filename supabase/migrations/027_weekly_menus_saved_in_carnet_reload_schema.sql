-- Colonne manquante en prod / cache PostgREST obsolète : ré-applique et force le reload du schéma API.
alter table if exists public.weekly_menus
  add column if not exists saved_in_carnet boolean not null default false;

create index if not exists idx_weekly_menus_saved_in_carnet
  on public.weekly_menus(user_id, saved_in_carnet, created_at desc);

notify pgrst, 'reload schema';
