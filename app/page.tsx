import type { Metadata } from "next";
import LandingPageClient from "./components/landing/LandingPageClient";
import type { LandingRecipe } from "./src/lib/landingRecipes";
import { getCachedRecipes } from "./src/lib/recipesServerCache";
import { pickLandingRecipes } from "./src/lib/landingRecipes";

export const metadata: Metadata = {
  title: "Foodlane | Simplifie tes repas, menus personnalisés et liste de courses",
  description:
    "Simplifie tes repas avec Foodlane : menus personnalisés, liste de courses automatique, recettes équilibrées et assistant nutritionnel IA pour gagner du temps chaque semaine.",
  keywords: [
    "organisation des repas",
    "menus personnalisés",
    "liste de courses",
    "recettes",
    "alimentation équilibrée",
    "nutrition",
    "gain de temps cuisine",
  ],
  alternates: { canonical: "/" },
};

export default async function RootPage() {
  let recipes: LandingRecipe[] = [];

  try {
    const all = await getCachedRecipes();
    recipes = pickLandingRecipes(all);
  } catch (e) {
    console.warn("[Landing] Recettes non chargées:", e);
  }

  return <LandingPageClient recipes={recipes} />;
}
