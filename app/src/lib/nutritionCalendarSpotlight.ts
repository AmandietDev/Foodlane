/**
 * Rappels calendaires (santé, nutrition, bien-être) + actions concrètes.
 * Dates indicatives : à adapter chaque année si besoin (fêtes mobiles).
 */

export type NutritionSpotlight = {
  title: string;
  hook: string;
  ideas: string[];
};

type Rule = { match: (d: Date) => boolean; spotlight: NutritionSpotlight };

const rules: Rule[] = [
  {
    match: (d) => d.getMonth() === 0 && d.getDate() <= 15,
    spotlight: {
      title: "Janvier : repères sans « régime miracle »",
      hook: "Les autorités de santé rappellent souvent en début d’année de privilégier des habitudes durables plutôt que des restrictions extrêmes.",
      ideas: [
        "Regarder une vidéo courte d’un nutritionniste diplômé sur les bases d’une assiette équilibrée (HAS, sociétés savantes).",
        "Lire 10 pages d’un essai type « Alimentation intuitive » (Tribole & Resch) ou « Changer d’alimentation » (Zermati) — au choix selon ton style.",
        "Écrire 3 repas « faciles » pour la semaine qui te plaisent vraiment, sans les noter en calories.",
      ],
    },
  },
  {
    match: (d) => d.getMonth() === 2 && d.getDate() === 8,
    spotlight: {
      title: "Journée internationale des droits des femmes (8 mars)",
      hook: "C’est aussi l’occasion de parler prévention santé femmes : fer, calcium, santé osseuse et charge mentale autour des repas au foyer.",
      ideas: [
        "Prévoir un repas où les tâches cuisine sont partagées (courses + cuisson + vaisselle).",
        "Ajouter une source de fer + vitamine C le même repas (ex. lentilles + salade au citron).",
        "Écouter un épisode de podcast bien-être / société sur la charge mentale domestique.",
      ],
    },
  },
  {
    match: (d) => d.getMonth() === 4 && d.getDate() === 31,
    spotlight: {
      title: "Journée mondiale sans tabac",
      hook: "Arrêter de fumer améliore goût, odorat et envies alimentaires ; c’est un levier majeur pour l’équilibre nutritionnel.",
      ideas: [
        "Consulter la ligne Tabac Info Service (3919) ou l’espace en ligne du même nom pour un parcours gratuit.",
        "Remplacer la pause cigarette par 5 minutes de marche + une boisson sans sucre.",
        "Noter ce qui déclenche l’envie de fumer (café, stress) et une alternative pour chaque cas.",
      ],
    },
  },
  {
    match: (d) => d.getMonth() === 4 && d.getDate() >= 25 && d.getDate() <= 31,
    spotlight: {
      title: "Fin mai : fête des mères (souvent le dernier dimanche de mai)",
      hook: "Un repas partagé peut être simple et soigné : l’important est le plaisir et la convivialité, pas la perfection.",
      ideas: [
        "Préparer un brunch maison : pain, œufs, salade de fruits, jus — recruter une personne pour chaque bloc.",
        "Offrir un livre de recettes familiales végétariennes ou méditerranéennes selon ses goûts.",
        "Proposer une marche digestive ensemble après le repas (15–20 min).",
      ],
    },
  },
  {
    match: (d) => d.getMonth() === 5 && d.getDate() >= 15 && d.getDate() <= 21,
    spotlight: {
      title: "Mi-juin : fête des pères (souvent le 3e dimanche)",
      hook: "Les repères de prévention hommes (cœur, lipides, activité) passent aussi par l’assiette au quotidien.",
      ideas: [
        "Tester une recette « poisson + légumes + huile d’olive » inspirée du modèle méditerranéen.",
        "Regarder une conférence courte sur les oméga-3 et le cœur (chaîne universitaire ou INRAE vulgarisée).",
        "Planifier une sortie active à deux : vélo, randonnée ou piscine.",
      ],
    },
  },
  {
    match: (d) => d.getMonth() === 5 && d.getDate() === 5,
    spotlight: {
      title: "Journée mondiale de l’environnement (5 juin)",
      hook: "Alimentation et planète vont ensemble : gaspillage, saisonnalité et modes de cuisson comptent.",
      ideas: [
        "Faire l’inventaire du frigo et cuisiner un « plat zéro gaspi » avec ce qui reste.",
        "Choisir 3 légumes de saison sur une liste officielle (calendrier AMAP / Région).",
        "Remplacer une viande par des légumineuses sur un repas de la semaine.",
      ],
    },
  },
  {
    match: (d) => d.getMonth() === 9 && d.getDate() >= 13 && d.getDate() <= 19,
    spotlight: {
      title: "Semaine du goût (mi-octobre en France)",
      hook: "Une semaine pour explorer saveurs et textures — surtout chez les enfants — sans obligation de « finir son assiette ».",
      ideas: [
        "Organiser une dégustation à l’aveugle : 5 aliments, noter texture / salé / sucré / amer.",
        "Cuisiner un légume inconnu avec une épice nouvelle (curry doux, sumac, zaatar).",
        "Regarder un documentaire court sur les cultures alimentaires (Arte, INRAE, chaîne pédagogique).",
      ],
    },
  },
  {
    match: (d) => d.getMonth() === 9 && d.getDate() === 16,
    spotlight: {
      title: "Journée mondiale de l’alimentation (16 octobre)",
      hook: "La FAO rappelle chaque année l’accès à une alimentation saine pour tous — une occasion de réfléchir à son propre équilibre et au gaspillage.",
      ideas: [
        "Mesurer une semaine de gaspillage : peser ou photographier ce qui part à la poubelle.",
        "Faire un don à une banque alimentaire locale (produits non périssables + hygiène).",
        "Apprendre une recette à base de légumineuses locales (lentilles vertes du Puy, pois chiches secs).",
      ],
    },
  },
  {
    match: (d) => d.getMonth() === 10 && d.getDate() === 14,
    spotlight: {
      title: "Journée mondiale du diabète (14 novembre)",
      hook: "La prévention du diabète de type 2 passe beaucoup par l’activité physique, les fibres et la régularité des repas — pas seulement par le sucre visible.",
      ideas: [
        "Après un repas sucré ou copieux, marcher 10–15 minutes pour aider la glycémie à redescendre.",
        "Ajouter une portion de légumes à deux repas aujourd’hui.",
        "Écouter un podcast de vulgarisation sur l’index glycémique et les fibres.",
      ],
    },
  },
];

const defaultSpotlight: NutritionSpotlight = {
  title: "Nutrition & actualité : une micro-action",
  hook: "Chaque semaine, la presse santé met en avant des thèmes (sommeil, ultra-transformés, activité) — choisis une piste et teste-la 7 jours.",
  ideas: [
    "Chercher « bienfaits + nom d’un aliment que tu aimes peu » (ex. chou-fleur, sardines) et noter 2 idées recettes.",
    "Regarder une vidéo de 8 min sur la cohérence cardiaque ou le yoga du dos (posture au bureau).",
    "Écouter un épisode du podcast « Science VS » ou « La science, quelle science ? » sur un thème alimentation.",
  ],
};

export function getNutritionSpotlightForDate(d: Date = new Date()): NutritionSpotlight {
  for (const r of rules) {
    if (r.match(d)) return r.spotlight;
  }
  return defaultSpotlight;
}
