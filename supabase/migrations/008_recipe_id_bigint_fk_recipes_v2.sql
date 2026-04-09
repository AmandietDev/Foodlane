-- Migration robuste des références recette vers bigint + FK recipes_v2(id)
-- Objectif:
-- 1) détecter les valeurs non convertibles
-- 2) sauvegarder les anciennes colonnes texte (réversibilité)
-- 3) convertir en bigint
-- 4) recréer/forcer les FK vers public.recipes_v2(id)
--
-- Tables ciblées (si elles existent):
-- - public.saved_recipes(recipe_id)
-- - public.collection_recipes(recipe_id)
-- - public.user_favorites(recipe_id)
-- - public.user_collection_recipes(recipe_id)
-- - public.weekly_menu_meals(recipe_id)
-- - public.grocery_list_items(source_recipe_ids text[] -> bigint[])

do $$
declare
  t text;
  bad_count bigint;
  bad_sample text;
begin
  -- Pré-check: recipe_id texte -> bigint
  foreach t in array array[
    'saved_recipes',
    'collection_recipes',
    'user_favorites',
    'user_collection_recipes',
    'weekly_menu_meals'
  ]
  loop
    if to_regclass('public.' || t) is not null
       and exists (
         select 1
         from information_schema.columns c
         where c.table_schema = 'public'
           and c.table_name = t
           and c.column_name = 'recipe_id'
       )
    then
      execute format(
        'select count(*) from public.%I where recipe_id is not null and btrim(recipe_id::text) <> '''' and btrim(recipe_id::text) !~ ''^\d+$''',
        t
      )
      into bad_count;

      if bad_count > 0 then
        execute format(
          'select string_agg(distinct recipe_id::text, '', '' order by recipe_id::text) from (select recipe_id from public.%I where recipe_id is not null and btrim(recipe_id::text) <> '''' and btrim(recipe_id::text) !~ ''^\d+$'' limit 20) s',
          t
        )
        into bad_sample;

        raise exception
          'Migration bloquée: %.recipe_id contient % valeur(s) non convertible(s) en bigint. Exemples: %',
          t, bad_count, coalesce(bad_sample, '(aucun échantillon)');
      end if;
    end if;
  end loop;

  -- Pré-check: grocery_list_items.source_recipe_ids text[] -> bigint[]
  if to_regclass('public.grocery_list_items') is not null
     and exists (
       select 1
       from information_schema.columns c
       where c.table_schema = 'public'
         and c.table_name = 'grocery_list_items'
         and c.column_name = 'source_recipe_ids'
     )
  then
    select count(*)
    into bad_count
    from public.grocery_list_items gli
    where exists (
      select 1
      from unnest(coalesce(gli.source_recipe_ids, '{}')) as x(val)
      where btrim(val) <> '' and btrim(val) !~ '^\d+$'
    );

    if bad_count > 0 then
      select string_agg(distinct x.val, ', ' order by x.val)
      into bad_sample
      from (
        select x.val
        from public.grocery_list_items gli
        cross join lateral unnest(coalesce(gli.source_recipe_ids, '{}')) as x(val)
        where btrim(x.val) <> '' and btrim(x.val) !~ '^\d+$'
        limit 20
      ) x;

      raise exception
        'Migration bloquée: grocery_list_items.source_recipe_ids contient % valeur(s) non convertible(s). Exemples: %',
        bad_count, coalesce(bad_sample, '(aucun échantillon)');
    end if;
  end if;
end
$$;

-- Supprime d'abord les FK existantes sur recipe_id (important AVANT conversion de type)
do $$
declare
  rec record;
begin
  for rec in
    select
      tc.table_name,
      tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
     and tc.table_name = kcu.table_name
    where tc.table_schema = 'public'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'recipe_id'
      and tc.table_name in (
        'saved_recipes',
        'collection_recipes',
        'user_favorites',
        'user_collection_recipes',
        'weekly_menu_meals'
      )
  loop
    execute format(
      'alter table public.%I drop constraint if exists %I',
      rec.table_name,
      rec.constraint_name
    );
  end loop;
end
$$;

-- Sauvegarde legacy + conversion recipe_id
do $$
declare
  t text;
begin
  foreach t in array array[
    'saved_recipes',
    'collection_recipes',
    'user_favorites',
    'user_collection_recipes',
    'weekly_menu_meals'
  ]
  loop
    if to_regclass('public.' || t) is not null
       and exists (
         select 1
         from information_schema.columns c
         where c.table_schema = 'public'
           and c.table_name = t
           and c.column_name = 'recipe_id'
       )
    then
      -- Colonne backup (réversibilité)
      execute format(
        'alter table public.%I add column if not exists recipe_id_legacy_text text',
        t
      );
      execute format(
        'update public.%I set recipe_id_legacy_text = recipe_id::text where recipe_id_legacy_text is null',
        t
      );

      -- Conversion type
      execute format(
        'alter table public.%I alter column recipe_id type bigint using nullif(btrim(recipe_id::text), '''')::bigint',
        t
      );
    end if;
  end loop;
end
$$;

-- Backup + conversion source_recipe_ids
do $$
begin
  if to_regclass('public.grocery_list_items') is not null
     and exists (
       select 1
       from information_schema.columns c
       where c.table_schema = 'public'
         and c.table_name = 'grocery_list_items'
         and c.column_name = 'source_recipe_ids'
     )
  then
    alter table public.grocery_list_items
      add column if not exists source_recipe_ids_legacy_text text[];

    update public.grocery_list_items
    set source_recipe_ids_legacy_text = source_recipe_ids
    where source_recipe_ids_legacy_text is null;

    -- Conversion robuste sans USING + sous-requête (non supporté ici)
    alter table public.grocery_list_items
      add column if not exists source_recipe_ids_bigint bigint[] not null default '{}';

    update public.grocery_list_items
    set source_recipe_ids_bigint = (
      case
        when source_recipe_ids is null then '{}'::bigint[]
        else array(
          select nullif(btrim(x), '')::bigint
          from unnest(source_recipe_ids) as x
          where btrim(x) <> ''
        )
      end
    );

    alter table public.grocery_list_items drop column if exists source_recipe_ids;
    alter table public.grocery_list_items rename column source_recipe_ids_bigint to source_recipe_ids;
  end if;
end
$$;

-- Recrée les FK vers recipes_v2(id)
do $$
begin
  if to_regclass('public.recipes_v2') is null then
    raise exception 'recipes_v2 est introuvable. Créez public.recipes_v2 avant cette migration.';
  end if;

  if to_regclass('public.saved_recipes') is not null then
    alter table public.saved_recipes
      add constraint saved_recipes_recipe_id_fkey
      foreign key (recipe_id) references public.recipes_v2(id)
      on update cascade on delete cascade;
  end if;

  if to_regclass('public.collection_recipes') is not null then
    alter table public.collection_recipes
      add constraint collection_recipes_recipe_id_fkey
      foreign key (recipe_id) references public.recipes_v2(id)
      on update cascade on delete cascade;
  end if;

  if to_regclass('public.user_favorites') is not null then
    alter table public.user_favorites
      add constraint user_favorites_recipe_id_fkey
      foreign key (recipe_id) references public.recipes_v2(id)
      on update cascade on delete cascade;
  end if;

  if to_regclass('public.user_collection_recipes') is not null then
    alter table public.user_collection_recipes
      add constraint user_collection_recipes_recipe_id_fkey
      foreign key (recipe_id) references public.recipes_v2(id)
      on update cascade on delete cascade;
  end if;

  if to_regclass('public.weekly_menu_meals') is not null then
    alter table public.weekly_menu_meals
      add constraint weekly_menu_meals_recipe_id_fkey
      foreign key (recipe_id) references public.recipes_v2(id)
      on update cascade on delete set null;
  end if;
end
$$;

-- Index utilitaires (si absents)
do $$
begin
  if to_regclass('public.saved_recipes') is not null then
    create index if not exists idx_saved_recipes_recipe_id on public.saved_recipes(recipe_id);
  end if;
  if to_regclass('public.collection_recipes') is not null then
    create index if not exists idx_collection_recipes_recipe_id on public.collection_recipes(recipe_id);
  end if;
  if to_regclass('public.user_favorites') is not null then
    create index if not exists idx_user_favorites_recipe_id on public.user_favorites(recipe_id);
  end if;
  if to_regclass('public.user_collection_recipes') is not null then
    create index if not exists idx_user_collection_recipes_recipe_id on public.user_collection_recipes(recipe_id);
  end if;
  if to_regclass('public.weekly_menu_meals') is not null then
    create index if not exists idx_weekly_menu_meals_recipe_id on public.weekly_menu_meals(recipe_id);
  end if;
end
$$;
