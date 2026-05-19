/**
 * Limites produit FREEMIUM — chiffres alignés avec l’offre et `pricingPlans`.
 * Application côté serveur : `usageQuotasServer` + routes API.
 */

/** Générations de menu (plan hebdo) par mois calendaire. */
export const FREE_MENU_GENERATIONS_PER_MONTH = 2;

/** Régénérations d’un créneau (recette alternative) par mois calendaire. */
export const FREE_SLOT_REGENERATIONS_PER_MONTH = 6;

/** Affinage IA « recettes pour moi » par semaine (lundi–dimanche). */
export const FREE_RECIPES_FOR_ME_AI_PER_WEEK = 10;

/**
 * Analyses assistant diététicien **texte** (ex. `/api/analyze-daily-meals`) par mois calendaire.
 * Au-delà : bloqué pour le gratuit jusqu’à un abonnement payant. L’analyse **photo** reste Premium Plus uniquement.
 */
export const FREE_DIETITIAN_TEXT_ANALYSES_PER_MONTH = 2;

/** Exports liste de courses (note / PDF / image) par semaine. */
export const FREE_GROCERY_EXPORTS_PER_WEEK = 1;
