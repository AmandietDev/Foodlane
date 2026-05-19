-- 018: normalisation par LISTE BLANCHE des equipements (recipes_v2)
--
-- Apres la migration 017 (stop list), il restait encore beaucoup de variantes
-- non nettoyees a cause de :
--   - separateurs virgule au lieu de ; (ex: "couscoussier,planche,bol")
--   - variantes / pluriels / compositions (ex: "poele large", "4 bols",
--     "mixeur ou blender", "barbecue ou four grill")
--   - tokens descriptifs ("casserole pour bouillon", "plat pour marinade")
--
-- Strategie inversee : au lieu d'ajouter des stop words a l'infini, on
-- ne GARDE QUE les tokens qui matchent un equipement canonique connu
-- (liste blanche). Tout le reste est supprime.
--
-- Liste blanche alignee sur EQUIPMENT_OPTIONS cote UI :
--   four, micro_ondes, plaque_cuisson, refrigerateur, congelateur,
--   blender, robot_cuiseur, airfryer, autocuiseur,
--   gaufrier, yaourtiere, machine_a_pain, barbecue,
--   cuiseur_vapeur, spiraliseur
--
-- Idempotent : peut etre relancee plusieurs fois sans risque.


-- 1. Normaliser les separateurs : virgule, " ou ", " et " => ";"
update public.recipes_v2
set equipements_necessaires = regexp_replace(
  equipements_necessaires,
  '\s*,\s*|\s+ou\s+|\s+et\s+',
  ';',
  'gi'
)
where equipements_necessaires is not null
  and equipements_necessaires ~* ',|\s+ou\s+|\s+et\s+';


-- 2. Pass principal : LISTE BLANCHE
-- Pour chaque token, on tente de le matcher vers une cle canonique.
-- Tout token sans match est supprime. Le DISTINCT evite les doublons
-- generes par la splitting (ex: "four ou four grill" -> "four;four").
update public.recipes_v2
set equipements_necessaires = nullif(
  (
    select string_agg(distinct canonical, ';' order by canonical)
    from unnest(string_to_array(equipements_necessaires, ';')) as t(token)
    cross join lateral (
      select case
        -- Ordre IMPORTANT : tester les cas specifiques avant les generiques.

        -- Micro-ondes (avant "four" qui pourrait matcher "four micro-ondes")
        when public._foodlane_norm_equip(token) ~ 'micro.?ondes?|microondes?' then 'micro_ondes'

        -- Robot cuiseur (avant "mixeur" qui matcherait "robot mixeur")
        when public._foodlane_norm_equip(token) ~ '\mthermomix\M|\mcompanion\M|\mcookeo\M|robot cuiseur|robot patissier|robot culinaire|robot menager|robot kenwood|robot moulinex' then 'robot_cuiseur'

        -- Air fryer
        when public._foodlane_norm_equip(token) ~ 'air.?fryer|friteuse a air|friteuse sans huile|friteuse chaud' then 'airfryer'

        -- Blender / mixeur
        when public._foodlane_norm_equip(token) ~ '\mblender\M|\mmixeur\M|\mmixer\M' then 'blender'

        -- Autocuiseur / cocotte-minute
        when public._foodlane_norm_equip(token) ~ '\mautocuiseur\M|cocotte.?minute|instant pot' then 'autocuiseur'

        -- Cuiseur vapeur
        when public._foodlane_norm_equip(token) ~ 'cuiseur vapeur|panier vapeur|vapeur electrique|cuit.?vapeur' then 'cuiseur_vapeur'

        -- Gaufrier
        when public._foodlane_norm_equip(token) ~ '\mgaufrier\M' then 'gaufrier'

        -- Yaourtiere
        when public._foodlane_norm_equip(token) ~ '\myaourtiere\M' then 'yaourtiere'

        -- Machine a pain
        when public._foodlane_norm_equip(token) ~ 'machine a pain|machine.?pain|\mmap\M' then 'machine_a_pain'

        -- Barbecue / plancha
        when public._foodlane_norm_equip(token) ~ '\mbarbecue\M|\mplancha\M|\mbbq\M' then 'barbecue'

        -- Spiraliseur
        when public._foodlane_norm_equip(token) ~ 'spiraliseur|spiralizer' then 'spiraliseur'

        -- Refrigerateur / congelateur
        when public._foodlane_norm_equip(token) ~ 'congelateur|surgele' then 'congelateur'
        when public._foodlane_norm_equip(token) ~ 'refrigerateur|\mfrigo\M' then 'refrigerateur'

        -- Robot tout seul = robot_cuiseur par defaut
        when public._foodlane_norm_equip(token) = 'robot' then 'robot_cuiseur'

        -- Four (tres generique, en avant-dernier)
        when public._foodlane_norm_equip(token) ~ '\mfour\M'
             and public._foodlane_norm_equip(token) !~ 'plaque|grille|moule' then 'four'

        -- Plaque de cuisson (gaz / induction / cuisiniere)
        when public._foodlane_norm_equip(token) ~ '\mplaque\M|cuisiniere|\minduction\M|\mgaz\M|feux?(\s|$)'
             and public._foodlane_norm_equip(token) !~ 'four|patisserie' then 'plaque_cuisson'

        else null
      end as canonical
    ) as c
    where canonical is not null
  ),
  ''
)
where equipements_necessaires is not null;


-- 3. Nettoyer les ;; orphelins eventuels et passer en NULL si vide
update public.recipes_v2
set equipements_necessaires = trim(both ';' from
  regexp_replace(equipements_necessaires, ';;+', ';', 'g')
)
where equipements_necessaires ~ ';;|^;|;$';

update public.recipes_v2
set equipements_necessaires = null
where equipements_necessaires = '';


-- 4. Diagnostic : relancer la requete 1 de la migration 016 doit maintenant
-- ne retourner QUE les 15 cles canoniques ci-dessus (et aucune autre).
--
-- select
--   lower(trim(equip)) as equipement,
--   count(*) as nb_recettes
-- from public.recipes_v2,
--      unnest(string_to_array(equipements_necessaires, ';')) as equip
-- where equipements_necessaires is not null
--   and trim(equip) <> ''
-- group by lower(trim(equip))
-- order by nb_recettes desc;
