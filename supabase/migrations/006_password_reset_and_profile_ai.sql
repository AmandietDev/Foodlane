-- Réinitialisation mot de passe (tokens) + champs profil pour IA / onboarding

create table if not exists public.password_reset_tokens (
  token uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_password_reset_tokens_user_id on public.password_reset_tokens(user_id);
create index if not exists idx_password_reset_tokens_expires_at on public.password_reset_tokens(expires_at);

alter table public.password_reset_tokens enable row level security;

-- Pas de policies : accès uniquement via service_role (API serveur)

alter table public.user_preferences
  add column if not exists custom_goal text,
  add column if not exists cooking_skill_level text not null default 'intermediaire';

comment on column public.user_preferences.custom_goal is 'Objectif libre si chip Autre (max 150 car. côté app)';
comment on column public.user_preferences.cooking_skill_level is 'debutant | intermediaire | confirme';
