-- Core schema for weekly personalized planning
-- Keeps existing `profiles` and adds normalized planner tables.

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  cooking_time_preference text not null default '15_30',
  household_size int not null default 1,
  adults_count int not null default 1,
  children_count int not null default 0,
  planning_days int not null default 7,
  meal_types text[] not null default array['breakfast','lunch','dinner'],
  meal_structure text not null default 'plat_seul',
  objectives text[] not null default array['mieux_manger'],
  dietary_filters text[] not null default '{}',
  world_cuisines text[] not null default '{}',
  seasonal_preference boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  equipment_key text not null,
  created_at timestamptz not null default now(),
  unique(user_id, equipment_key)
);

create table if not exists public.user_allergies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  allergy_key text not null,
  created_at timestamptz not null default now(),
  unique(user_id, allergy_key)
);

create table if not exists public.user_excluded_ingredients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ingredient_name text not null,
  created_at timestamptz not null default now(),
  unique(user_id, ingredient_name)
);

create table if not exists public.weekly_menus (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  week_start_date date not null,
  planning_days int not null default 7,
  generation_context jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.weekly_menu_days (
  id uuid primary key default gen_random_uuid(),
  weekly_menu_id uuid not null references public.weekly_menus(id) on delete cascade,
  day_index int not null,
  day_date date not null,
  created_at timestamptz not null default now(),
  unique(weekly_menu_id, day_index)
);

create table if not exists public.weekly_menu_meals (
  id uuid primary key default gen_random_uuid(),
  weekly_menu_day_id uuid not null references public.weekly_menu_days(id) on delete cascade,
  meal_type text not null,
  recipe_id text,
  recipe_name text not null,
  recipe_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  weekly_menu_id uuid not null unique references public.weekly_menus(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.grocery_list_items (
  id uuid primary key default gen_random_uuid(),
  grocery_list_id uuid not null references public.grocery_lists(id) on delete cascade,
  ingredient_name text not null,
  quantity numeric,
  unit text,
  category text not null default 'divers',
  checked boolean not null default false,
  source_recipe_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_preferences_updated_at on public.user_preferences;
create trigger trg_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

drop trigger if exists trg_weekly_menus_updated_at on public.weekly_menus;
create trigger trg_weekly_menus_updated_at
before update on public.weekly_menus
for each row execute function public.set_updated_at();

drop trigger if exists trg_grocery_lists_updated_at on public.grocery_lists;
create trigger trg_grocery_lists_updated_at
before update on public.grocery_lists
for each row execute function public.set_updated_at();

drop trigger if exists trg_grocery_list_items_updated_at on public.grocery_list_items;
create trigger trg_grocery_list_items_updated_at
before update on public.grocery_list_items
for each row execute function public.set_updated_at();

alter table public.user_preferences enable row level security;
alter table public.user_equipment enable row level security;
alter table public.user_allergies enable row level security;
alter table public.user_excluded_ingredients enable row level security;
alter table public.weekly_menus enable row level security;
alter table public.weekly_menu_days enable row level security;
alter table public.weekly_menu_meals enable row level security;
alter table public.grocery_lists enable row level security;
alter table public.grocery_list_items enable row level security;

drop policy if exists "user_preferences_owner" on public.user_preferences;
create policy "user_preferences_owner" on public.user_preferences
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_equipment_owner" on public.user_equipment;
create policy "user_equipment_owner" on public.user_equipment
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_allergies_owner" on public.user_allergies;
create policy "user_allergies_owner" on public.user_allergies
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_excluded_ingredients_owner" on public.user_excluded_ingredients;
create policy "user_excluded_ingredients_owner" on public.user_excluded_ingredients
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "weekly_menus_owner" on public.weekly_menus;
create policy "weekly_menus_owner" on public.weekly_menus
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "weekly_menu_days_owner" on public.weekly_menu_days;
create policy "weekly_menu_days_owner" on public.weekly_menu_days
for all using (
  exists (
    select 1 from public.weekly_menus wm
    where wm.id = weekly_menu_id and wm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.weekly_menus wm
    where wm.id = weekly_menu_id and wm.user_id = auth.uid()
  )
);

drop policy if exists "weekly_menu_meals_owner" on public.weekly_menu_meals;
create policy "weekly_menu_meals_owner" on public.weekly_menu_meals
for all using (
  exists (
    select 1
    from public.weekly_menu_days d
    join public.weekly_menus wm on wm.id = d.weekly_menu_id
    where d.id = weekly_menu_day_id and wm.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.weekly_menu_days d
    join public.weekly_menus wm on wm.id = d.weekly_menu_id
    where d.id = weekly_menu_day_id and wm.user_id = auth.uid()
  )
);

drop policy if exists "grocery_lists_owner" on public.grocery_lists;
create policy "grocery_lists_owner" on public.grocery_lists
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "grocery_list_items_owner" on public.grocery_list_items;
create policy "grocery_list_items_owner" on public.grocery_list_items
for all using (
  exists (
    select 1 from public.grocery_lists gl
    where gl.id = grocery_list_id and gl.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.grocery_lists gl
    where gl.id = grocery_list_id and gl.user_id = auth.uid()
  )
);
