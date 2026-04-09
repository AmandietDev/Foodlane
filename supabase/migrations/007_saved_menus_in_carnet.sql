-- Permet de marquer un menu planner comme "enregistré dans Mon carnet"
alter table if exists public.weekly_menus
  add column if not exists saved_in_carnet boolean not null default false;

create index if not exists idx_weekly_menus_saved_in_carnet
  on public.weekly_menus(user_id, saved_in_carnet, created_at desc);

