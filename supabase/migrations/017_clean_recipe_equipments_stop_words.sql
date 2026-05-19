-- 017: nettoyage des "stop words" dans equipements_necessaires (recipes_v2)
--
-- Objectif : retirer les equipements basiques que tout le monde a dans
-- sa cuisine (couteau, planche, saladier, casserole, fouet...). Ces tokens
-- polluent le champ et empechent un eventuel filtre equipement futur de
-- fonctionner correctement.
--
-- Strategie :
--   1. Creer une fonction de normalisation (lowercase + retire accents).
--   2. Splitter equipements_necessaires sur ; , filtrer les stop words,
--      rejoindre. Si tout est retire => NULL.
--   3. Harmoniser les variantes vers les cles canoniques.
--
-- IMPORTANT : execute d'abord la migration 016 (audit) pour valider la
-- liste de stop words ci-dessous.
--
-- Idempotent : peut etre relancee plusieurs fois sans risque.


-- 1. Fonction utilitaire de normalisation (sans extension unaccent)
-- Lowercase + retrait des accents les plus courants.
-- Utilise des escape Unicode pour eviter tout probleme d'encodage du fichier.
create or replace function public._foodlane_norm_equip(s text)
returns text
language sql
immutable
as $$
  select translate(
    lower(trim(coalesce(s, ''))),
    E'\u00e0\u00e1\u00e2\u00e4\u00e3\u00e5\u00e7\u00e8\u00e9\u00ea\u00eb\u00ec\u00ed\u00ee\u00ef\u00f1\u00f2\u00f3\u00f4\u00f6\u00f5\u00f9\u00fa\u00fb\u00fc\u00fd\u00ff',
    'aaaaaaceeeeiiiinooooouuuuyy'
  )
$$;


-- 2. Nettoyage : retirer les tokens dont la forme normalisee est un stop word
update public.recipes_v2
set equipements_necessaires = nullif(
  (
    select string_agg(trim(token), ';')
    from unnest(string_to_array(equipements_necessaires, ';')) as t(token)
    where trim(token) <> ''
      and public._foodlane_norm_equip(token) not in (
        -- Outils de decoupe / preparation
        'couteau', 'couteau de chef', 'couteau d''office', 'couteau d office',
        'couteau a pain', 'couteau de cuisine',
        'planche', 'planche a decouper', 'planche de cuisine',
        'ciseaux', 'ciseaux de cuisine',
        -- Contenants basiques
        'saladier', 'bol', 'bol melangeur', 'cul de poule', 'recipient',
        'jatte', 'terrine',
        -- Cuisson basique
        'casserole', 'casseroles', 'petite casserole', 'grande casserole',
        'poele', 'poele anti-adhesive', 'poele a frire', 'poele creuse',
        'sauteuse', 'faitout', 'marmite',
        -- Egouttage / filtrage
        'passoire', 'tamis', 'chinois', 'passoire fine',
        -- Ustensiles a main
        'fouet', 'fouet manuel', 'fouet a main',
        'spatule', 'spatule en bois', 'spatule silicone', 'maryse',
        'cuillere en bois', 'cuillere a bois', 'cuillere bois',
        'cuillere', 'louche', 'ecumoire', 'pince', 'pince de cuisine',
        'pinceau', 'pinceau de cuisine',
        -- Preparation manuelle
        'econome', 'eplucheur', 'epluche-legume',
        'rape', 'rape a fromage', 'rape manuelle',
        'ouvre boite', 'ouvre-boite', 'tire-bouchon', 'tire bouchon',
        'decapsuleur',
        -- Mesure
        'verre doseur', 'balance', 'balance de cuisine',
        'cuillere a soupe', 'cuillere a cafe', 'cuillere doseuse',
        'cuilleres mesures', 'cuilleres mesure', 'verre mesureur',
        -- Cuisson au four basique (moules = tout le monde a)
        'moule', 'moule a gateau', 'moule a tarte', 'moule a muffins',
        'moule a cake', 'moule a manque', 'moule a charlotte',
        'moule silicone', 'plat a gratin', 'plat allant au four',
        'plaque de cuisson four', 'plaque four', 'plaque a patisserie',
        'grille du four',
        -- Consommables
        'papier cuisson', 'papier sulfurise', 'papier aluminium',
        'aluminium', 'film alimentaire', 'film etirable', 'film plastique',
        'sachet congelation',
        -- Petits accessoires
        'bac a glacons', 'bac a glacon',
        'presse ail', 'presse-ail', 'presse citron', 'presse-citron',
        'rouleau a patisserie', 'rouleau patisserie',
        'essoreuse a salade', 'essoreuse',
        'minuteur', 'thermometre', 'thermometre de cuisine',
        -- Mots-vides explicites
        'aucun', 'rien', 'standard', 'basique', 'classique',
        'ustensiles de base', 'ustensiles classiques'
      )
  ),
  ''
)
where equipements_necessaires is not null;


-- 3. Harmonisation des variantes vers les cles canoniques EQUIPMENT_OPTIONS

update public.recipes_v2
set equipements_necessaires = regexp_replace(
  equipements_necessaires,
  '(^|;)(mixeur plongeant|mixeur|mixer)($|;)',
  '\1blender\3',
  'gi'
)
where equipements_necessaires ~* '(^|;)(mixeur plongeant|mixeur|mixer)($|;)';

update public.recipes_v2
set equipements_necessaires = regexp_replace(
  equipements_necessaires,
  '(^|;)(thermomix|companion|cookeo|robot patissier|robot culinaire|robot)($|;)',
  '\1robot_cuiseur\3',
  'gi'
)
where equipements_necessaires ~* '(^|;)(thermomix|companion|cookeo|robot patissier|robot culinaire|robot)($|;)';

update public.recipes_v2
set equipements_necessaires = regexp_replace(
  equipements_necessaires,
  '(^|;)(cocotte-minute|cocotte minute|instant pot)($|;)',
  '\1autocuiseur\3',
  'gi'
)
where equipements_necessaires ~* '(^|;)(cocotte-minute|cocotte minute|instant pot)($|;)';

update public.recipes_v2
set equipements_necessaires = regexp_replace(
  equipements_necessaires,
  '(^|;)(friteuse sans huile|air-fryer|air fryer)($|;)',
  '\1airfryer\3',
  'gi'
)
where equipements_necessaires ~* '(^|;)(friteuse sans huile|air-fryer|air fryer)($|;)';

update public.recipes_v2
set equipements_necessaires = regexp_replace(
  equipements_necessaires,
  '(^|;)(four micro-ondes|four micro ondes|micro-onde|micro onde|micro ondes)($|;)',
  '\1micro_ondes\3',
  'gi'
)
where equipements_necessaires ~* '(^|;)(four micro-ondes|four micro ondes|micro-onde|micro onde|micro ondes)($|;)';


-- 4. Trim final : enlever les ;; et les ; en debut/fin
update public.recipes_v2
set equipements_necessaires = trim(both ';' from
  regexp_replace(equipements_necessaires, ';;+', ';', 'g')
)
where equipements_necessaires ~ ';;|^;|;$';

update public.recipes_v2
set equipements_necessaires = null
where equipements_necessaires = '';
