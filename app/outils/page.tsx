"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Recipe } from "../src/lib/recipes";
import { loadFavorites, saveFavorites } from "../src/lib/favorites";
import RecipeImage from "../components/RecipeImage";
import {
  detectDietaryBadges,
  DIETARY_BADGE_ICONS,
} from "../src/lib/dietaryProfiles";

const RESOURCE_ITEMS = [
  {
    title: "Guides nutrition",
    description:
      "Documents PDF sur l'équilibre alimentaire, portions et idées batch cooking.",
    cta: "Télécharger",
  },
];

export default function OutilsPage() {
  const [favorites, setFavorites] = useState<Recipe[]>([]);

  // ✅ Charge correctement les favoris (loadFavorites renvoie une Promise)
  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const data = await loadFavorites(); // Promise<Recipe[]>
        setFavorites(data || []);
      } catch (error) {
        console.error(
          "Erreur lors du chargement des recettes favorites :",
          error
        );
      }
    };

    fetchFavorites();
  }, []);

  // ✅ Exemple : suppression d’une recette des favoris + sauvegarde
  const handleRemoveFavorite = async (id: string | number) => {
    try {
      const updated = favorites.filter((recipe) => recipe.id !== id);
      setFavorites(updated);
      await saveFavorites(updated);
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour des favoris :",
        error
      );
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Titre de page */}
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Outils & ressources
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Retrouve ici tes recettes favorites et quelques ressources utiles
            pour t&apos;organiser plus sereinement.
          </p>
        </header>

        {/* Bloc ressources */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Ressources à télécharger
          </h2>
          <div className="space-y-3">
            {RESOURCE_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-[var(--border-subtle)] bg-white/80 p-4 shadow-sm"
              >
                <h3 className="font-semibold text-[var(--text-primary)]">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {item.description}
                </p>
                <button
                  type="button"
                  className="mt-3 inline-flex items-center rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-strong)] transition-colors"
                >
                  {item.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Bloc favoris */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Tes recettes favorites
            </h2>
            <Link
              href="/favoris"
              className="text-xs font-medium text-[var(--accent)] hover:underline"
            >
              Voir tout
            </Link>
          </div>

          {favorites.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Tu n&apos;as pas encore ajouté de recette en favoris. Quand tu en
              ajoutes une, elle apparaîtra ici pour que tu la retrouves en un
              clin d&apos;œil.
            </p>
          ) : (
            <div className="space-y-3">
              {favorites.map((recipe) => {
                const badges = detectDietaryBadges(recipe);

                return (
                  <div
                    key={recipe.id}
                    className="flex gap-3 rounded-xl border border-[var(--border-subtle)] bg-white/80 p-3 shadow-sm"
                  >
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      <RecipeImage 
                        imageUrl={recipe.image_url} 
                        alt={recipe.nom}
                        className="h-full w-full"
                      />
                    </div>

                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                          {recipe.nom}
                        </h3>
                        {badges && badges.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {badges.map((badge) => {
                              const icon = DIETARY_BADGE_ICONS[badge];
                              return (
                                <span
                                  key={badge}
                                  className="inline-flex items-center gap-1 rounded-full bg-[var(--pill-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--pill-text)]"
                                >
                                  {icon && <span>{icon}</span>}
                                  {badge}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <Link
                          href={`/recette/${recipe.id}`}
                          className="text-xs font-medium text-[var(--accent)] hover:underline"
                        >
                          Ouvrir la recette
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleRemoveFavorite(recipe.id)}
                          className="text-xs text-[var(--danger)] hover:underline"
                        >
                          Retirer des favoris
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
