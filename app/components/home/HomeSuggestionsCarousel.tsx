"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RecipeImage from "../RecipeImage";
import LoadingSpinner from "../LoadingSpinner";
import { plannerAuthHeaders } from "../../src/lib/plannerClient";
import type { Recipe } from "../../src/lib/recipes";
import {
  loadRecentHomeRecipeIds,
  rememberHomeRecipeIds,
} from "../../src/lib/recipeDiscoveryClient";
import { HOME_MOCK_RECIPES, recipeDisplayTag } from "./homeMockRecipes";
import { homeTheme } from "./homeTheme";

export function HomeSuggestionsCarousel() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const recent = loadRecentHomeRecipeIds();
        const params = new URLSearchParams({ limit: "8" });
        if (recent.length) params.set("exclude", recent.slice(0, 30).join(","));
        const auth = await plannerAuthHeaders();
        const res = await fetch(`/api/recipes/home?${params}`, {
          headers: { "Content-Type": "application/json", ...auth },
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        const sug = Array.isArray(json.suggestions) ? json.suggestions : [];
        const list = sug.length > 0 ? sug : HOME_MOCK_RECIPES;
        setRecipes(list);
        if (sug.length) rememberHomeRecipeIds(sug.map((r: Recipe) => r.id));
      } catch {
        if (!cancelled) setRecipes(HOME_MOCK_RECIPES);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-bold" style={{ color: homeTheme.text }}>
          Suggestions pour toi
        </h2>
        <Link
          href="/recettes"
          className="text-xs font-semibold"
          style={{ color: homeTheme.accent }}
        >
          Voir tout <span aria-hidden>›</span>
        </Link>
      </div>

      {loading ? (
        <LoadingSpinner message="Chargement…" />
      ) : (
        <ul className="scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory">
          {recipes.map((recipe) => {
            const tag = recipeDisplayTag(recipe);
            const minutes = recipe.temps_preparation_min ?? 30;
            const href = recipe.id >= 9000 ? "/recettes" : `/recette/${recipe.id}`;
            return (
              <li key={recipe.id} className="w-[8.75rem] shrink-0 snap-start">
                <Link
                  href={href}
                  className="block overflow-hidden rounded-2xl border bg-white transition active:scale-[0.98]"
                  style={{ borderColor: homeTheme.border, boxShadow: homeTheme.shadowSm }}
                >
                  <div className="relative h-[5.5rem] bg-[#FFF5F7]">
                    <RecipeImage
                      imageUrl={recipe.image_url || undefined}
                      alt={recipe.nom_recette || "Recette"}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold shadow-sm" style={{ color: homeTheme.text }}>
                      {minutes} min
                    </span>
                  </div>
                  <div className="space-y-2 p-2.5">
                    <h3 className="line-clamp-2 text-xs font-bold leading-snug" style={{ color: homeTheme.text }}>
                      {recipe.nom_recette || "Recette"}
                    </h3>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: homeTheme.accentSoft, color: homeTheme.accent }}
                    >
                      <span aria-hidden>{tag.icon}</span>
                      {tag.label}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
