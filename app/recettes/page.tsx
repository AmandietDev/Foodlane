"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import LoadingSpinner from "../components/LoadingSpinner";
import RecipeImage from "../components/RecipeImage";
import type { Recipe } from "../src/lib/recipes";
import { plannerAuthHeaders } from "../src/lib/plannerClient";
import {
  loadRecentHomeRecipeIds,
  rememberHomeRecipeIds,
  rotateScoredRecipes,
} from "../src/lib/recipeDiscoveryClient";
import { addFavorite, loadFavorites, removeFavorite } from "../src/lib/favorites";
import { addRecipeToCollection, loadCollections, type Collection } from "../src/lib/collections";

type RecipeWithPersonalization = Recipe & {
  personalization_score?: number;
  personalization_reason?: string;
};

type TypeFilter = "all" | "sweet" | "savory";

const PAGE_SIZE = 24;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

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

  // Personalized recipes (from /api/recipes/for-me, shown when no filter active)
  const [personalizedRecipes, setPersonalizedRecipes] = useState<RecipeWithPersonalization[]>([]);
  const [loadingPersonalized, setLoadingPersonalized] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server-side paginated search results (shown when filter active)
  const [searchResults, setSearchResults] = useState<RecipeWithPersonalization[]>([]);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

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

  const isFilterActive = ingredientTags.length > 0 || typeFilter !== "all";

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

  // Load personalized recipes on mount (no bulk all-recipes load)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function loadPersonalizedRecipes() {
      setLoadingPersonalized(true);
      setError(null);
      try {
        const auth = await plannerAuthHeaders();
        const res = await fetch("/api/recipes/for-me", {
          headers: { "Content-Type": "application/json", ...auth },
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && Array.isArray(json.recipes) && json.recipes.length > 0) {
          setPersonalizedRecipes(json.recipes as RecipeWithPersonalization[]);
        } else if (res.status !== 403) {
          setError(
            typeof json.error === "string"
              ? json.error
              : "Impossible de charger les recettes."
          );
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur de chargement.");
      } finally {
        if (!cancelled) setLoadingPersonalized(false);
      }
    }

    loadPersonalizedRecipes();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Paginated server-side search — called on filter changes or "Voir plus"
  const fetchSearchPage = useCallback(
    async (page: number, tags: string[], type: TypeFilter, append: boolean) => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      const ctrl = new AbortController();
      searchAbortRef.current = ctrl;

      setLoadingSearch(true);
      try {
        const urlParams = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
        if (type !== "all") urlParams.set("type", type);
        if (tags.length > 0) urlParams.set("query", tags.join(","));

        const res = await fetch(`/api/recipes?${urlParams}`, { signal: ctrl.signal });
        if (!res.ok) return;
        const json = await res.json();
        const incoming = (json.recipes || []) as RecipeWithPersonalization[];
        setSearchResults((prev) => (append ? [...prev, ...incoming] : incoming));
        setSearchHasMore(!!json.hasMore);
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.error("[RecettesPage] search error:", e);
      } finally {
        setLoadingSearch(false);
      }
    },
    []
  );

  // Reset + re-search when filters change
  useEffect(() => {
    if (!user) return;
    if (!isFilterActive) {
      setSearchResults([]);
      setSearchPage(1);
      setSearchHasMore(false);
      return;
    }
    setSearchPage(1);
    void fetchSearchPage(1, ingredientTags, typeFilter, false);
  }, [user, ingredientTags, typeFilter, isFilterActive, fetchSearchPage]);

  function loadMoreSearchResults() {
    const next = searchPage + 1;
    setSearchPage(next);
    void fetchSearchPage(next, ingredientTags, typeFilter, true);
  }

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

  // Sort search results: personalized recipes bubble to the top
  const personalizedIds = useMemo(
    () => new Set(personalizedRecipes.map((r) => r.id)),
    [personalizedRecipes]
  );

  const displayedRecipes = useMemo(() => {
    if (isFilterActive) {
      if (personalizedIds.size === 0) return searchResults;
      return [...searchResults].sort((a, b) => {
        const aP = personalizedIds.has(a.id) ? 0 : 1;
        const bP = personalizedIds.has(b.id) ? 0 : 1;
        return aP - bP;
      });
    }
    const recent = loadRecentHomeRecipeIds();
    return rotateScoredRecipes(personalizedRecipes, 24, recent);
  }, [isFilterActive, personalizedRecipes, searchResults, personalizedIds]);

  useEffect(() => {
    if (!isFilterActive && displayedRecipes.length > 0) {
      rememberHomeRecipeIds(displayedRecipes.map((r) => r.id));
    }
  }, [displayedRecipes, isFilterActive]);

  // Full-page spinner only for the initial personalized load (when no filter active)
  if (sessionLoading || !user || (!isFilterActive && loadingPersonalized)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner message="Chargement des recettes&hellip;" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 pt-6 pb-24">
      <div className="max-w-3xl mx-auto space-y-4">
        <Link href="/tableau" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          &larr; Retour
        </Link>

        <section className="rounded-2xl border border-[var(--beige-border)] bg-white p-4">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Parcourir les recettes</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Exploration personnalisée selon ton profil (régimes, allergies, équipements), avec filtres sucré/salé
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
              Ajoute un ingrédient à la fois : tape son nom puis <strong>Entrée</strong> ou clique sur{" "}
              <strong>Ajouter</strong>. Les recettes se filtrent dès qu&apos;un tag est présent ; avec plusieurs
              tags, tous doivent apparaître dans la recette.
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
                    className="h-6 w-6 rounded-full text-[var(--text-secondary)] hover:bg-[#E94E77]/15 hover:text-[#6B2E2E] flex items-center justify-center text-base leading-none"
                    aria-label={`Retirer ${tag}`}
                  >
                    &times;
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
                  placeholder="Ex. oeufs, tomate, poulet..."
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
          {isFilterActive ? (
            <p className="text-sm text-[var(--text-secondary)]">
              {loadingSearch && searchResults.length === 0
                ? "Recherche en cours…"
                : `${displayedRecipes.length} recette${displayedRecipes.length > 1 ? "s" : ""} trouvée${displayedRecipes.length > 1 ? "s" : ""}${searchHasMore ? " (et plus)" : ""}.`}
            </p>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              {displayedRecipes.length} recette{displayedRecipes.length > 1 ? "s" : ""} suggérée{displayedRecipes.length > 1 ? "s" : ""} pour toi.
            </p>
          )}

          {isFilterActive && loadingSearch && searchResults.length === 0 ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner message="Recherche en cours…" />
            </div>
          ) : displayedRecipes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[var(--beige-border)] p-5 text-sm text-[var(--text-secondary)]">
              {isFilterActive
                ? "Aucune recette ne correspond à ces critères. Essaie sans filtre ou avec moins d’aliments saisis."
                : "Aucune recommandation disponible. Utilise les filtres pour explorer toutes les recettes."}
            </div>
          ) : (
            <>
              <ul className="grid gap-3 sm:grid-cols-2">
                {displayedRecipes.map((recipe) => {
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
                          {recipe.type || "Type non renseigné"} &bull; {recipe.temps_preparation_min || "?"} min &bull;{" "}
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

              {isFilterActive && searchHasMore && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={loadMoreSearchResults}
                    disabled={loadingSearch}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold border border-[var(--beige-border)] bg-white text-[var(--text-primary)] hover:border-[var(--beige-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loadingSearch ? "Chargement…" : "Voir plus"}
                  </button>
                </div>
              )}
            </>
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
                Tu n&apos;as pas encore de collection. Crée-en une depuis la page Favoris.
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
