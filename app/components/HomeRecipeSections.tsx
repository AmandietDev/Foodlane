"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RecipeImage from "./RecipeImage";
import LoadingSpinner from "./LoadingSpinner";
import { plannerAuthHeaders } from "../src/lib/plannerClient";
import type { Recipe } from "../src/lib/recipes";
import {
  loadRecentHomeRecipeIds,
  rememberHomeRecipeIds,
} from "../src/lib/recipeDiscoveryClient";

type Props = {
  suggestionsTitle?: string;
  seasonalTitle?: string;
};

function RecipeStrip({
  title,
  subtitle,
  recipes,
  loading,
}: {
  title: string;
  subtitle?: string;
  recipes: Recipe[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#4a2c2c]">{title}</h2>
        <LoadingSpinner message="Chargement des recettes…" />
      </section>
    );
  }
  if (recipes.length === 0) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-[#4a2c2c]">{title}</h2>
        {subtitle ? <p className="text-xs text-[#7a5a5a] mt-0.5">{subtitle}</p> : null}
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
        {recipes.map((recipe) => (
          <li key={recipe.id} className="min-w-[9.5rem] max-w-[9.5rem] snap-start shrink-0">
            <Link
              href={`/recette/${recipe.id}`}
              className="block rounded-xl border border-[var(--beige-border)] bg-white overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="h-28 bg-[#f8f2f2]">
                <RecipeImage
                  imageUrl={recipe.image_url || undefined}
                  alt={recipe.nom_recette || "Recette"}
                  className="w-full h-full"
                />
              </div>
              <div className="p-2.5">
                <h3 className="text-xs font-semibold text-[#4a2c2c] line-clamp-2 leading-snug">
                  {recipe.nom_recette || "Recette"}
                </h3>
                <p className="text-[10px] text-[#9a7a7a] mt-1">
                  {recipe.temps_preparation_min || "?"} min
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function HomeRecipeSections({
  suggestionsTitle = "Suggestions pour toi",
  seasonalTitle = "Recettes du moment",
}: Props) {
  const [suggestions, setSuggestions] = useState<Recipe[]>([]);
  const [seasonal, setSeasonal] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const recent = loadRecentHomeRecipeIds();
        const params = new URLSearchParams({ limit: "6" });
        if (recent.length) params.set("exclude", recent.slice(0, 30).join(","));
        const auth = await plannerAuthHeaders();
        const res = await fetch(`/api/recipes/home?${params}`, {
          headers: { "Content-Type": "application/json", ...auth },
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled || !res.ok) return;
        const sug = Array.isArray(json.suggestions) ? json.suggestions : [];
        const sea = Array.isArray(json.seasonal) ? json.seasonal : [];
        setSuggestions(sug);
        setSeasonal(sea);
        rememberHomeRecipeIds([...sug, ...sea].map((r: Recipe) => r.id));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <RecipeStrip
        title={suggestionsTitle}
        subtitle="Nouvelles idées à chaque visite, selon ton profil."
        recipes={suggestions}
        loading={loading}
      />
      <RecipeStrip
        title={seasonalTitle}
        subtitle="De saison et populaires dans la communauté."
        recipes={seasonal}
        loading={loading}
      />
    </div>
  );
}
