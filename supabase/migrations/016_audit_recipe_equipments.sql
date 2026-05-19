-- 016: AUDIT du champ equipements_necessaires dans recipes_v2
--
-- Ce fichier ne modifie RIEN. Il contient 4 requetes SELECT que tu peux
-- executer dans l'editeur SQL Supabase pour voir l'etat actuel des
-- equipements avant de lancer la migration 017 (nettoyage).
--
-- Tu peux executer tout le fichier d'un coup : chaque bloc renvoie son
-- propre resultat (4 onglets de resultats).

-- 1. Distribution complete des equipements (triee par frequence)
-- Tu vas voir les "stop words" pollueurs : couteau, planche, saladier,
-- casserole, fouet... qui apparaissent dans des milliers de recettes.
select
  lower(trim(equip)) as equipement,
  count(*) as nb_recettes
from public.recipes_v2,
     unnest(string_to_array(equipements_necessaires, ';')) as equip
where equipements_necessaires is not null
  and trim(equip) <> ''
group by lower(trim(equip))
order by nb_recettes desc;

-- 2. Moyenne et max d'equipements par recette (etat actuel)
select
  round(avg(array_length(string_to_array(equipements_necessaires, ';'), 1)), 2)
    as moyenne_equipements_par_recette,
  max(array_length(string_to_array(equipements_necessaires, ';'), 1))
    as max_equipements_par_recette,
  count(*) as nb_recettes_avec_equipements
from public.recipes_v2
where equipements_necessaires is not null;

-- 3. Top 20 des recettes avec le plus d'equipements listes
-- Pour voir concretement a quoi ressemble la pollution.
select
  id,
  nom_recette,
  equipements_necessaires,
  array_length(string_to_array(equipements_necessaires, ';'), 1) as nb_equip
from public.recipes_v2
where equipements_necessaires is not null
order by nb_equip desc nulls last
limit 20;

-- 4. Equipements RARES (presents dans moins de 50 recettes)
-- Tout ce qui sort ici merite attention :
--   - soit c'est un vrai equipement special (gaufrier, sorbetiere...)
--   - soit c'est une typo ou variante a harmoniser
select
  lower(trim(equip)) as equipement,
  count(*) as nb_recettes
from public.recipes_v2,
     unnest(string_to_array(equipements_necessaires, ';')) as equip
where equipements_necessaires is not null
  and trim(equip) <> ''
group by lower(trim(equip))
having count(*) < 50
order by nb_recettes desc;
