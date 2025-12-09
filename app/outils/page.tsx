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

export default function ToolsPage() {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  function isFavorite(recipeId: string): boolean {
    return favorites.some((fav) => fav.id === recipeId);
  }

  function toggleFavorite(recipe: Recipe) {
    setFavorites((prev) => {
      const exists = prev.some((fav) => fav.id === recipe.id);
      if (exists) {
        if (selectedRecipe?.id === recipe.id) {
          setSelectedRecipe(null);
        }
        return prev.filter((fav) => fav.id !== recipe.id);
      }
      return [...prev, recipe];
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
      // Pour l'instant, on simule une soumission réussie
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Sauvegarder l'email dans localStorage pour l'instant
      const existingEmails = JSON.parse(localStorage.getItem("newsletter-emails") || "[]");
      if (!existingEmails.includes(newsletterEmail.trim())) {
        existingEmails.push(newsletterEmail.trim());
        localStorage.setItem("newsletter-emails", JSON.stringify(existingEmails));
      }
      
      setNewsletterStatus("success");
      setNewsletterEmail("");
      
      // Réinitialiser le message de succès après 3 secondes
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
      <header className="mb-5">
        <h1 className="text-2xl font-bold">Tes outils</h1>
        <p className="text-sm text-[#9A6A6A]">
          Accède à tes recettes sauvegardées et à la future liste de courses.
        </p>
      </header>

      {/* Bloc Menu de la semaine */}
      <section className="mb-5">
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

      <section className="mb-5 rounded-2xl bg-[#FFD9D9] border border-[#E8A0A0] px-3 py-3 text-sm text-[#6B2E2E]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <h2 className="text-base font-semibold">Recettes sauvegardées</h2>
            <p className="text-xs text-[#9A6A6A]">
              Retrouve les idées que tu as aimées et consulte la fiche détail.
            </p>
          </div>
          {favorites.length > 0 && (
            <span className="px-2 py-1 rounded-full bg-[#D44A4A] text-[11px] text-white font-semibold">
              {favorites.length}
            </span>
          )}
        </div>

        {favorites.length === 0 ? (
          <p className="text-xs text-[#9A6A6A]">
            Tu n&apos;as pas encore de favoris. Depuis l&apos;onglet Accueil,
            ouvre une recette et appuie sur ☆ pour l&apos;enregistrer ici.
          </p>
        ) : (
          <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {favorites.map((recipe) => (
              <li
                key={`fav-${recipe.id}`}
                className="rounded-xl border border-[#E8A0A0] px-3 py-2 bg-[#FFC4C4]/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-1">{recipe.nom}</p>
                    {/* Badges diététiques dans la liste des favoris */}
                    <div className="flex flex-wrap gap-1 mb-1">
                      {detectDietaryBadges(recipe).slice(0, 2).map((badge) => (
                        <span
                          key={badge}
                          className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#D44A4A] text-white border border-[#7A5F3F] flex items-center gap-0.5"
                          title={badge}
                        >
                          <span className="text-[8px]">{DIETARY_BADGE_ICONS[badge]}</span>
                          <span>{badge}</span>
                        </span>
                      ))}
                      {detectDietaryBadges(recipe).length > 2 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[#D44A4A] text-white border border-[#7A5F3F]">
                          +{detectDietaryBadges(recipe).length - 2}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#9A6A6A]">
                      {recipe.difficulte || "Difficulté ?"} •{" "}
                      {recipe.temps_preparation_min || "?"} min •{" "}
                      {recipe.nb_personnes || "?"} pers
                    </p>
                  </div>
                  <button
                    className={`text-base ${
                      isFavorite(recipe.id)
                        ? "text-[#BB8C78]"
                        : "text-[#9A6A6A]"
                    }`}
                    onClick={() => toggleFavorite(recipe)}
                    aria-label="Basculer le favori"
                  >
                    {isFavorite(recipe.id) ? "★" : "☆"}
                  </button>
                </div>
                <div className="mt-2 flex gap-2">
                  <button
                    className="flex-1 rounded-xl border border-[#7A5F3F] bg-[#D44A4A] px-3 py-2 text-xs text-white hover:bg-[#7A5F3F] transition"
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

      <section className="rounded-2xl bg-[#FFD9D9] border border-[#E8A0A0] px-3 py-3 text-sm mb-5 text-[#6B2E2E]">
        <h2 className="text-base font-semibold mb-1">
          Liste de courses{" "}
          <span className="text-[#BB8C78] text-xs uppercase tracking-wide">
            Premium
          </span>
        </h2>
        <p className="text-xs text-[#9A6A6A] mb-3">
          Transforme tes recettes favorites en liste de courses prête à l&apos;emploi.
        </p>
        <div className="rounded-xl border border-dashed border-[#CAAFA0]/60 px-3 py-3 text-center text-xs text-[#9A6A6A]">
          🔒 Fonction réservée aux comptes Premium — bientôt disponible.
        </div>
      </section>

      <section className="rounded-2xl bg-[#FFD9D9] border border-[#E8A0A0] px-3 py-3 text-sm text-[#6B2E2E]">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base font-semibold">Ressources & contenus</h2>
            <p className="text-xs text-[#9A6A6A]">
              Newsletters, documents d&apos;information et contenus nutritionnels à portée de main.
            </p>
          </div>
          <span className="text-[11px] text-[#9A6A6A] uppercase tracking-wide">
            Bêta
          </span>
        </div>
        <div className="space-y-3">
          {/* Formulaire Newsletter */}
          <article className="rounded-xl border border-[#E8A0A0] bg-[#FFC4C4]/60 px-3 py-3">
            <h3 className="text-sm font-semibold mb-1">Newsletter Foodlane</h3>
            <p className="text-xs text-[#9A6A6A] mb-3">
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
                className="w-full rounded-xl border border-[#E8A0A0] bg-[#FAF6F0] px-3 py-2 text-xs text-[#6B2E2E] outline-none focus:border-[#D44A4A] placeholder:text-[#9A6A6A]"
                required
                disabled={newsletterStatus === "loading"}
              />
              <button
                type="submit"
                disabled={newsletterStatus === "loading" || !newsletterEmail.trim()}
                className="w-full rounded-xl border border-[#7A5F3F] bg-[#D44A4A] px-3 py-2 text-xs text-white hover:bg-[#7A5F3F] transition disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Autres ressources */}
          {RESOURCE_ITEMS.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-[#E8A0A0] bg-[#FFC4C4]/60 px-3 py-3"
            >
              <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
              <p className="text-xs text-[#9A6A6A] mb-2">{item.description}</p>
              <button className="w-full rounded-xl border border-[#7A5F3F] bg-[#D44A4A] px-3 py-2 text-xs text-white hover:bg-[#7A5F3F] transition">
                {item.cta}
              </button>
            </article>
          ))}
        </div>
      </section>

      {selectedRecipe && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-[#FAF6F0] border border-[#E8A0A0] rounded-3xl px-4 pt-4 pb-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-2">{selectedRecipe.nom}</h3>
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedRecipe.type && (
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      selectedRecipe.type.toLowerCase().includes("sucré")
                        ? "bg-[#FFD9D9] text-[#D44A4A] border border-[#E8A0A0]"
                        : selectedRecipe.type.toLowerCase().includes("salé")
                        ? "bg-[#FFC4C4] text-[#7A5F3F] border border-[#CAAFA0]"
                        : "bg-[var(--beige-card-alt)] text-[var(--beige-text-muted)] border border-[var(--beige-border)]"
                    }`}>
                      {selectedRecipe.type}
                    </span>
                  )}
                  {/* Badges diététiques détectés automatiquement */}
                  {detectDietaryBadges(selectedRecipe).map((badge) => (
                    <span
                      key={badge}
                      className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#D44A4A] text-white border border-[#7A5F3F] flex items-center gap-1"
                    >
                      <span>{DIETARY_BADGE_ICONS[badge]}</span>
                      <span>{badge}</span>
                    </span>
                  ))}
                  {selectedRecipe.difficulte && (
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      selectedRecipe.difficulte.toLowerCase().includes("facile")
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : selectedRecipe.difficulte.toLowerCase().includes("moyen")
                        ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                        : selectedRecipe.difficulte.toLowerCase().includes("difficile")
                        ? "bg-orange-100 text-orange-700 border border-orange-300"
                        : "bg-[var(--beige-card-alt)] text-[var(--beige-text-muted)] border border-[var(--beige-border)]"
                    }`}>
                      {selectedRecipe.difficulte}
                    </span>
                  )}
                  {selectedRecipe.temps_preparation_min > 0 && (
                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#FFC4C4] text-[#6B2E2E] border border-[#E8A0A0]">
                      ⏱ {selectedRecipe.temps_preparation_min} min
                    </span>
                  )}
                  {selectedRecipe.nb_personnes > 0 && (
                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#FFC4C4] text-[#6B2E2E] border border-[#E8A0A0]">
                      👥 {selectedRecipe.nb_personnes} pers
                    </span>
                  )}
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
                  className="w-full h-40 rounded-2xl border border-[#E8A0A0]"
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

            {selectedRecipe.equipements && (
              <div className="mb-3">
                <h4 className="font-semibold text-sm mb-1">Équipements</h4>
                <ul className="list-disc list-inside space-y-1 text-xs text-[#726566]">
                  {selectedRecipe.equipements.split(";").map((item, idx) => {
                    const trimmed = item.trim();
                    if (!trimmed) return null;
                    return <li key={`equip-${idx}`}>{trimmed}</li>;
                  })}
                </ul>
              </div>
            )}

            <button
              className="w-full mt-2 px-4 py-2 rounded-2xl bg-[#D44A4A] border border-[#7A5F3F] text-xs text-white"
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

