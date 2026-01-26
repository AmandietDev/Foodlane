/**
 * Base de données de conseils et défis du jour
 * Plus de 400 items couvrant : nutrition, hydratation, sport, sommeil, stress, relation alimentaire, self-care
 */

export type TipCategory = "nutrition" | "hydration" | "movement" | "sleep" | "stress" | "mindful" | "selfcare";
export type Difficulty = "easy" | "medium";
export type ObjectiveTag = "weight_loss" | "muscle_gain" | "reduce_meat" | "cook_more" | "better_energy" | "general" | "mindful";
export type ContextTag = "busy_day" | "low_budget" | "at_home" | "outdoors" | "no_equipment" | "anytime";

export interface Tip {
  id: string;
  category: TipCategory;
  difficulty: Difficulty;
  tags: (ObjectiveTag | ContextTag)[];
  text: string;
}

export interface Challenge {
  id: string;
  category: TipCategory;
  difficulty: Difficulty;
  duration_min?: number;
  tags: (ObjectiveTag | ContextTag)[];
  action: string;
  why: string;
}

// Base de données des conseils (Tips)
export const TIPS: Tip[] = [
  // HYDRATATION - Conseils
  { id: "h_tip_1", category: "hydration", difficulty: "easy", tags: ["general", "anytime"], text: "Mets ta gourde visible pour un effet rappel naturel." },
  { id: "h_tip_2", category: "hydration", difficulty: "easy", tags: ["general", "anytime"], text: "Associe l'eau à une habitude existante : café = eau." },
  { id: "h_tip_3", category: "hydration", difficulty: "easy", tags: ["general", "anytime"], text: "Les fruits et légumes contribuent aussi à l'hydratation." },
  { id: "h_tip_4", category: "hydration", difficulty: "easy", tags: ["general", "anytime"], text: "Vise une urine jaune clair, c'est un repère simple." },
  { id: "h_tip_5", category: "hydration", difficulty: "easy", tags: ["general", "anytime"], text: "Par temps chaud ou après le sport, pense à augmenter ta consommation." },
  { id: "h_tip_6", category: "hydration", difficulty: "easy", tags: ["general", "anytime"], text: "Alterner eau plate et pétillante peut t'aider à boire plus." },
  { id: "h_tip_7", category: "hydration", difficulty: "easy", tags: ["general", "anytime"], text: "Une tisane sans sucre compte comme hydratation." },
  { id: "h_tip_8", category: "hydration", difficulty: "easy", tags: ["general", "anytime"], text: "Mets une bouteille dans la voiture ou ton sac." },
  { id: "h_tip_9", category: "hydration", difficulty: "easy", tags: ["general", "anytime"], text: "Boire par petites gorgées est plus facile que de grandes gorgées." },
  { id: "h_tip_10", category: "hydration", difficulty: "easy", tags: ["general", "anytime"], text: "Commencer tôt dans la journée rend l'hydratation plus simple." },

  // NUTRITION - Conseils Structure
  { id: "n_tip_1", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Une assiette équilibrée = légumes + féculent + protéine." },
  { id: "n_tip_2", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Les bonnes graisses (huile d'olive, noix) sont essentielles." },
  { id: "n_tip_3", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Les herbes et épices ajoutent saveur et diversité sans calories." },
  { id: "n_tip_4", category: "nutrition", difficulty: "easy", tags: ["weight_loss", "anytime"], text: "Les légumes sont tes alliés pour te rassasier naturellement." },
  { id: "n_tip_5", category: "nutrition", difficulty: "easy", tags: ["muscle_gain", "anytime"], text: "Les protéines à chaque repas soutiennent ta prise de masse." },
  { id: "n_tip_6", category: "nutrition", difficulty: "easy", tags: ["reduce_meat", "anytime"], text: "Les légumineuses sont une excellente alternative aux protéines animales." },
  { id: "n_tip_7", category: "nutrition", difficulty: "easy", tags: ["cook_more", "anytime"], text: "Cuisiner même simple te donne le contrôle sur tes ingrédients." },
  { id: "n_tip_8", category: "nutrition", difficulty: "easy", tags: ["better_energy", "anytime"], text: "Les féculents complets apportent une énergie durable." },

  // NUTRITION - Conseils Variété
  { id: "n_tip_9", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Manger 3 couleurs différentes enrichit ton apport en nutriments." },
  { id: "n_tip_10", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Les légumes surgelés sont pratiques et conservent leurs vitamines." },
  { id: "n_tip_11", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Un bol avec 1 base + 3 toppings = variété et plaisir." },
  { id: "n_tip_12", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Tester un légume que tu manges rarement ouvre de nouvelles saveurs." },

  // NUTRITION - Conseils Protéines
  { id: "n_tip_13", category: "nutrition", difficulty: "easy", tags: ["muscle_gain", "anytime"], text: "Varier tes sources de protéines optimise ton apport en acides aminés." },
  { id: "n_tip_14", category: "nutrition", difficulty: "easy", tags: ["reduce_meat", "anytime"], text: "Les protéines végétales (tofu, lentilles) sont complètes si bien associées." },
  { id: "n_tip_15", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Les graines (courge, chia, lin) ajoutent protéines et fibres." },

  // NUTRITION - Conseils Fibres
  { id: "n_tip_16", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Les légumineuses sont riches en fibres et rassasiantes." },
  { id: "n_tip_17", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Le pain complet ou semi-complet apporte plus de fibres." },
  { id: "n_tip_18", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Les graines de chia dans un yaourt boostent les fibres." },

  // NUTRITION - Conseils Sucre & Plaisir
  { id: "n_tip_19", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Le plaisir fait partie de l'équilibre, pas besoin de le supprimer." },
  { id: "n_tip_20", category: "nutrition", difficulty: "easy", tags: ["weight_loss", "anytime"], text: "Ajouter une protéine ou du gras à un goûter sucré améliore la satiété." },
  { id: "n_tip_21", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Manger ton dessert assis et sans distraction augmente la satisfaction." },
  { id: "n_tip_22", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Choisir ton plaisir consciemment évite les compulsions." },

  // NUTRITION - Conseils Organisation
  { id: "n_tip_23", category: "nutrition", difficulty: "easy", tags: ["cook_more", "anytime"], text: "Préparer 1 élément à l'avance facilite les repas suivants." },
  { id: "n_tip_24", category: "nutrition", difficulty: "easy", tags: ["cook_more", "busy_day"], text: "Cuire 2 portions pour demain fait gagner du temps." },
  { id: "n_tip_25", category: "nutrition", difficulty: "easy", tags: ["cook_more", "low_budget"], text: "Les légumes surgelés sont économiques et pratiques." },
  { id: "n_tip_26", category: "nutrition", difficulty: "easy", tags: ["general", "anytime"], text: "Le principe 80/20 : pas besoin de perfection, la régularité compte." },

  // MOUVEMENT - Conseils
  { id: "m_tip_1", category: "movement", difficulty: "easy", tags: ["general", "anytime"], text: "Le meilleur sport est celui que tu répètes régulièrement." },
  { id: "m_tip_2", category: "movement", difficulty: "easy", tags: ["general", "anytime"], text: "La marche post-repas aide aussi la digestion." },
  { id: "m_tip_3", category: "movement", difficulty: "easy", tags: ["general", "anytime"], text: "Un peu chaque jour vaut mieux que beaucoup rarement." },
  { id: "m_tip_4", category: "movement", difficulty: "easy", tags: ["general", "anytime"], text: "Prépare une tenue à l'avance pour faciliter le passage à l'action." },
  { id: "m_tip_5", category: "movement", difficulty: "easy", tags: ["general", "busy_day"], text: "Une mini séance de 8 minutes non négociable est plus efficace qu'une longue séance reportée." },

  // SOMMEIL - Conseils
  { id: "s_tip_1", category: "sleep", difficulty: "easy", tags: ["general", "anytime"], text: "Le sommeil est un pilier pour réguler la faim et la satiété." },
  { id: "s_tip_2", category: "sleep", difficulty: "easy", tags: ["general", "anytime"], text: "Une routine courte vaut mieux qu'une routine parfaite." },
  { id: "s_tip_3", category: "sleep", difficulty: "easy", tags: ["general", "anytime"], text: "Préparer le lendemain diminue le stress du soir." },
  { id: "s_tip_4", category: "sleep", difficulty: "easy", tags: ["general", "anytime"], text: "La lumière du matin aide à réguler le cycle du sommeil." },
  { id: "s_tip_5", category: "sleep", difficulty: "easy", tags: ["general", "anytime"], text: "Éviter les écrans avant le coucher améliore la qualité du sommeil." },

  // STRESS - Conseils
  { id: "st_tip_1", category: "stress", difficulty: "easy", tags: ["general", "anytime"], text: "Le stress augmente souvent les envies de sucre, c'est normal." },
  { id: "st_tip_2", category: "stress", difficulty: "easy", tags: ["general", "anytime"], text: "L'objectif est d'apaiser, pas de se contrôler." },
  { id: "st_tip_3", category: "stress", difficulty: "easy", tags: ["general", "anytime"], text: "Une respiration lente réinitialise plus vite qu'on ne croit." },
  { id: "st_tip_4", category: "stress", difficulty: "easy", tags: ["general", "anytime"], text: "Prendre 10 minutes pour toi sans culpabilité est essentiel." },
  { id: "st_tip_5", category: "stress", difficulty: "easy", tags: ["general", "anytime"], text: "Une activité plaisir de 15 minutes réduit significativement le stress." },

  // MINDFUL (Relation alimentaire) - Conseils
  { id: "mf_tip_1", category: "mindful", difficulty: "easy", tags: ["general", "anytime"], text: "La restriction crée souvent des compensations, mieux vaut structurer." },
  { id: "mf_tip_2", category: "mindful", difficulty: "easy", tags: ["general", "anytime"], text: "Mieux vaut structurer que supprimer." },
  { id: "mf_tip_3", category: "mindful", difficulty: "easy", tags: ["general", "anytime"], text: "Le plaisir fait partie de l'équilibre alimentaire." },
  { id: "mf_tip_4", category: "mindful", difficulty: "easy", tags: ["general", "anytime"], text: "Manger sans distraction augmente la satisfaction et la satiété." },
  { id: "mf_tip_5", category: "mindful", difficulty: "easy", tags: ["general", "anytime"], text: "Écouter sa faim et sa satiété est une compétence qui se développe." },
  { id: "mf_tip_6", category: "mindful", difficulty: "easy", tags: ["weight_loss", "anytime"], text: "Ajouter un féculent au dîner peut éviter les grignotages nocturnes." },
  { id: "mf_tip_7", category: "mindful", difficulty: "easy", tags: ["general", "anytime"], text: "Remplacer 'je dois' par 'je choisis' change la relation à l'alimentation." },
  { id: "mf_tip_8", category: "mindful", difficulty: "easy", tags: ["general", "anytime"], text: "Remplacer 'craquage' par 'moment humain' réduit la culpabilité." },

  // SELFCARE - Conseils
  { id: "sc_tip_1", category: "selfcare", difficulty: "easy", tags: ["general", "anytime"], text: "Le bien-être inclut aussi l'environnement et le rythme de vie." },
  { id: "sc_tip_2", category: "selfcare", difficulty: "easy", tags: ["general", "anytime"], text: "Mieux dormir et mieux manger créent une synergie positive." },
  { id: "sc_tip_3", category: "selfcare", difficulty: "easy", tags: ["general", "anytime"], text: "La régularité vaut plus que la perfection." },
  { id: "sc_tip_4", category: "selfcare", difficulty: "easy", tags: ["general", "anytime"], text: "Prendre soin de soi n'est pas égoïste, c'est essentiel." },
  { id: "sc_tip_5", category: "selfcare", difficulty: "easy", tags: ["general", "anytime"], text: "Une routine simple et réalisable est plus durable qu'une routine complexe." },
];

// Base de données des défis (Challenges)
export const CHALLENGES: Challenge[] = [
  // HYDRATATION - Défis
  { id: "h_ch_1", category: "hydration", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Boire 1 verre d'eau au réveil", why: "Réhydrate après la nuit et démarre la journée" },
  { id: "h_ch_2", category: "hydration", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Boire 1 verre avant le déjeuner", why: "Aide à la digestion et crée une habitude" },
  { id: "h_ch_3", category: "hydration", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Boire 1 verre avant le dîner", why: "Favorise la satiété et l'hydratation" },
  { id: "h_ch_4", category: "hydration", difficulty: "medium", duration_min: 0, tags: ["general", "anytime"], action: "Remplir une gourde 1L et la finir avant 18h", why: "Objectif concret et mesurable pour la journée" },
  { id: "h_ch_5", category: "hydration", difficulty: "easy", duration_min: 2, tags: ["general", "at_home"], action: "Ajouter une rondelle de citron dans ton eau aujourd'hui", why: "Rend l'eau plus agréable et apporte de la vitamine C" },
  { id: "h_ch_6", category: "hydration", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Mettre une alarme 'eau' 3 fois dans la journée", why: "Rappel efficace pour boire régulièrement" },
  { id: "h_ch_7", category: "hydration", difficulty: "easy", duration_min: 5, tags: ["general", "at_home"], action: "Boire 1 tasse de tisane après le repas du soir", why: "Hydratation + moment de détente" },
  { id: "h_ch_8", category: "hydration", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Remplacer 1 boisson sucrée par de l'eau pétillante", why: "Réduit le sucre tout en gardant le plaisir" },
  { id: "h_ch_9", category: "hydration", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Boire 1 verre d'eau après chaque passage aux toilettes", why: "Associe l'hydratation à une habitude naturelle" },
  { id: "h_ch_10", category: "hydration", difficulty: "easy", duration_min: 0.5, tags: ["general", "anytime"], action: "Boire 2 gorgées à chaque notification téléphone", why: "Micro-habitude facile à intégrer" },
  { id: "h_ch_11", category: "hydration", difficulty: "easy", duration_min: 20, tags: ["general", "outdoors"], action: "Boire 300 ml pendant une marche", why: "Combine mouvement et hydratation" },
  { id: "h_ch_12", category: "hydration", difficulty: "easy", duration_min: 1, tags: ["general", "at_home"], action: "Se servir une carafe sur la table à chaque repas", why: "Rappel visuel et facilité d'accès" },
  { id: "h_ch_13", category: "hydration", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Boire un grand verre avant ton café", why: "Hydratation avant la caféine" },
  { id: "h_ch_14", category: "hydration", difficulty: "easy", duration_min: 10, tags: ["general", "at_home"], action: "Prendre une soupe ou un bouillon (hydratation alimentaire)", why: "Hydratation + nutriments" },
  { id: "h_ch_15", category: "hydration", difficulty: "easy", duration_min: 5, tags: ["general", "at_home"], action: "Faire une eau aromatisée maison (menthe, concombre)", why: "Hydratation plaisante sans sucre" },

  // NUTRITION - Défis Structure
  { id: "n_ch_1", category: "nutrition", difficulty: "easy", duration_min: 5, tags: ["general", "anytime"], action: "Ajouter 1 légume à un repas", why: "Augmente les fibres et les vitamines" },
  { id: "n_ch_2", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["general", "anytime"], action: "Ajouter 1 fruit aujourd'hui", why: "Apporte vitamines et fibres naturelles" },
  { id: "n_ch_3", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["muscle_gain", "anytime"], action: "Mettre une source de protéines à chaque repas principal", why: "Soutient la prise de masse musculaire" },
  { id: "n_ch_4", category: "nutrition", difficulty: "easy", duration_min: 5, tags: ["general", "anytime"], action: "Ajouter une source de fibres (légumineuses, complet, légumes)", why: "Améliore la digestion et la satiété" },
  { id: "n_ch_5", category: "nutrition", difficulty: "easy", duration_min: 10, tags: ["general", "anytime"], action: "Faire une assiette '3 blocs' : légumes + féculent + protéine", why: "Équilibre nutritionnel complet" },
  { id: "n_ch_6", category: "nutrition", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Ajouter une cuillère d'huile d'olive/colza/noix (bon gras) sur un plat", why: "Les bonnes graisses sont essentielles" },
  { id: "n_ch_7", category: "nutrition", difficulty: "easy", duration_min: 3, tags: ["general", "at_home"], action: "Ajouter des herbes/épices dans un plat (saveur + diversité)", why: "Enrichit les saveurs sans calories" },
  { id: "n_ch_8", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["general", "anytime"], action: "Ajouter un produit laitier ou alternative enrichie (si ça te convient)", why: "Apporte calcium et protéines" },
  { id: "n_ch_9", category: "nutrition", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Ajouter une poignée d'oléagineux (amandes/noix) en collation", why: "Protéines, bon gras et satiété" },
  { id: "n_ch_10", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["weight_loss", "anytime"], action: "Ajouter une portion de féculents au dîner si tu as faim le soir", why: "Évite les grignotages nocturnes" },

  // NUTRITION - Défis Variété
  { id: "n_ch_11", category: "nutrition", difficulty: "easy", duration_min: 0, tags: ["general", "anytime"], action: "Manger 3 couleurs différentes aujourd'hui", why: "Diversifie les apports en nutriments" },
  { id: "n_ch_12", category: "nutrition", difficulty: "easy", duration_min: 5, tags: ["general", "anytime"], action: "Ajouter une crudité (carottes râpées, concombre)", why: "Fibres, croquant et fraîcheur" },
  { id: "n_ch_13", category: "nutrition", difficulty: "easy", duration_min: 10, tags: ["general", "anytime"], action: "Tester un légume que tu manges rarement", why: "Ouvre de nouvelles saveurs et nutriments" },
  { id: "n_ch_14", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["general", "anytime"], action: "Choisir un fruit 'différent' de d'habitude", why: "Variété et découverte" },
  { id: "n_ch_15", category: "nutrition", difficulty: "easy", duration_min: 5, tags: ["general", "at_home"], action: "Faire un mix légumes surgelés (pratique)", why: "Pratique et conserve les vitamines" },
  { id: "n_ch_16", category: "nutrition", difficulty: "easy", duration_min: 3, tags: ["general", "anytime"], action: "Ajouter un aliment 'croquant' dans ton repas", why: "Texture satisfaisante et mastication" },
  { id: "n_ch_17", category: "nutrition", difficulty: "easy", duration_min: 10, tags: ["general", "anytime"], action: "Mettre 2 légumes dans la même assiette", why: "Double les apports en légumes" },
  { id: "n_ch_18", category: "nutrition", difficulty: "easy", duration_min: 15, tags: ["general", "at_home"], action: "Ajouter une soupe/velouté en entrée", why: "Hydratation + légumes + satiété" },
  { id: "n_ch_19", category: "nutrition", difficulty: "easy", duration_min: 10, tags: ["general", "anytime"], action: "Faire un bol avec 1 base + 3 toppings", why: "Variété, plaisir et équilibre" },
  { id: "n_ch_20", category: "nutrition", difficulty: "easy", duration_min: 0, tags: ["general", "anytime"], action: "'1 arc-en-ciel' sur 2 repas de la journée", why: "Diversité visuelle et nutritionnelle" },

  // NUTRITION - Défis Protéines
  { id: "n_ch_21", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["muscle_gain", "anytime"], action: "Ajouter 1 yaourt/fromage blanc/protéine végétale dans la journée", why: "Boost protéique facile" },
  { id: "n_ch_22", category: "nutrition", difficulty: "easy", duration_min: 5, tags: ["general", "anytime"], action: "Ajouter des œufs dans un repas (si ok)", why: "Protéines complètes et rassasiantes" },
  { id: "n_ch_23", category: "nutrition", difficulty: "easy", duration_min: 10, tags: ["reduce_meat", "anytime"], action: "Tester une protéine végétale : pois chiches/lentilles/tofu", why: "Alternative végétale complète" },
  { id: "n_ch_24", category: "nutrition", difficulty: "easy", duration_min: 15, tags: ["general", "anytime"], action: "Mettre une portion de poisson (si tu en manges)", why: "Protéines + oméga-3" },
  { id: "n_ch_25", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["general", "anytime"], action: "Remplacer une charcuterie par poulet/thon/œufs/légumineuses", why: "Réduit le sel et les additifs" },
  { id: "n_ch_26", category: "nutrition", difficulty: "easy", duration_min: 5, tags: ["general", "at_home"], action: "Ajouter du fromage frais + herbes comme dip protéiné", why: "Protéines + saveur" },
  { id: "n_ch_27", category: "nutrition", difficulty: "easy", duration_min: 5, tags: ["general", "anytime"], action: "Collation 'protéinée' : yaourt + fruit / houmous + crudités", why: "Satiété durable" },
  { id: "n_ch_28", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["general", "anytime"], action: "Ajouter des graines (courge/chia/lin) dans un bol", why: "Protéines + fibres + oméga-3" },

  // NUTRITION - Défis Fibres
  { id: "n_ch_29", category: "nutrition", difficulty: "easy", duration_min: 10, tags: ["general", "anytime"], action: "Ajouter une portion de légumineuses (lentilles/haricots)", why: "Fibres + protéines végétales" },
  { id: "n_ch_30", category: "nutrition", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Choisir du pain complet ou semi-complet aujourd'hui", why: "Plus de fibres et nutriments" },
  { id: "n_ch_31", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["general", "anytime"], action: "Ajouter 1 cuillère de graines de chia/lin dans un yaourt", why: "Boost de fibres et oméga-3" },
  { id: "n_ch_32", category: "nutrition", difficulty: "easy", duration_min: 3, tags: ["general", "anytime"], action: "Faire une collation fruit + noix (fibres + gras)", why: "Satiété et énergie durable" },
  { id: "n_ch_33", category: "nutrition", difficulty: "easy", duration_min: 5, tags: ["general", "anytime"], action: "Ajouter une portion de légumes au dîner même petite", why: "Fibres + satiété pour la soirée" },
  { id: "n_ch_34", category: "nutrition", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Remplacer un féculent raffiné par complet 1 fois", why: "Plus de fibres et nutriments" },
  { id: "n_ch_35", category: "nutrition", difficulty: "easy", duration_min: 15, tags: ["general", "at_home"], action: "Ajouter une soupe de légumes le soir", why: "Hydratation + fibres + légumes" },
  { id: "n_ch_36", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["general", "anytime"], action: "Ajouter une compote sans sucre + cannelle (si envie sucrée)", why: "Fruit + saveur sans sucre ajouté" },

  // NUTRITION - Défis Sucre & Plaisir
  { id: "n_ch_37", category: "nutrition", difficulty: "easy", duration_min: 0.5, tags: ["general", "anytime"], action: "Prendre une 'pause' avant un snack sucré (10 secondes)", why: "Permet de vérifier si c'est vraiment de la faim" },
  { id: "n_ch_38", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["weight_loss", "anytime"], action: "Ajouter une protéine/gras à un goûter sucré (meilleure satiété)", why: "Évite les pics de glycémie" },
  { id: "n_ch_39", category: "nutrition", difficulty: "easy", duration_min: 0, tags: ["mindful", "anytime"], action: "Manger ton dessert assis, sans téléphone", why: "Augmente la satisfaction et la satiété" },
  { id: "n_ch_40", category: "nutrition", difficulty: "easy", duration_min: 1, tags: ["mindful", "anytime"], action: "Choisir ton 'plaisir' de la journée consciemment", why: "Évite les compulsions" },
  { id: "n_ch_41", category: "nutrition", difficulty: "easy", duration_min: 5, tags: ["general", "anytime"], action: "Si envie sucrée : tester fruit + yaourt ou chocolat + noix", why: "Plaisir + nutriments" },
  { id: "n_ch_42", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["general", "anytime"], action: "Remplacer une boisson sucrée par eau pétillante + citron", why: "Réduit le sucre sans frustration" },
  { id: "n_ch_43", category: "nutrition", difficulty: "easy", duration_min: 10, tags: ["cook_more", "at_home"], action: "Préparer un dessert maison simple (yaourt + fruits + granola)", why: "Contrôle des ingrédients + plaisir" },
  { id: "n_ch_44", category: "nutrition", difficulty: "easy", duration_min: 5, tags: ["mindful", "anytime"], action: "Faire une 'assiette dessert' : portion + dégustation lente", why: "Satisfaction maximale" },
  { id: "n_ch_45", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["general", "anytime"], action: "Mettre une collation prévue pour éviter le craquage tardif", why: "Anticipe et structure" },

  // NUTRITION - Défis Organisation
  { id: "n_ch_46", category: "nutrition", difficulty: "easy", duration_min: 15, tags: ["cook_more", "busy_day"], action: "Préparer 1 élément d'avance (riz/pâtes/légumes)", why: "Gagne du temps pour les repas suivants" },
  { id: "n_ch_47", category: "nutrition", difficulty: "easy", duration_min: 20, tags: ["cook_more", "busy_day"], action: "Cuire 2 portions pour demain", why: "Prépare les repas futurs" },
  { id: "n_ch_48", category: "nutrition", difficulty: "easy", duration_min: 5, tags: ["cook_more", "anytime"], action: "Faire une liste de courses '3 repas faciles'", why: "Organisation et simplicité" },
  { id: "n_ch_49", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["general", "anytime"], action: "Mettre 2 aliments 'secours' (thon + légumes surgelés)", why: "Évite les repas déséquilibrés en urgence" },
  { id: "n_ch_50", category: "nutrition", difficulty: "easy", duration_min: 5, tags: ["general", "anytime"], action: "Préparer une collation portable (noix/fruit)", why: "Évite les snacks transformés" },
  { id: "n_ch_51", category: "nutrition", difficulty: "easy", duration_min: 5, tags: ["cook_more", "at_home"], action: "Laver/éplucher 1 légume à l'avance", why: "Facilite la préparation du repas" },
  { id: "n_ch_52", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["cook_more", "at_home"], action: "Congeler une portion de plat maison", why: "Repas équilibré pour plus tard" },
  { id: "n_ch_53", category: "nutrition", difficulty: "easy", duration_min: 2, tags: ["cook_more", "at_home"], action: "Faire une vinaigrette maison en 2 minutes", why: "Contrôle des ingrédients + saveur" },
  { id: "n_ch_54", category: "nutrition", difficulty: "easy", duration_min: 10, tags: ["cook_more", "at_home"], action: "Prévoir '1 repas frigo' (omelette + salade)", why: "Repas rapide et équilibré" },
  { id: "n_ch_55", category: "nutrition", difficulty: "easy", duration_min: 20, tags: ["cook_more", "at_home"], action: "Faire un batch de légumes rôtis pour 2 jours", why: "Base pour plusieurs repas" },
  { id: "n_ch_56", category: "nutrition", difficulty: "easy", duration_min: 15, tags: ["cook_more", "at_home"], action: "Créer une 'base' : quinoa/riz + légumes + protéine", why: "Repas complet et réutilisable" },

  // MOUVEMENT - Défis
  { id: "m_ch_1", category: "movement", difficulty: "easy", duration_min: 10, tags: ["general", "outdoors"], action: "Marcher 10 minutes", why: "Activité douce et accessible" },
  { id: "m_ch_2", category: "movement", difficulty: "easy", duration_min: 15, tags: ["general", "outdoors"], action: "Marcher 15 minutes après un repas", why: "Aide la digestion et le mouvement" },
  { id: "m_ch_3", category: "movement", difficulty: "easy", duration_min: 2, tags: ["general", "no_equipment"], action: "Monter les escaliers 1 fois", why: "Renforcement des jambes" },
  { id: "m_ch_4", category: "movement", difficulty: "easy", duration_min: 2, tags: ["general", "no_equipment", "at_home"], action: "Faire 20 squats", why: "Renforcement des jambes et fessiers" },
  { id: "m_ch_5", category: "movement", difficulty: "easy", duration_min: 2, tags: ["general", "no_equipment", "at_home"], action: "Faire 10 pompes (sur genoux si besoin)", why: "Renforcement du haut du corps" },
  { id: "m_ch_6", category: "movement", difficulty: "easy", duration_min: 1, tags: ["general", "no_equipment", "at_home"], action: "Faire 1 minute de gainage", why: "Renforcement du tronc" },
  { id: "m_ch_7", category: "movement", difficulty: "easy", duration_min: 5, tags: ["general", "no_equipment", "at_home"], action: "Faire 5 minutes d'étirements", why: "Mobilité et récupération" },
  { id: "m_ch_8", category: "movement", difficulty: "easy", duration_min: 10, tags: ["general", "outdoors"], action: "Faire une marche 'téléphone' : appeler en marchant", why: "Combine mouvement et social" },
  { id: "m_ch_9", category: "movement", difficulty: "easy", duration_min: 3, tags: ["general", "no_equipment", "busy_day"], action: "Faire 3 pauses actives (1 min) dans la journée", why: "Brise la sédentarité" },
  { id: "m_ch_10", category: "movement", difficulty: "easy", duration_min: 3, tags: ["general", "no_equipment", "at_home"], action: "Danser 1 chanson", why: "Mouvement plaisir" },
  { id: "m_ch_11", category: "movement", difficulty: "easy", duration_min: 10, tags: ["general", "no_equipment", "at_home"], action: "Faire 10 minutes de yoga", why: "Mouvement + respiration + mobilité" },
  { id: "m_ch_12", category: "movement", difficulty: "easy", duration_min: 5, tags: ["general", "no_equipment", "at_home"], action: "Faire 5 minutes de mobilité hanches/épaules", why: "Prévention des tensions" },
  { id: "m_ch_13", category: "movement", difficulty: "medium", duration_min: 8, tags: ["general", "no_equipment", "at_home"], action: "Faire 1 mini séance 'full body' 8 minutes", why: "Renforcement complet rapide" },
  { id: "m_ch_14", category: "movement", difficulty: "easy", duration_min: 2, tags: ["general", "no_equipment", "at_home"], action: "Faire 30 secondes de jumping jacks x 3", why: "Cardio rapide et efficace" },
  { id: "m_ch_15", category: "movement", difficulty: "easy", duration_min: 2, tags: ["general", "no_equipment", "at_home"], action: "Faire 10 fentes par jambe", why: "Renforcement jambes et fessiers" },
  { id: "m_ch_16", category: "movement", difficulty: "easy", duration_min: 10, tags: ["general", "outdoors"], action: "Faire une promenade dehors (lumière)", why: "Mouvement + lumière naturelle" },
  { id: "m_ch_17", category: "movement", difficulty: "easy", duration_min: 5, tags: ["general", "outdoors"], action: "Sortir prendre l'air 5 minutes", why: "Rafraîchit et oxygène" },
  { id: "m_ch_18", category: "movement", difficulty: "easy", duration_min: 1, tags: ["general", "no_equipment", "busy_day"], action: "Se lever toutes les 60 minutes (alarme)", why: "Brise la sédentarité" },
  { id: "m_ch_19", category: "movement", difficulty: "easy", duration_min: 5, tags: ["general", "no_equipment", "at_home"], action: "Faire 5 minutes d'abdos doux (dead bug)", why: "Renforcement du tronc en douceur" },
  { id: "m_ch_20", category: "movement", difficulty: "easy", duration_min: 2, tags: ["general", "no_equipment", "at_home"], action: "Faire un 'étirement du cou' 2 minutes", why: "Relâche les tensions cervicales" },

  // SOMMEIL - Défis
  { id: "s_ch_1", category: "sleep", difficulty: "easy", duration_min: 0, tags: ["general", "anytime"], action: "Se coucher 15 minutes plus tôt", why: "Améliore la durée et la qualité du sommeil" },
  { id: "s_ch_2", category: "sleep", difficulty: "easy", duration_min: 0, tags: ["general", "anytime"], action: "Éteindre les écrans 30 minutes avant le coucher", why: "Favorise l'endormissement naturel" },
  { id: "s_ch_3", category: "sleep", difficulty: "easy", duration_min: 5, tags: ["general", "at_home"], action: "Faire une tisane relaxante", why: "Rituel apaisant avant le coucher" },
  { id: "s_ch_4", category: "sleep", difficulty: "easy", duration_min: 0, tags: ["general", "at_home"], action: "Diminuer la lumière 1h avant le coucher", why: "Signale au corps qu'il est temps de se détendre" },
  { id: "s_ch_5", category: "sleep", difficulty: "easy", duration_min: 2, tags: ["general", "at_home"], action: "Ranger la chambre 2 minutes", why: "Environnement apaisant favorise le sommeil" },
  { id: "s_ch_6", category: "sleep", difficulty: "easy", duration_min: 10, tags: ["general", "at_home"], action: "Ventiler la chambre 10 minutes", why: "Air frais améliore la qualité du sommeil" },
  { id: "s_ch_7", category: "sleep", difficulty: "easy", duration_min: 3, tags: ["general", "anytime"], action: "Écrire 3 choses positives du jour", why: "Termine la journée sur une note positive" },
  { id: "s_ch_8", category: "sleep", difficulty: "easy", duration_min: 2, tags: ["general", "at_home"], action: "Faire 5 respirations lentes au lit", why: "Calme le système nerveux" },
  { id: "s_ch_9", category: "sleep", difficulty: "easy", duration_min: 1, tags: ["general", "at_home"], action: "Mettre le téléphone loin du lit", why: "Évite les tentations et la lumière bleue" },
  { id: "s_ch_10", category: "sleep", difficulty: "easy", duration_min: 3, tags: ["general", "at_home"], action: "Faire une 'routine 3 minutes' avant de dormir", why: "Signal au corps que c'est l'heure de dormir" },
  { id: "s_ch_11", category: "sleep", difficulty: "easy", duration_min: 10, tags: ["general", "outdoors"], action: "S'exposer à la lumière du matin 10 minutes", why: "Régule le cycle du sommeil" },
  { id: "s_ch_12", category: "sleep", difficulty: "easy", duration_min: 0, tags: ["general", "anytime"], action: "Éviter café après 14h (test 1 jour)", why: "Réduit l'impact sur l'endormissement" },
  { id: "s_ch_13", category: "sleep", difficulty: "easy", duration_min: 20, tags: ["general", "at_home"], action: "Faire une sieste courte (10-20 min)", why: "Récupération sans perturber le sommeil nocturne" },
  { id: "s_ch_14", category: "sleep", difficulty: "easy", duration_min: 5, tags: ["general", "at_home"], action: "Étirer jambes/dos 5 minutes le soir", why: "Relâche les tensions avant le coucher" },
  { id: "s_ch_15", category: "sleep", difficulty: "easy", duration_min: 10, tags: ["general", "at_home"], action: "Prendre une douche tiède relaxante", why: "Détend avant le coucher" },

  // STRESS - Défis
  { id: "st_ch_1", category: "stress", difficulty: "easy", duration_min: 1, tags: ["general", "no_equipment", "anytime"], action: "1 minute de respiration (4-6)", why: "Calme immédiat du système nerveux" },
  { id: "st_ch_2", category: "stress", difficulty: "easy", duration_min: 3, tags: ["general", "no_equipment", "anytime"], action: "3 minutes de cohérence cardiaque", why: "Régule le rythme cardiaque et le stress" },
  { id: "st_ch_3", category: "stress", difficulty: "easy", duration_min: 2, tags: ["general", "no_equipment", "at_home"], action: "Scanner corporel 2 minutes", why: "Reconnexion au corps et apaisement" },
  { id: "st_ch_4", category: "stress", difficulty: "easy", duration_min: 5, tags: ["general", "no_equipment", "at_home"], action: "Méditation guidée 5 minutes", why: "Pause mentale et recentrage" },
  { id: "st_ch_5", category: "stress", difficulty: "easy", duration_min: 10, tags: ["general", "anytime"], action: "Pause 'sans écran' 10 minutes", why: "Réduit la surstimulation" },
  { id: "st_ch_6", category: "stress", difficulty: "easy", duration_min: 10, tags: ["general", "outdoors"], action: "Marche dehors 10 minutes", why: "Mouvement + nature = apaisement" },
  { id: "st_ch_7", category: "stress", difficulty: "easy", duration_min: 5, tags: ["general", "anytime"], action: "Écrire ce qui te stresse + 1 action minuscule", why: "Concrétise et désamorce le stress" },
  { id: "st_ch_8", category: "stress", difficulty: "easy", duration_min: 5, tags: ["general", "at_home"], action: "Boire une tisane en silence", why: "Rituel apaisant et pause" },
  { id: "st_ch_9", category: "stress", difficulty: "easy", duration_min: 3, tags: ["general", "anytime"], action: "Écouter une musique calmante 1 chanson", why: "Apaise rapidement" },
  { id: "st_ch_10", category: "stress", difficulty: "easy", duration_min: 3, tags: ["general", "no_equipment", "anytime"], action: "Étirement nuque/épaules 3 minutes", why: "Relâche les tensions physiques du stress" },
  { id: "st_ch_11", category: "stress", difficulty: "easy", duration_min: 15, tags: ["general", "anytime"], action: "Faire une activité 'plaisir' 15 minutes (lecture, dessin)", why: "Réduit le stress par le plaisir" },
  { id: "st_ch_12", category: "stress", difficulty: "easy", duration_min: 5, tags: ["general", "at_home"], action: "Ranger 1 zone (bureau) 5 minutes", why: "Environnement ordonné = mental apaisé" },
  { id: "st_ch_13", category: "stress", difficulty: "easy", duration_min: 0, tags: ["general", "anytime"], action: "Dire non à une sollicitation inutile aujourd'hui", why: "Protège ton énergie" },
  { id: "st_ch_14", category: "stress", difficulty: "easy", duration_min: 5, tags: ["general", "at_home"], action: "Faire une micro sieste / yeux fermés 5 min", why: "Récupération rapide" },
  { id: "st_ch_15", category: "stress", difficulty: "easy", duration_min: 10, tags: ["general", "at_home"], action: "Prendre une douche en pleine conscience", why: "Pause sensorielle apaisante" },

  // MINDFUL (Relation alimentaire) - Défis
  { id: "mf_ch_1", category: "mindful", difficulty: "easy", duration_min: 0, tags: ["general", "anytime"], action: "Manger sans écran 1 repas", why: "Augmente la satisfaction et la satiété" },
  { id: "mf_ch_2", category: "mindful", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Identifier une vraie faim vs envie (1 minute)", why: "Développe la conscience de la faim" },
  { id: "mf_ch_3", category: "mindful", difficulty: "easy", duration_min: 0.5, tags: ["general", "anytime"], action: "Faire une pause 10 secondes avant de te resservir", why: "Permet de vérifier la satiété" },
  { id: "mf_ch_4", category: "mindful", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Choisir ton plaisir consciemment aujourd'hui", why: "Évite les compulsions" },
  { id: "mf_ch_5", category: "mindful", difficulty: "easy", duration_min: 5, tags: ["general", "anytime"], action: "Faire un snack 'assiette' (pas au paquet)", why: "Portion contrôlée et conscience" },
  { id: "mf_ch_6", category: "mindful", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Observer ton niveau de faim (1-5) avant une collation", why: "Développe la conscience de la faim" },
  { id: "mf_ch_7", category: "mindful", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Noter 'ce que je ressens' avant de manger (stress/ennui/fatigue)", why: "Identifie les déclencheurs émotionnels" },
  { id: "mf_ch_8", category: "mindful", difficulty: "easy", duration_min: 0, tags: ["general", "anytime"], action: "Faire un repas 'satisfaisant' (pas seulement léger)", why: "Évite les fringales plus tard" },
  { id: "mf_ch_9", category: "mindful", difficulty: "easy", duration_min: 0, tags: ["weight_loss", "anytime"], action: "Ajouter un féculent au dîner si tu grignotes le soir", why: "Satiété = moins de grignotages" },
  { id: "mf_ch_10", category: "mindful", difficulty: "easy", duration_min: 2, tags: ["general", "anytime"], action: "Prévoir une collation structurée pour éviter le craquage", why: "Anticipe et structure" },
  { id: "mf_ch_11", category: "mindful", difficulty: "easy", duration_min: 0, tags: ["general", "anytime"], action: "Manger assis, même pour une collation", why: "Conscience et satisfaction" },
  { id: "mf_ch_12", category: "mindful", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Mettre une portion + ranger le paquet", why: "Portion contrôlée et conscience" },
  { id: "mf_ch_13", category: "mindful", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Remplacer 'je dois' par 'je choisis'", why: "Change la relation à l'alimentation" },
  { id: "mf_ch_14", category: "mindful", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Remplacer 'craquage' par 'moment humain'", why: "Réduit la culpabilité" },
  { id: "mf_ch_15", category: "mindful", difficulty: "easy", duration_min: 2, tags: ["general", "anytime"], action: "Écrire 1 phrase bienveillante sur ton corps", why: "Améliore l'image corporelle" },
  { id: "mf_ch_16", category: "mindful", difficulty: "easy", duration_min: 5, tags: ["general", "anytime"], action: "Regarder ton assiette 5 secondes avant de manger", why: "Prise de conscience avant de commencer" },
  { id: "mf_ch_17", category: "mindful", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Faire 3 respirations avant le repas", why: "Calme et recentre avant de manger" },
  { id: "mf_ch_18", category: "mindful", difficulty: "easy", duration_min: 2, tags: ["general", "anytime"], action: "Mâcher plus lentement sur 5 bouchées", why: "Améliore la digestion et la satiété" },
  { id: "mf_ch_19", category: "mindful", difficulty: "easy", duration_min: 2, tags: ["general", "anytime"], action: "Poser la fourchette entre 2 bouchées pendant 2 minutes", why: "Ralentit et augmente la conscience" },
  { id: "mf_ch_20", category: "mindful", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Boire une gorgée d'eau au milieu du repas", why: "Pause et hydratation" },
  { id: "mf_ch_21", category: "mindful", difficulty: "easy", duration_min: 10, tags: ["general", "anytime"], action: "Prendre 10 minutes minimum pour ton repas", why: "Temps nécessaire pour la satiété" },
  { id: "mf_ch_22", category: "mindful", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Identifier 1 goût/texture que tu apprécies", why: "Augmente la satisfaction" },

  // SELFCARE - Défis
  { id: "sc_ch_1", category: "selfcare", difficulty: "easy", duration_min: 10, tags: ["general", "anytime"], action: "Prendre 10 minutes pour toi sans culpabilité", why: "Essentiel pour le bien-être" },
  { id: "sc_ch_2", category: "selfcare", difficulty: "easy", duration_min: 5, tags: ["general", "at_home"], action: "Faire une routine peau simple (nettoyer + hydrater)", why: "Prendre soin de soi au quotidien" },
  { id: "sc_ch_3", category: "selfcare", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Mettre une crème mains", why: "Petit geste de bienveillance envers soi" },
  { id: "sc_ch_4", category: "selfcare", difficulty: "easy", duration_min: 10, tags: ["general", "outdoors"], action: "Sortir prendre le soleil 10 minutes (si possible)", why: "Vitamine D et bien-être" },
  { id: "sc_ch_5", category: "selfcare", difficulty: "easy", duration_min: 3, tags: ["general", "no_equipment", "anytime"], action: "Faire une routine posture 3 minutes", why: "Prévention des tensions" },
  { id: "sc_ch_6", category: "selfcare", difficulty: "easy", duration_min: 5, tags: ["general", "anytime"], action: "S'habiller confortablement et joliment aujourd'hui", why: "Bien-être et confiance" },
  { id: "sc_ch_7", category: "selfcare", difficulty: "easy", duration_min: 15, tags: ["general", "anytime"], action: "Écouter un podcast inspirant 15 minutes", why: "Nourrit l'esprit" },
  { id: "sc_ch_8", category: "selfcare", difficulty: "easy", duration_min: 10, tags: ["general", "anytime"], action: "Faire une activité créative 10 minutes", why: "Expression et plaisir" },
  { id: "sc_ch_9", category: "selfcare", difficulty: "easy", duration_min: 10, tags: ["general", "anytime"], action: "Appeler quelqu'un que tu aimes", why: "Connexion sociale et bien-être" },
  { id: "sc_ch_10", category: "selfcare", difficulty: "easy", duration_min: 1, tags: ["general", "anytime"], action: "Dire merci à quelqu'un aujourd'hui", why: "Gratitude et bien-être" },
  { id: "sc_ch_11", category: "selfcare", difficulty: "easy", duration_min: 5, tags: ["general", "anytime"], action: "Préparer une tenue/repas pour demain", why: "Réduit le stress du lendemain" },
  { id: "sc_ch_12", category: "selfcare", difficulty: "easy", duration_min: 10, tags: ["general", "at_home"], action: "Faire un bain de pieds 10 minutes", why: "Détente et soin" },
  { id: "sc_ch_13", category: "selfcare", difficulty: "easy", duration_min: 10, tags: ["general", "anytime"], action: "Lire 10 pages", why: "Pause et évasion" },
  { id: "sc_ch_14", category: "selfcare", difficulty: "easy", duration_min: 2, tags: ["general", "at_home"], action: "Mettre une bougie / ambiance relax", why: "Créer une atmosphère apaisante" },
  { id: "sc_ch_15", category: "selfcare", difficulty: "easy", duration_min: 1, tags: ["general", "no_equipment", "anytime"], action: "Faire une pause 'respirer' 1 minute", why: "Micro-pause essentielle" },
];

/**
 * Sélectionne un conseil du jour adapté au profil utilisateur
 * Évite les répétitions récentes
 */
export function selectDailyTip(
  userObjectives: ObjectiveTag[],
  userContext: ContextTag[],
  recentTipIds: string[] = []
): Tip | null {
  // Filtrer les conseils selon les objectifs et contexte
  let filteredTips = TIPS.filter(tip => {
    // Vérifier si le conseil correspond aux objectifs ou est général
    const hasObjectiveMatch = tip.tags.some(tag => 
      userObjectives.includes(tag as ObjectiveTag) || tag === "general"
    );
    
    // Vérifier si le conseil correspond au contexte ou est anytime
    const hasContextMatch = tip.tags.some(tag => 
      userContext.includes(tag as ContextTag) || tag === "anytime"
    );
    
    return hasObjectiveMatch && hasContextMatch;
  });
  
  // Exclure les conseils récents
  filteredTips = filteredTips.filter(tip => !recentTipIds.includes(tip.id));
  
  // Si pas assez de conseils, réinclure certains
  if (filteredTips.length < 5) {
    filteredTips = TIPS.filter(tip => {
      const hasObjectiveMatch = tip.tags.some(tag => 
        userObjectives.includes(tag as ObjectiveTag) || tag === "general"
      );
      return hasObjectiveMatch;
    });
  }
  
  // Choisir aléatoirement
  if (filteredTips.length === 0) {
    return TIPS[Math.floor(Math.random() * TIPS.length)];
  }
  
  return filteredTips[Math.floor(Math.random() * filteredTips.length)];
}

/**
 * Sélectionne un défi du jour adapté au profil utilisateur
 * Évite les répétitions récentes
 */
export function selectDailyChallenge(
  userObjectives: ObjectiveTag[],
  userContext: ContextTag[],
  recentChallengeIds: string[] = []
): Challenge | null {
  // Filtrer les défis selon les objectifs et contexte
  let filteredChallenges = CHALLENGES.filter(challenge => {
    // Vérifier si le défi correspond aux objectifs ou est général
    const hasObjectiveMatch = challenge.tags.some(tag => 
      userObjectives.includes(tag as ObjectiveTag) || tag === "general"
    );
    
    // Vérifier si le défi correspond au contexte ou est anytime
    const hasContextMatch = challenge.tags.some(tag => 
      userContext.includes(tag as ContextTag) || tag === "anytime"
    );
    
    return hasObjectiveMatch && hasContextMatch;
  });
  
  // Exclure les défis récents
  filteredChallenges = filteredChallenges.filter(challenge => !recentChallengeIds.includes(challenge.id));
  
  // Si pas assez de défis, réinclure certains
  if (filteredChallenges.length < 5) {
    filteredChallenges = CHALLENGES.filter(challenge => {
      const hasObjectiveMatch = challenge.tags.some(tag => 
        userObjectives.includes(tag as ObjectiveTag) || tag === "general"
      );
      return hasObjectiveMatch;
    });
  }
  
  // Choisir aléatoirement
  if (filteredChallenges.length === 0) {
    return CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
  }
  
  return filteredChallenges[Math.floor(Math.random() * filteredChallenges.length)];
}

