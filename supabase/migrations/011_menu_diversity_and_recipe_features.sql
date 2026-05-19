-- P2: enrichissement du schéma recettes pour réduire les heuristiques textuelles
alter table if exists public.recipes_v2
  add column if not exists family text,
  add column if not exists cooking_method text,
  add column if not exists texture text,
  add column if not exists meal_subtype text;

create index if not exists idx_recipes_v2_family on public.recipes_v2 (family);
create index if not exists idx_recipes_v2_meal_subtype on public.recipes_v2 (meal_subtype);
create index if not exists idx_recipes_v2_cooking_method on public.recipes_v2 (cooking_method);

-- P1: mémoire inter-générations orientée diversité
create table if not exists public.user_menu_feature_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weekly_menu_id uuid null references public.weekly_menus(id) on delete set null,
  week_start_date date not null,
  recipe_ids bigint[] not null default '{}',
  family_counts jsonb not null default '{}'::jsonb,
  diversity_tags_counts jsonb not null default '{}'::jsonb,
  unique_ratio numeric(5,4) null,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_menu_feature_history_user_created
  on public.user_menu_feature_history (user_id, created_at desc);

alter table public.user_menu_feature_history enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_menu_feature_history'
      and policyname = 'Users can read their own feature history'
  ) then
    create policy "Users can read their own feature history"
      on public.user_menu_feature_history
      for select
      using (auth.uid() = user_id);
  end if;
end $$;
