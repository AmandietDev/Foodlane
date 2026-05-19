type FeatureInput = {
  nom_recette?: string | null;
  type?: string | null;
  ingredients?: string | null;
  instructions?: string | null;
  family?: string | null;
  cooking_method?: string | null;
  texture?: string | null;
  meal_subtype?: string | null;
};

function n(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function pickFamily(text: string): string | null {
  if (/\b(smoothie|milkshake)\b/.test(text)) return "boisson";
  if (/\b(soupe|veloute|potage|bouillon)\b/.test(text)) return "soupe";
  if (/\b(salade|taboule|coleslaw)\b/.test(text)) return "salade";
  if (/\b(gratin|parmentier)\b/.test(text)) return "gratin";
  if (/\b(quiche|tarte|tourte)\b/.test(text)) return "tarte_salee";
  if (/\b(pizza)\b/.test(text)) return "pizza";
  if (/\b(curry|dahl|dal)\b/.test(text)) return "curry";
  if (/\b(pates|spaghetti|penne|tagliatelle|lasagne|gnocchi)\b/.test(text)) return "pates";
  if (/\b(riz|risotto)\b/.test(text)) return "riz";
  if (/\b(omelette|oeufs brouilles|oeuf coque)\b/.test(text)) return "oeufs";
  if (/\b(sandwich|burger|wrap|tacos|quesadilla)\b/.test(text)) return "sandwich_wrap";
  if (/\b(crepe|pancake|gaufre|porridge)\b/.test(text)) return "petit_dejeuner";
  if (/\b(gateau|cake|muffin|cookie|dessert|brownie)\b/.test(text)) return "dessert";
  return null;
}

function pickCookingMethod(text: string): string | null {
  if (/\b(four|gratin|roti|roti|enfourner)\b/.test(text)) return "four";
  if (/\b(poele|saute|wok|faire revenir)\b/.test(text)) return "poele";
  if (/\b(mijoter|mijote|ragout|daube)\b/.test(text)) return "mijote";
  if (/\b(vapeur)\b/.test(text)) return "vapeur";
  if (/\b(grill|barbecue)\b/.test(text)) return "grille";
  if (/\b(cru|sans cuisson|mariner)\b/.test(text)) return "cru";
  return null;
}

function pickTexture(text: string): string | null {
  if (/\b(croquant|crunchy|croustillant)\b/.test(text)) return "croquant";
  if (/\b(cremeux|onctueux)\b/.test(text)) return "cremeux";
  if (/\b(fondant|moelleux)\b/.test(text)) return "fondant";
  if (/\b(liquide|bouillon|soupe|veloute)\b/.test(text)) return "liquide";
  if (/\b(epais|consistant)\b/.test(text)) return "epais";
  return null;
}

function pickMealSubtype(text: string, typeRaw: string): string | null {
  if (/\b(petit dej|petit-dej|breakfast|brunch)\b/.test(text)) return "breakfast";
  if (/\b(collation|snack|gouter)\b/.test(text)) return "snack";
  if (/\b(entree)\b/.test(text)) return "entree";
  if (/\b(dessert|gateau|tarte sucree|cookie)\b/.test(text) || /sucre/.test(typeRaw)) return "dessert";
  if (/\b(salade|sandwich|wrap|bowl)\b/.test(text)) return "dejeuner_rapide";
  return "plat_principal";
}

export function deriveRecipeFeatures(input: FeatureInput): {
  family: string | null;
  cooking_method: string | null;
  texture: string | null;
  meal_subtype: string | null;
} {
  const text = n(
    `${input.nom_recette || ""} ${input.type || ""} ${input.ingredients || ""} ${input.instructions || ""}`
  );
  const typeRaw = n(input.type || "");
  return {
    family: input.family ?? pickFamily(text),
    cooking_method: input.cooking_method ?? pickCookingMethod(text),
    texture: input.texture ?? pickTexture(text),
    meal_subtype: input.meal_subtype ?? pickMealSubtype(text, typeRaw),
  };
}
