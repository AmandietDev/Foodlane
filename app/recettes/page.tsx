"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import LoadingSpinner from "../components/LoadingSpinner";
import RecipeImage from "../components/RecipeImage";
import type { Recipe } from "../src/lib/recipes";
import { plannerAuthHeaders } from "../src/lib/plannerClient";
import { getCurrentSeason, scoreRecipeSeasonRelevance } from "../src/lib/seasonalFilter";
import { addFavorite, loadFavorites, removeFavorite } from "../src/lib/favorites";
import { addRecipeToCollection, loadCollections, type Collection } from "../src/lib/collections";

type RecipeWithPersonalization = Recipe & {
  personalization_score?: number;
  personalization_reason?: string;
};

type TypeFilter = "all" | "sweet" | "savory";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function matchesType(recipeType: string | null, type: TypeFilter): boolean {
  if (type === "all") return true;
  const t = normalize(recipeType || "");
  if (type === "sweet") return t.includes("sucre") || t.includes("sucré");
  return t.includes("sale") || t.includes("salé");
}

/** Découpe une chaîne (URL ou collage) en libellés d’ingrédients, sans doublon (insensible à la casse / accents). */
function splitIngredientPhrasesFromRaw(raw: string): string[] {
  const parts = raw
    .split(/[,;\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const n = normalize(p);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(p);
  }
  return out;
}

export default function RecettesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: sessionLoading } = useSupabaseSession();

  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<RecipeWithPersonalization[]>([]);
  const [allRecipes, setAllRecipes] = useState<RecipeWithPersonalization[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [ingredientTags, setIngredientTags] = useState<string[]>(() => {
    const raw =
      searchParams.get("foods") ||
      searchParams.get("ingredients") ||
      searchParams.get("q") ||
      "";
    return splitIngredientPhrasesFromRaw(raw);
  });
  const [ingredientDraft, setIngredientDraft] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(
    searchParams.get("type") === "sweet" || searchParams.get("type") === "savory"
      ? (searchParams.get("type") as TypeFilter)
      : "all"
  );

  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => new Set());
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionModalRecipe, setCollectionModalRecipe] = useState<RecipeWithPersonalization | null>(null);
  const [favBusyId, setFavBusyId] = useState<number | null>(null);

  async function refreshFavoritesAndCollections() {
    const [favs, cols] = await Promise.all([loadFavorites(), loadCollections()]);
    setFavoriteIds(new Set(favs.map((f) => f.id)));
    setCollections(cols);
  }

  useEffect(() => {
    if (!user) return;
    void refreshFavoritesAndCollections();
    const onFav = () => void refreshFavoritesAndCollections();
    const onCol = () => void refreshFavoritesAndCollections();
    window.addEventListener("favoritesUpdated", onFav);
    window.addEventListener("collectionsUpdated", onCol);
    return () => {
      window.removeEventListener("favoritesUpdated", onFav);
      window.removeEventListener("collectionsUpdated", onCol);
    };
  }, [user]);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadPersonalizedRecipes() {
      setLoading(true);
      setError(null);

      try {
        const auth = await plannerAuthHeaders();

        const [forMeRes, allRes] = await Promise.all([
          fetch("/api/recipes/for-me", {
            headers: {
              "Content-Type": "application/json",
              ...auth,
            },
          }),
          fetch("/api/recipes"),
        ]);

        const [forMeJson, allJson] = await Promise.all([
          forMeRes.json().catch(() => ({})),
          allRes.json().catch(() => ({})),
        ]);

        if (cancelled) return;

        const allLoaded =
          allRes.ok && Array.isArray(allJson.recipes)
            ? (allJson.recipes as RecipeWithPersonalization[])
            : [];
        setAllRecipes(allLoaded);

        if (forMeRes.ok && Array.isArray(forMeJson.recipes) && forMeJson.recipes.length > 0) {
          setRecipes(forMeJson.recipes as RecipeWithPersonalization[]);
        } else if (allLoaded.length > 0) {
          setRecipes(allLoaded);
        } else {
          setRecipes([]);
        }

        if (!forMeRes.ok && forMeRes.status !== 403 && allLoaded.length === 0) {
          setError(
            typeof forMeJson.error === "string"
              ? forMeJson.error
              : "Impossible de charger les recettes personnalisées."
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur de chargement.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPersonalizedRecipes();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const addIngredientFromDraft = () => {
    const trimmed = ingredientDraft.trim();
    if (!trimmed) return;
    const candidates = splitIngredientPhrasesFromRaw(trimmed);
    if (candidates.length === 0) return;
    setIngredientTags((prev) => {
      const seen = new Set(prev.map((p) => normalize(p)));
      const next = [...prev];
      for (const p of candidates) {
        const n = normalize(p);
        if (!n || seen.has(n)) continue;
        seen.add(n);
        next.push(p);
      }
      return next;
    });
    setIngredientDraft("");
  };

  const removeIngredientTag = (index: number) => {
    setIngredientTags((prev) => prev.filter((_, i) => i !== index));
  };

  const filtered = useMemo(() => {
    const terms = ingredientTags.map((t) => normalize(t)).filter(Boolean);
    const hasTerms = terms.length > 0;
    const hasTypeFilter = typeFilter !== "all";
    const season = getCurrentSeason();

    // Sans filtre: vue personnalisée.
    // Avec filtre/terme: recherche sur toute la base pour éviter les faux "0 résultat".
    const personalizationIds = new Set(recipes.map((r) => r.id));
    const personalizationScore = new Map(recipes.map((r, idx) => [r.id, idx]));
    const source =
      hasTerms || hasTypeFilter
        ? (allRecipes.length ? allRecipes : recipes)
        : (recipes.length ? recipes : allRecipes);

    const out = source.filter((recipe) => {
      if (!matchesType(recipe.type, typeFilter)) return false;

      if (hasTerms) {
        const haystack = normalize(
          `${recipe.nom_recette || ""} ${recipe.description_courte || ""} ${recipe.ingredients || ""}`
        );
        const allMatch = terms.every((needle) => haystack.includes(needle));
        if (!allMatch) return false;
      }

      return true;
    });

    // Maintenir l'adaptation profil : les recettes personnalisées remontent en premier.
    out.sort((a, b) => {
      const aIn = personalizationIds.has(a.id) ? 1 : 0;
      const bIn = personalizationIds.has(b.id) ? 1 : 0;
      if (aIn !== bIn) return bIn - aIn;
      const ai = personalizationScore.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bi = personalizationScore.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return scoreRecipeSeasonRelevance(b, season) - scoreRecipeSeasonRelevance(a, season);
    });

    return out;
  }, [recipes, allRecipes, ingredientTags, typeFilter]);

  if (sessionLoading || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner message="Chargement des recettes…" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pt-6 pb-24">
      <div className="max-w-3xl mx-auto space-y-4">
        <Link href="/tableau" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          ← Retour
        </Link>

        <section className="rounded-2xl border border-[var(--beige-border)] bg-white p-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Parcourir les recettes</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Exploration personnalisée selon ton profil (régimes, allergies, équipements), avec filtres sucré/salé,
            et aliments communs. Tu peux aussi explorer sans aucun filtre.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/favoris"
              className="inline-flex items-center rounded-full border border-[var(--beige-border)] bg-[var(--background)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--beige-accent)]"
            >
              Mes favoris et collections
            </Link>
          </div>

          <div className="mt-4">
            <p className="text-xs text-[var(--text-secondary)] mb-2">
              Ajoute un ingrédient à la fois : tape son nom puis <strong>Entrée</strong> ou clique sur <strong>Ajouter</strong>.
              Les recettes se filtrent dès qu’un tag est présent ; avec plusieurs tags, tous doivent apparaître dans la recette.
            </p>
            <div className="rounded-xl border border-[var(--beige-border)] bg-white p-2 flex flex-wrap gap-2 items-center">
              {ingredientTags.map((tag, index) => (
                <span
                  key={`${normalize(tag)}-${index}`}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-[#FFF0F0] border border-[#E8C4C4] text-sm text-[var(--text-primary)]"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => removeIngredientTag(index)}
                    className="h-6 w-6 rounded-full text-[var(--text-secondary)] hover:bg-[#D44A4A]/15 hover:text-[#6B2E2E] flex items-center justify-center text-base leading-none"
                    aria-label={`Retirer ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <div className="flex flex-1 min-w-[min(100%,12rem)] gap-2 items-stretch">
                <input
                  type="text"
                  value={ingredientDraft}
                  onChange={(e) => setIngredientDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addIngredientFromDraft();
                    }
                  }}
                  placeholder="Ex. œufs, tomate, poulet…"
                  className="flex-1 min-w-0 rounded-lg border border-[var(--beige-border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--beige-accent)]"
                />
                <button
                  type="button"
                  onClick={addIngredientFromDraft}
                  disabled={!ingredientDraft.trim()}
                  className="shrink-0 px-3 py-2 rounded-lg text-sm font-semibold bg-[var(--beige-accent)] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-95"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            {[
              { id: "all", label: "Les deux" },
              { id: "sweet", label: "Sucré" },
              { id: "savory", label: "Salé" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTypeFilter(opt.id as TypeFilter)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  typeFilter === opt.id
                    ? "bg-[var(--beige-accent)] text-white border-[var(--beige-accent)]"
                    : "bg-white text-[var(--text-primary)] border-[var(--beige-border)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setIngredientTags([]);
                setIngredientDraft("");
                setTypeFilter("all");
              }}
              className="ml-auto px-3 py-1.5 rounded-lg text-sm border border-[var(--beige-border)] text-[var(--text-secondary)]"
            >
              Réinitialiser
            </button>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
        ) : null}

        <section className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {filtered.length} recette{filtered.length > 1 ? "s" : ""} trouvée{filtered.length > 1 ? "s" : ""}.
          </p>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--beige-border)] p-5 text-sm text-[var(--text-secondary)]">
              Aucune recette ne correspond à ces critères. Essaie sans filtre ou avec moins d’aliments saisis.
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {filtered.map((recipe) => {
                const isFav = favoriteIds.has(recipe.id);
                return (
                <li key={recipe.id} className="rounded-xl border border-[var(--beige-border)] bg-white p-3 flex flex-col">
                  <Link href={`/recette/${recipe.id}`} className="block flex-1">
                  <div className="h-36 rounded-lg overflow-hidden bg-[#f8f2f2]">
                    <RecipeImage
                      imageUrl={recipe.image_url || undefined}
                      alt={recipe.nom_recette || "Recette"}
                      className="w-full h-full"
                    />
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                    {recipe.nom_recette || "Recette"}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {recipe.type || "Type non renseigné"} • {recipe.temps_preparation_min || "?"} min •{" "}
                    {recipe.nombre_personnes || "?"} pers
                  </p>
                  </Link>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <button
                      type="button"
                      disabled={favBusyId === recipe.id}
                      onClick={async () => {
                        setFavBusyId(recipe.id);
                        try {
                          if (isFav) {
                            await removeFavorite(recipe.id);
                          } else {
                            await addFavorite(recipe);
                          }
                          await refreshFavoritesAndCollections();
                        } catch (e) {
                          alert(e instanceof Error ? e.message : "Impossible de mettre à jour les favoris.");
                        } finally {
                          setFavBusyId(null);
                        }
                      }}
                      className={`flex-1 min-w-[7rem] px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                        isFav
                          ? "bg-[var(--beige-accent)] text-white border-[var(--beige-accent)]"
                          : "bg-white text-[var(--text-primary)] border-[var(--beige-border)] hover:border-[var(--beige-accent)]"
                      }`}
                    >
                      {isFav ? "Favori ✓" : "Favori"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectionModalRecipe(recipe)}
                      className="flex-1 min-w-[7rem] px-2 py-1.5 rounded-lg text-xs font-semibold border border-[var(--beige-border)] bg-white text-[var(--text-primary)] hover:border-[var(--beige-accent)]"
                    >
                      Collection
                    </button>
                  </div>
                </li>
              );
              })}
            </ul>
          )}
        </section>
      </div>

      {collectionModalRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--beige-border)] bg-white p-4 shadow-lg">
            <h2 className="text-sm font-bold text-[var(--text-primary)] mb-1">Ajouter à une collection</h2>
            <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">
              {collectionModalRecipe.nom_recette}
            </p>
            {collections.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] mb-3">
                Tu n’as pas encore de collection. Crée-en une depuis la page Favoris.
              </p>
            ) : (
              <ul className="max-h-48 overflow-y-auto space-y-1 mb-3">
                {collections.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 rounded-lg text-sm border border-[var(--beige-border)] hover:bg-[var(--background)]"
                      onClick={async () => {
                        try {
                          await addRecipeToCollection(c.id, collectionModalRecipe.id);
                          setCollectionModalRecipe(null);
                          await refreshFavoritesAndCollections();
                        } catch (e) {
                          alert(e instanceof Error ? e.message : "Erreur lors de l’ajout à la collection.");
                        }
                      }}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Link
                href="/favoris"
                className="flex-1 text-center py-2 rounded-lg text-xs font-semibold border border-[var(--beige-border)] text-[var(--text-primary)]"
              >
                Gérer les collections
              </Link>
              <button
                type="button"
                className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--beige-accent)] text-white"
                onClick={() => setCollectionModalRecipe(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

