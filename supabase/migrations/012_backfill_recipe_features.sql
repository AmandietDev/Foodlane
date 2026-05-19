-- Backfill heuristique des nouvelles colonnes de recettes_v2
-- Exécutable plusieurs fois (idempotent côté valeurs déjà remplies via COALESCE)

update public.recipes_v2
set
  family = coalesce(
    family,
    case
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(type, '') || ' ' || coalesce(ingredients, '')) ~ '(smoothie|milkshake)' then 'boisson'
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(ingredients, '')) ~ '(soupe|velout|potage|bouillon)' then 'soupe'
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(ingredients, '')) ~ '(salade|taboul|coleslaw)' then 'salade'
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(ingredients, '')) ~ '(gratin|parmentier)' then 'gratin'
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(ingredients, '')) ~ '(quiche|tarte|tourte)' then 'tarte_salee'
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(ingredients, '')) ~ '(pizza)' then 'pizza'
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(ingredients, '')) ~ '(curry|dahl|dal)' then 'curry'
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(ingredients, '')) ~ '(pates|spaghetti|penne|tagliatelle|lasagne|gnocchi)' then 'pates'
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(ingredients, '')) ~ '(riz|risotto)' then 'riz'
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(ingredients, '')) ~ '(omelette|oeufs brouilles|oeuf coque)' then 'oeufs'
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(type, '')) ~ '(dessert|gateau|cookie|brownie|sucre)' then 'dessert'
      else null
    end
  ),
  cooking_method = coalesce(
    cooking_method,
    case
      when lower(coalesce(instructions, '') || ' ' || coalesce(nom_recette, '')) ~ '(four|enfourner|gratin|roti)' then 'four'
      when lower(coalesce(instructions, '') || ' ' || coalesce(nom_recette, '')) ~ '(poele|saute|wok|faire revenir)' then 'poele'
      when lower(coalesce(instructions, '') || ' ' || coalesce(nom_recette, '')) ~ '(mijot|ragout|daube)' then 'mijote'
      when lower(coalesce(instructions, '') || ' ' || coalesce(nom_recette, '')) ~ '(vapeur)' then 'vapeur'
      when lower(coalesce(instructions, '') || ' ' || coalesce(nom_recette, '')) ~ '(grill|barbecue)' then 'grille'
      when lower(coalesce(instructions, '') || ' ' || coalesce(nom_recette, '')) ~ '(cru|sans cuisson|marin)' then 'cru'
      else null
    end
  ),
  texture = coalesce(
    texture,
    case
      when lower(coalesce(description_courte, '') || ' ' || coalesce(nom_recette, '')) ~ '(croquant|croustillant|crunchy)' then 'croquant'
      when lower(coalesce(description_courte, '') || ' ' || coalesce(nom_recette, '')) ~ '(cremeux|onctueux)' then 'cremeux'
      when lower(coalesce(description_courte, '') || ' ' || coalesce(nom_recette, '')) ~ '(fondant|moelleux)' then 'fondant'
      when lower(coalesce(description_courte, '') || ' ' || coalesce(nom_recette, '')) ~ '(soupe|velout|bouillon|liquide)' then 'liquide'
      when lower(coalesce(description_courte, '') || ' ' || coalesce(nom_recette, '')) ~ '(epais|consistant)' then 'epais'
      else null
    end
  ),
  meal_subtype = coalesce(
    meal_subtype,
    case
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(type, '')) ~ '(petit dej|petit-dej|breakfast|brunch)' then 'breakfast'
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(type, '')) ~ '(collation|snack|gouter)' then 'snack'
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(type, '')) ~ '(entree)' then 'entree'
      when lower(coalesce(nom_recette, '') || ' ' || coalesce(type, '')) ~ '(dessert|gateau|cookie|sucre)' then 'dessert'
      else 'plat_principal'
    end
  )
where
  family is null
  or cooking_method is null
  or texture is null
  or meal_subtype is null;
