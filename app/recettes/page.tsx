"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import LoadingSpinner from "../components/LoadingSpinner";
import RecipeImage from "../components/RecipeImage";
import { HomeAssistantCard } from "../components/home/HomeAssistantCard";
import { appLayoutTheme } from "../components/app/appLayoutTheme";
import type { Recipe } from "../src/lib/recipes";
import { plannerAuthHeaders } from "../src/lib/plannerClient";
import {
  loadRecentHomeRecipeIds,
  rememberHomeRecipeIds,
  pickDisplayRecipes,
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
    .replace(/[\u0300-\u036f]/g, "")
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

function TypeFilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
        active
          ? "bg-[#E94E77] text-white shadow-[0_4px_12px_rgba(233,78,119,0.3)]"
          : "border border-[#F5DDE5] bg-[#FFF8FA] text-[#4A2C2A]"
      }`}
    >
      {label}
    </button>
  );
}

export default function RecettesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: sessionLoading } = useSupabaseSession();

  const [personalizedRecipes, setPersonalizedRecipes] = useState<RecipeWithPersonalization[]>([]);
  const [loadingPersonalized, setLoadingPersonalized] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            typeof json.error === "string" ? json.error : "Impossible de charger les recettes."
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
    return pickDisplayRecipes(personalizedRecipes, 24, recent);
  }, [isFilterActive, personalizedRecipes, searchResults, personalizedIds]);

  useEffect(() => {
    if (!isFilterActive && displayedRecipes.length > 0) {
      rememberHomeRecipeIds(displayedRecipes.map((r) => r.id));
    }
  }, [displayedRecipes, isFilterActive]);

  if (sessionLoading || !user || (!isFilterActive && loadingPersonalized)) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: appLayoutTheme.pageBg }}
      >
        <LoadingSpinner message="Chargement des recettes…" />
      </div>
    );
  }

  return (
    <main className="min-h-screen px-4 pt-5 pb-2" style={{ backgroundColor: appLayoutTheme.pageBg }}>
      <div className="mx-auto max-w-md space-y-4">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#4A2C2A]">Parcourir les recettes</h1>
            <p className="mt-1 text-sm leading-relaxed text-[#8A6F6F]">
              Exploration personnalisée selon ton profil, avec filtres sucré/salé et ingrédients.
            </p>
          </div>
          <Link
            href="/favoris"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#F5DDE5] bg-[#FFF0F3] text-[#E94E77]"
            aria-label="Mes favoris"
          >
            ♥
          </Link>
        </header>

        <section
          className="overflow-hidden rounded-[1.75rem] p-4"
          style={{
            background: "linear-gradient(135deg, #FFF0F3 0%, #FFE8EE 100%)",
            border: `1px solid ${appLayoutTheme.cardPinkBorder}`,
            boxShadow: appLayoutTheme.shadow,
          }}
        >
          <p className="text-sm font-bold text-[#4A2C2A]">🔍 Filtrer par ingrédients</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#8A6F6F]">
            Ajoute un ingrédient puis Entrée. Avec plusieurs tags, <strong>tous</strong> doivent être
            présents (ex. « oeuf » ne remonte pas le bœuf).
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {ingredientTags.map((tag, index) => (
              <span
                key={`${normalize(tag)}-${index}`}
                className="inline-flex items-center gap-1 rounded-full border border-[#F5DDE5] bg-[#FFF8FA] py-1 pl-2.5 pr-1 text-sm text-[#4A2C2A]"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeIngredientTag(index)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[#8A6F6F] hover:bg-[#E94E77]/10 hover:text-[#E94E77]"
                  aria-label={`Retirer ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
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
              placeholder="Ex. oeufs, tomate, poulet…"
              className="min-w-0 flex-1 rounded-full border border-[#F5DDE5] bg-[#FFF8FA] px-4 py-2.5 text-sm text-[#4A2C2A] outline-none focus:border-[#E94E77]"
            />
            <button
              type="button"
              onClick={addIngredientFromDraft}
              disabled={!ingredientDraft.trim()}
              className="shrink-0 rounded-full bg-[#E94E77] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              + Ajouter
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TypeFilterButton active={typeFilter === "all"} label="Les deux" onClick={() => setTypeFilter("all")} />
            <TypeFilterButton active={typeFilter === "sweet"} label="Sucré" onClick={() => setTypeFilter("sweet")} />
            <TypeFilterButton active={typeFilter === "savory"} label="Salé" onClick={() => setTypeFilter("savory")} />
            <button
              type="button"
              onClick={() => {
                setIngredientTags([]);
                setIngredientDraft("");
                setTypeFilter("all");
              }}
              className="ml-auto rounded-full border border-[#F5DDE5] bg-[#FFF8FA] px-3 py-2 text-xs font-medium text-[#8A6F6F]"
            >
              ↺ Réinitialiser
            </button>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[#4A2C2A]">✨ Recettes suggérées pour toi</h2>
            <Link href="/favoris" className="text-xs font-semibold text-[#E94E77]">
              Voir tout ›
            </Link>
          </div>

          {isFilterActive ? (
            <p className="text-sm text-[#8A6F6F]">
              {loadingSearch && searchResults.length === 0
                ? "Recherche en cours…"
                : `${displayedRecipes.length} recette${displayedRecipes.length > 1 ? "s" : ""} trouvée${displayedRecipes.length > 1 ? "s" : ""}${searchHasMore ? " (et plus)" : ""}.`}
            </p>
          ) : (
            <p className="text-sm text-[#8A6F6F]">
              {displayedRecipes.length} suggestion{displayedRecipes.length > 1 ? "s" : ""} selon tes goûts.
            </p>
          )}

          {isFilterActive && loadingSearch && searchResults.length === 0 ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner message="Recherche en cours…" />
            </div>
          ) : displayedRecipes.length === 0 ? (
            <div
              className="rounded-2xl border border-dashed p-5 text-sm text-[#8A6F6F]"
              style={{ borderColor: appLayoutTheme.cardPinkBorder, backgroundColor: appLayoutTheme.cardPink }}
            >
              {isFilterActive
                ? "Aucune recette ne correspond à ces critères. Essaie avec moins d'ingrédients."
                : "Aucune recommandation disponible. Utilise les filtres pour explorer."}
            </div>
          ) : (
            <>
              <ul className="-mx-1 flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory">
                {displayedRecipes.map((recipe) => {
                  const isFav = favoriteIds.has(recipe.id);
                  return (
                    <li
                      key={recipe.id}
                      className="w-[11.5rem] shrink-0 snap-start overflow-hidden rounded-[1.25rem] border border-[#F5DDE5] bg-[#FFF0F3] shadow-sm"
                    >
                      <Link href={`/recette/${recipe.id}`} className="block">
                        <div className="relative h-28 overflow-hidden bg-[#FFE8EE]">
                          <RecipeImage
                            imageUrl={recipe.image_url || undefined}
                            alt={recipe.nom_recette || "Recette"}
                            className="h-full w-full"
                          />
                          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#4A2C2A]">
                            {recipe.temps_preparation_min || "?"} min
                          </span>
                          <button
                            type="button"
                            disabled={favBusyId === recipe.id}
                            onClick={async (e) => {
                              e.preventDefault();
                              setFavBusyId(recipe.id);
                              try {
                                if (isFav) await removeFavorite(recipe.id);
                                else await addFavorite(recipe);
                                await refreshFavoritesAndCollections();
                              } catch (err) {
                                alert(err instanceof Error ? err.message : "Erreur favoris.");
                              } finally {
                                setFavBusyId(null);
                              }
                            }}
                            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-sm"
                            aria-label={isFav ? "Retirer des favoris" : "Ajouter aux favoris"}
                          >
                            {isFav ? "❤️" : "🤍"}
                          </button>
                        </div>
                        <div className="p-2.5">
                          <h3 className="line-clamp-2 text-xs font-bold leading-snug text-[#4A2C2A]">
                            {recipe.nom_recette || "Recette"}
                          </h3>
                          <p className="mt-1 text-[10px] text-[#8A6F6F]">
                            {recipe.type?.includes("sucr") ? "Sucré" : recipe.type?.includes("sal") ? "Salé" : "Recette"}
                          </p>
                        </div>
                      </Link>
                      <div className="flex gap-1 px-2.5 pb-2.5">
                        <button
                          type="button"
                          onClick={() => setCollectionModalRecipe(recipe)}
                          className="flex-1 rounded-full border border-[#F5DDE5] bg-[#FFF8FA] py-1 text-[10px] font-semibold text-[#4A2C2A]"
                        >
                          Collection
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {isFilterActive && searchHasMore && (
                <div className="flex justify-center pt-1">
                  <button
                    type="button"
                    onClick={loadMoreSearchResults}
                    disabled={loadingSearch}
                    className="rounded-full border border-[#F5DDE5] bg-[#FFF0F3] px-6 py-2.5 text-sm font-semibold text-[#4A2C2A] disabled:opacity-50"
                  >
                    {loadingSearch ? "Chargement…" : "Voir plus"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <HomeAssistantCard />
      </div>

      {collectionModalRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-sm rounded-2xl border p-4 shadow-lg"
            style={{ backgroundColor: appLayoutTheme.cardPink, borderColor: appLayoutTheme.cardPinkBorder }}
          >
            <h2 className="mb-1 text-sm font-bold text-[#4A2C2A]">Ajouter à une collection</h2>
            <p className="mb-3 line-clamp-2 text-xs text-[#8A6F6F]">{collectionModalRecipe.nom_recette}</p>
            {collections.length === 0 ? (
              <p className="mb-3 text-sm text-[#8A6F6F]">
                Tu n&apos;as pas encore de collection. Crée-en une depuis Favoris.
              </p>
            ) : (
              <ul className="mb-3 max-h-48 space-y-1 overflow-y-auto">
                {collections.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full rounded-xl border border-[#F5DDE5] bg-[#FFF8FA] px-3 py-2 text-left text-sm text-[#4A2C2A]"
                      onClick={async () => {
                        try {
                          await addRecipeToCollection(c.id, collectionModalRecipe.id);
                          setCollectionModalRecipe(null);
                          await refreshFavoritesAndCollections();
                        } catch (e) {
                          alert(e instanceof Error ? e.message : "Erreur collection.");
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
                className="flex-1 rounded-xl border border-[#F5DDE5] py-2 text-center text-xs font-semibold text-[#4A2C2A]"
              >
                Gérer
              </Link>
              <button
                type="button"
                className="flex-1 rounded-xl bg-[#E94E77] py-2 text-xs font-semibold text-white"
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
