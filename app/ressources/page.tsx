"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Recipe } from "../src/lib/recipes";
import { loadFavorites, saveFavorites } from "../src/lib/favorites";
import RecipeImage from "../components/RecipeImage";
import { detectDietaryBadges, DIETARY_BADGE_ICONS } from "../src/lib/dietaryProfiles";

const RESOURCE_ITEMS = [
  {
    title: "Guides nutrition",
    description: "Documents PDF sur l'équilibre alimentaire, portions et idées batch cooking.",
    cta: "Télécharger",
  },
];

export default function RessourcesPage() {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    // Charger les favoris au montage
    const loadData = () => {
      const loadedFavorites = loadFavorites();
      setFavorites(prevFavorites => {
        // Ne mettre à jour que si les données ont vraiment changé (comparaison par ID)
        const prevIds = prevFavorites.map(f => f.id).sort().join(',');
        const loadedIds = loadedFavorites.map(f => f.id).sort().join(',');
        if (prevIds !== loadedIds) {
          console.log(`[RessourcesPage] Chargement: ${loadedFavorites.length} favoris trouvés`, loadedFavorites);
          return loadedFavorites;
        }
        return prevFavorites;
      });
    };
    
    // Charger immédiatement
    loadData();

    // Écouter les changements de localStorage (depuis d'autres onglets)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "foodlane_favorites") {
        loadData();
      }
    };

    // Écouter l'événement personnalisé de mise à jour des favoris
    const handleFavoritesUpdated = () => {
      loadData();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("favoritesUpdated", handleFavoritesUpdated);
    
    // Vérifier périodiquement les changements (pour la même page)
    const interval = setInterval(loadData, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("favoritesUpdated", handleFavoritesUpdated);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Sauvegarder seulement si les favoris ont changé (éviter les boucles)
    const currentFavorites = loadFavorites();
    const currentIds = currentFavorites.map(f => f.id).sort().join(',');
    const newIds = favorites.map(f => f.id).sort().join(',');
    
    if (currentIds !== newIds) {
      saveFavorites(favorites);
    }
  }, [favorites]);

  function isFavorite(recipeId: string): boolean {
    return favorites.some((fav) => fav.id === recipeId);
  }

  function toggleFavorite(recipe: Recipe) {
    setFavorites((prev) => {
      const exists = prev.some((fav) => fav.id === recipe.id);
      let newFavorites: Recipe[];
      if (exists) {
        if (selectedRecipe?.id === recipe.id) {
          setSelectedRecipe(null);
        }
        newFavorites = prev.filter((fav) => fav.id !== recipe.id);
      } else {
        newFavorites = [...prev, recipe];
      }
      // Sauvegarder immédiatement
      saveFavorites(newFavorites);
      return newFavorites;
    });
  }

  async function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newsletterEmail.trim()) {
      setNewsletterStatus("error");
      return;
    }

    setNewsletterStatus("loading");

    try {
      // TODO: Implémenter l'appel API pour l'inscription à la newsletter
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const existingEmails = JSON.parse(localStorage.getItem("newsletter-emails") || "[]");
      if (!existingEmails.includes(newsletterEmail.trim())) {
        existingEmails.push(newsletterEmail.trim());
        localStorage.setItem("newsletter-emails", JSON.stringify(existingEmails));
      }
      
      setNewsletterStatus("success");
      setNewsletterEmail("");
      
      setTimeout(() => {
        setNewsletterStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Erreur lors de l'inscription à la newsletter:", error);
      setNewsletterStatus("error");
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Ressources</h1>
        <p className="text-sm text-[var(--beige-text-light)] mt-2">
          Tes recettes favorites, listes de courses et contenus nutritionnels
        </p>
      </header>

      {/* Menu de la semaine */}
      <section className="mb-6">
        <Link
          href="/menu-semaine"
          className="block rounded-2xl border border-[var(--beige-border)] bg-[var(--beige-card)] px-4 py-4 hover:border-[#D44A4A] transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1 text-[var(--foreground)]">
                📅 Menu de la semaine
              </h3>
              <p className="text-xs text-[var(--beige-text-light)]">
                Organise tes repas et génère ta liste de courses
              </p>
            </div>
            <span className="text-[var(--beige-text-muted)] text-lg">→</span>
          </div>
        </Link>
      </section>

      {/* Recettes favorites */}
      <section className="mb-6 rounded-2xl border border-[var(--beige-border)] bg-[var(--beige-card)] px-4 py-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Recettes favorites</h2>
            <p className="text-xs text-[var(--beige-text-light)]">
              Retrouve les idées que tu as aimées
            </p>
          </div>
          {favorites.length > 0 && (
            <span className="px-2 py-1 rounded-full bg-[#D44A4A] text-[11px] text-white font-semibold">
              {favorites.length}
            </span>
          )}
        </div>

        {favorites.length === 0 ? (
          <p className="text-xs text-[var(--beige-text-light)]">
            Tu n&apos;as pas encore de favoris. Depuis l&apos;onglet Cuisine,
            ouvre une recette et appuie sur ☆ pour l&apos;enregistrer ici.
          </p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {favorites.map((recipe) => (
              <li
                key={`fav-${recipe.id}`}
                className="rounded-xl border border-[var(--beige-border)] px-3 py-2 bg-white"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-1 text-[var(--foreground)]">{recipe.nom}</p>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {detectDietaryBadges(recipe).slice(0, 2).map((badge) => (
                        <span
                          key={badge}
                          className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#D44A4A] text-white border border-[#C03A3A] flex items-center gap-0.5"
                          title={badge}
                        >
                          <span className="text-[8px]">{DIETARY_BADGE_ICONS[badge]}</span>
                          <span>{badge}</span>
                        </span>
                      ))}
                      {detectDietaryBadges(recipe).length > 2 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#D44A4A] text-white border border-[#C03A3A]">
                          +{detectDietaryBadges(recipe).length - 2}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--beige-text-light)]">
                      {recipe.difficulte || "Difficulté ?"} •{" "}
                      {recipe.temps_preparation_min || "?"} min •{" "}
                      {recipe.nb_personnes || "?"} pers
                    </p>
                  </div>
                  <button
                    className={`text-base ${
                      isFavorite(recipe.id)
                        ? "text-[#BB8C78]"
                        : "text-[var(--beige-text-muted)]"
                    }`}
                    onClick={() => toggleFavorite(recipe)}
                    aria-label="Basculer le favori"
                  >
                    {isFavorite(recipe.id) ? "★" : "☆"}
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    className="flex-1 rounded-xl border border-[#C03A3A] bg-[#D44A4A] px-3 py-2 text-xs text-white hover:bg-[#C03A3A] transition"
                    onClick={() => setSelectedRecipe(recipe)}
                  >
                    Voir la fiche
                  </button>
                  <button
                    className="px-3 py-2 rounded-xl border border-transparent text-xs text-red-300 hover:text-red-400"
                    onClick={() => toggleFavorite(recipe)}
                  >
                    Retirer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Listes de courses sauvegardées */}
      <section className="mb-6 rounded-2xl border border-dashed border-[var(--beige-border)] bg-[var(--beige-card)] px-4 py-4">
        <h2 className="text-base font-semibold mb-2 text-[var(--foreground)]">
          Listes de courses sauvegardées
        </h2>
        <p className="text-xs text-[var(--beige-text-light)] mb-3">
          Tes listes de courses générées depuis les menus seront disponibles ici.
        </p>
        <div className="rounded-xl border border-dashed border-[var(--beige-border)] px-3 py-3 text-center text-xs text-[var(--beige-text-light)]">
          Aucune liste sauvegardée pour le moment
        </div>
      </section>

      {/* Ressources & contenus */}
      <section className="mb-6 rounded-2xl border border-[var(--beige-border)] bg-[var(--beige-card)] px-4 py-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Ressources & contenus</h2>
            <p className="text-xs text-[var(--beige-text-light)]">
              Newsletters, guides nutritionnels et articles
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {/* Formulaire Newsletter */}
          <article className="rounded-xl border border-[var(--beige-border)] bg-white px-3 py-3">
            <h3 className="text-sm font-semibold mb-1 text-[var(--foreground)]">Newsletter Foodlane</h3>
            <p className="text-xs text-[var(--beige-text-light)] mb-3">
              Astuces anti-gaspi, menus de saison et promos locales chaque semaine.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-2">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => {
                  setNewsletterEmail(e.target.value);
                  setNewsletterStatus("idle");
                }}
                placeholder="Ton adresse email"
                className="w-full rounded-xl border border-[var(--beige-border)] bg-[var(--beige-rose)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[#D44A4A] placeholder:text-[var(--beige-text-muted)]"
                required
                disabled={newsletterStatus === "loading"}
              />
              <button
                type="submit"
                disabled={newsletterStatus === "loading" || !newsletterEmail.trim()}
                className="w-full rounded-xl border border-[#C03A3A] bg-[#D44A4A] px-3 py-2 text-xs text-white hover:bg-[#C03A3A] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {newsletterStatus === "loading"
                  ? "Inscription..."
                  : newsletterStatus === "success"
                  ? "✓ Inscrit !"
                  : "S'abonner"}
              </button>
              {newsletterStatus === "success" && (
                <p className="text-xs text-green-600 text-center">
                  Merci ! Tu recevras bientôt nos newsletters.
                </p>
              )}
              {newsletterStatus === "error" && (
                <p className="text-xs text-red-500 text-center">
                  Une erreur est survenue. Réessaie plus tard.
                </p>
              )}
            </form>
          </article>

          {/* Guides nutrition */}
          {RESOURCE_ITEMS.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-[var(--beige-border)] bg-white px-3 py-3"
            >
              <h3 className="text-sm font-semibold mb-1 text-[var(--foreground)]">{item.title}</h3>
              <p className="text-xs text-[var(--beige-text-light)] mb-2">{item.description}</p>
              <button className="w-full rounded-xl border border-[#C03A3A] bg-[#D44A4A] px-3 py-2 text-xs text-white hover:bg-[#C03A3A] transition">
                {item.cta}
              </button>
            </article>
          ))}

          {/* Lien vers site externe */}
          <article className="rounded-xl border border-[var(--beige-border)] bg-white px-3 py-3">
            <h3 className="text-sm font-semibold mb-1 text-[var(--foreground)]">Articles & conseils</h3>
            <p className="text-xs text-[var(--beige-text-light)] mb-2">
              Découvre nos articles sur l&apos;équilibre alimentaire et la nutrition.
            </p>
            <a
              href="https://foodlane.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-xl border border-[#C03A3A] bg-[#D44A4A] px-3 py-2 text-xs text-white hover:bg-[#C03A3A] transition text-center"
            >
              Voir les articles →
            </a>
          </article>
        </div>
      </section>

      {/* Modal de détail de recette */}
      {selectedRecipe && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-[#FAF6F0] border border-[#D4C4B8] rounded-3xl px-4 pt-4 pb-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-2">{selectedRecipe.nom}</h3>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedRecipe.type && (
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      selectedRecipe.type.toLowerCase().includes("sucré")
                        ? "bg-[#F5E6D8] text-[#D44A4A] border border-[#D4C4B8]"
                        : selectedRecipe.type.toLowerCase().includes("salé")
                        ? "bg-[#E8D5C4] text-[#C03A3A] border border-[#CAAFA0]"
                        : "bg-[var(--beige-card-alt)] text-[var(--beige-text-muted)] border border-[var(--beige-border)]"
                    }`}>
                      {selectedRecipe.type}
                    </span>
                  )}
                  {detectDietaryBadges(selectedRecipe).map((badge) => (
                    <span
                      key={badge}
                      className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#D44A4A] text-white border border-[#C03A3A] flex items-center gap-1"
                    >
                      <span>{DIETARY_BADGE_ICONS[badge]}</span>
                      <span>{badge}</span>
                    </span>
                  ))}
                </div>
              </div>
              <button
                className="text-xs text-[#9A6A6A] hover:text-[#6B2E2E] flex-shrink-0"
                onClick={() => setSelectedRecipe(null)}
              >
                Fermer ✕
              </button>
            </div>

            {selectedRecipe.image_url && (
              <div className="mb-3">
                <RecipeImage
                  imageUrl={selectedRecipe.image_url}
                  alt={selectedRecipe.nom}
                  className="w-full h-40 rounded-2xl border border-[#D4C4B8]"
                  fallbackClassName="rounded-2xl"
                />
              </div>
            )}

            <p className="text-[#726566] text-sm mb-3">
              {selectedRecipe.description_courte || "Recette sauvegardée."}
            </p>

            <div className="mb-3">
              <h4 className="font-semibold text-sm mb-1">Ingrédients</h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-[#726566]">
                {selectedRecipe.ingredients.split(";").map((item, idx) => {
                  const trimmed = item.trim();
                  if (!trimmed) return null;
                  return <li key={`ing-${idx}`}>{trimmed}</li>;
                })}
              </ul>
            </div>

            <div className="mb-3">
              <h4 className="font-semibold text-sm mb-1">Étapes</h4>
              <ol className="space-y-3 text-xs text-[#726566]">
                {selectedRecipe.instructions.split(";").map((item, idx) => {
                  const trimmed = item.trim();
                  if (!trimmed) return null;
                  return (
                    <li key={`step-${idx}`} className="block">
                      <span className="font-semibold text-[#6B2E2E]">{idx + 1}.</span> {trimmed}
                    </li>
                  );
                })}
              </ol>
            </div>

            <button
              className="w-full mt-2 px-4 py-2 rounded-2xl bg-[#D44A4A] border border-[#C03A3A] text-xs text-white"
              onClick={() => setSelectedRecipe(null)}
            >
              ← Fermer
            </button>
          </div>
        </div>
      )}

    </main>
  );
}

