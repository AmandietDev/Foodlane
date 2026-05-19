-- 015: normalisation des valeurs meal_slot dans recipes_v2
--
-- Objectif : corriger les typos et harmoniser les variantes pour que le moteur
-- de génération de menus matche correctement les recettes par créneau.
--
-- Découvert via /api/planner/debug-pool :
--   - "tiner"               → typo de "diner"               (2 recettes affectées)
--   - "apero"               → variante de "aperitif"         (7 recettes)
--   - "smoothie bowl"       → conserver mais s'assurer du séparateur
--
-- Sans casser les valeurs valides existantes : on remplace SEULEMENT les
-- tokens fautifs (et pas les chaînes qui les contiennent par hasard).
--
-- Idempotent : peut être ré-exécuté sans risque.

-- ── 1. "tiner" → "diner" ────────────────────────────────────────────────
-- Cas observés : "petit_dejeuner;dejeuner;tiner"
update public.recipes_v2
set meal_slot = regexp_replace(meal_slot, '(^|[;,|])tiner($|[;,|])', '\1diner\2', 'g')
where meal_slot ~ '(^|[;,|])tiner($|[;,|])';

-- ── 2. "apero" → "aperitif" ─────────────────────────────────────────────
update public.recipes_v2
set meal_slot = regexp_replace(meal_slot, '(^|[;,|])apero($|[;,|])', '\1aperitif\2', 'g')
where meal_slot ~ '(^|[;,|])apero($|[;,|])';

-- ── 3. Trim espaces autour des séparateurs (au cas où) ─────────────────
update public.recipes_v2
set meal_slot = regexp_replace(meal_slot, '\s*([;,|])\s*', '\1', 'g')
where meal_slot ~ '\s*[;,|]\s+|\s+[;,|]';

-- ── 4. Diagnostic : compter les variantes restantes ────────────────────
-- Lance cette requête manuellement après pour valider :
--
-- select unnest(string_to_array(replace(replace(meal_slot, '|', ';'), ',', ';'), ';')) as slot,
--        count(*) as nb
-- from public.recipes_v2
-- where meal_slot is not null
-- group by slot
-- order by nb desc;
