import {
  FREE_MENU_GENERATIONS_PER_MONTH,
  FREE_DIETITIAN_TEXT_ANALYSES_PER_MONTH,
  FREE_GROCERY_EXPORTS_PER_WEEK,
} from "./freemiumLimits";



/** Tarifs standards affichés (€) — alignés produit ; Stripe utilise les Price IDs côté serveur. */

export const PREMIUM_PRICE_MONTHLY = 7.99;

export const PREMIUM_PRICE_YEARLY = 79.99;

export const PLUS_PRICE_MONTHLY = 10.99;

export const PLUS_PRICE_YEARLY = 99.99;



/** Tarifs fondateur / lancement (€) — affichage uniquement tant que des places restent. */

export const FOUNDER_PREMIUM_MONTHLY = 5.99;

export const FOUNDER_PREMIUM_YEARLY = 59.99;

export const FOUNDER_PLUS_MONTHLY = 9.99;

export const FOUNDER_PLUS_YEARLY = 97.99;



export function formatEur(n: number): string {

  return new Intl.NumberFormat("fr-FR", {

    style: "currency",

    currency: "EUR",

    minimumFractionDigits: n % 1 === 0 ? 0 : 2,

    maximumFractionDigits: 2,

  }).format(n);

}



export function yearlySavingsPercent(monthly: number, yearly: number): number {

  const monthlyYear = monthly * 12;

  if (monthlyYear <= 0) return 0;

  return Math.round((1 - yearly / monthlyYear) * 100);

}



export function premiumYearlySavingsPercent(): number {

  return yearlySavingsPercent(PREMIUM_PRICE_MONTHLY, PREMIUM_PRICE_YEARLY);

}



export function plusYearlySavingsPercent(): number {

  return yearlySavingsPercent(PLUS_PRICE_MONTHLY, PLUS_PRICE_YEARLY);

}



export function founderPremiumYearlySavingsPercent(): number {

  return yearlySavingsPercent(FOUNDER_PREMIUM_MONTHLY, FOUNDER_PREMIUM_YEARLY);

}



export function founderPlusYearlySavingsPercent(): number {

  return yearlySavingsPercent(FOUNDER_PLUS_MONTHLY, FOUNDER_PLUS_YEARLY);

}



/** Lignes de comparaison pour le tableau (texte court, ton bienveillant). */

export const PLAN_COMPARISON_ROWS: {

  label: string;

  free: string;

  premium: string;

  plus: string;

}[] = [

  {

    label: "Génération de menus",

    free: `${FREE_MENU_GENERATIONS_PER_MONTH} par mois`,

    premium: "Illimitée",

    plus: "Illimitée",

  },

  {

    label: "Liste de courses",

    free: `Simple, ${FREE_GROCERY_EXPORTS_PER_WEEK} export / semaine`,

    premium: "Avancée (regroupement, catégories)",

    plus: "Comme Premium",

  },

  {

    label: "Exports (PDF, image, partage)",

    free: "Limités",

    premium: "Illimités",

    plus: "Illimités",

  },

  {

    label: "Recettes & filtres",

    free: "Base + filtres de base",

    premium: "Tous les filtres",

    plus: "Tous les filtres",

  },

  {

    label: "Favoris",

    free: "Limités",

    premium: "Illimités",

    plus: "Illimités",

  },

  {
    label: "Assistant diététicien (texte)",
    free: `${FREE_DIETITIAN_TEXT_ANALYSES_PER_MONTH} par mois max, puis bloqué`,
    premium: "Illimité",
    plus: "Illimité",
  },
  {
    label: "Analyse photo & suivi avancé",
    free: "Non inclus (Premium Plus)",
    premium: "—",
    plus: "Inclus (priorité feuille de route)",
  },

  {

    label: "Défis & conseils personnalisés",

    free: "—",

    premium: "Conseils du jour",

    plus: "Quotidiens + défis sur-mesure",

  },

  {

    label: "Publicités",

    free: "Affichées",

    premium: "Aucune",

    plus: "Aucune",

  },

];


