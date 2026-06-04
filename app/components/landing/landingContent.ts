export type NavItem = { label: string; href: string };

export const NAV_ITEMS: NavItem[] = [
  { label: "Fonctionnalités", href: "#fonctionnalites" },
  { label: "Assistant IA", href: "#assistant-ia" },
  { label: "Recettes", href: "#recettes" },
  { label: "Tarifs", href: "#cta-final" },
  { label: "À propos", href: "#apropos" },
];

export const FEATURES = [
  {
    title: "Menus personnalisés",
    description: "Adaptés à tes envies, ton budget et ton temps.",
    icon: "chef" as const,
    iconSrc: "/landing/icons/feature-chef.png",
    /** Compense le canvas PNG plus large (icône perçue plus petite). */
    iconScale: 1.48,
  },
  {
    title: "Liste de courses",
    description: "Générée automatiquement avec tes menus.",
    icon: "clipboard" as const,
    iconSrc: "/landing/icons/feature-clipboard.png",
    iconScale: 1.06,
  },
  {
    title: "Recettes saines & gourmandes",
    description: "Des idées savoureuses pour tous les goûts.",
    icon: "chef-heart" as const,
    iconSrc: "/landing/icons/feature-chef-heart.png",
    iconScale: 1.34,
  },
  {
    title: "Assistant diététicien IA",
    description: "Conseils, analyses nutritionnelles et suivi personnalisé.",
    icon: "ruler" as const,
    iconSrc: "/landing/icons/feature-ruler.png",
    iconScale: 1.14,
  },
] as const;

export const ASSISTANT_BULLETS = [
  "Conseils personnalisés",
  "Analyse nutritionnelle",
  "Suivi de vos objectifs",
  "Réponses à vos questions",
];

export const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const WEEK_CHALLENGES = [
  {
    icon: "walk" as const,
    text: "12 min de marche rapide sans téléphone",
  },
  {
    icon: "water" as const,
    text: "Remplir une gourde 1 L et la finir avant 18 h",
  },
  {
    icon: "plate" as const,
    text: "Dîner : ½ légumes, ¼ féculents complets, ¼ protéines",
  },
] as const;

export const TESTIMONIALS = [
  {
    name: "Sophie L.",
    city: "Lyon",
    quote: "Foodlane a changé mon quotidien ! Je gagne un temps fou et je mange beaucoup mieux.",
    avatar: "SL",
    photo: "https://i.pravatar.cc/80?img=1",
  },
  {
    name: "Thomas D.",
    city: "Bordeaux",
    quote: "L'assistant diététicien IA est incroyable, il me donne des conseils adaptés et motivants.",
    avatar: "TD",
    photo: "https://i.pravatar.cc/80?img=11",
  },
  {
    name: "Camille M.",
    city: "Nantes",
    quote: "Les recettes sont délicieuses et variées. Mes repas n'ont jamais été aussi simples à organiser.",
    avatar: "CM",
    photo: "https://i.pravatar.cc/80?img=5",
  },
  {
    name: "Julien P.",
    city: "Paris",
    quote: "La liste de courses générée automatiquement me fait économiser du temps et de l'argent chaque semaine.",
    avatar: "JP",
    photo: "https://i.pravatar.cc/80?img=14",
  },
  {
    name: "Laura B.",
    city: "Toulouse",
    quote: "Enfin une application qui rend l'alimentation équilibrée accessible et sans prise de tête.",
    avatar: "LB",
    photo: "https://i.pravatar.cc/80?img=25",
  },
];

export const FALLBACK_RECIPES = [
  {
    id: 1,
    nom_recette: "Burrata sur asperges avec huile aux herbes",
    temps_preparation_min: 30,
    nombre_personnes: 4,
    image_url: null,
  },
  {
    id: 2,
    nom_recette: "Salade de quinoa aux légumes croquants",
    temps_preparation_min: 25,
    nombre_personnes: 2,
    image_url: null,
  },
  {
    id: 3,
    nom_recette: "Poulet rôti aux herbes de Provence",
    temps_preparation_min: 45,
    nombre_personnes: 4,
    image_url: null,
  },
  {
    id: 4,
    nom_recette: "Velouté de courgettes au basilic",
    temps_preparation_min: 20,
    nombre_personnes: 3,
    image_url: null,
  },
];
