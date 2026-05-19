-- Migration 013 : ajout du niveau de compétence cuisine dans les préférences utilisateur

alter table public.user_preferences
  add column if not exists cooking_skill_level text not null default 'intermediaire'
    check (cooking_skill_level in ('debutant', 'intermediaire', 'confirme'));
