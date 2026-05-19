"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSupabaseSession } from "../../hooks/useSupabaseSession";
import LoadingSpinner from "../../components/LoadingSpinner";
import RecipeImage from "../../components/RecipeImage";
import type { Recipe } from "../../src/lib/recipes";
import { detectDietaryBadges } from "../../src/lib/dietaryProfiles";
import {
  formatScaledIngredient,
  getScalingFactor,
  parseIngredientLine,
  scaleIngredientQuantity,
} from "../../src/lib/ingredientQuantities";

export default function RecetteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id as string;
  const id = Number(rawId);
  const { user, loading: sessionLoading } = useSupabaseSession();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portions, setPortions] = useState(2);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setError("Recette introuvable.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/recipes/${id}`);
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof j.error === "string" ? j.error : "Impossible de charger la recette.");
        }
        const r = j.recipe as Recipe | undefined;
        if (!cancelled) {
          if (r) {
            setRecipe(r);
            setPortions(Math.max(1, r.nombre_personnes || 1));
          } else setError("Recette introuvable.");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur de chargement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (sessionLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8F6]">
        <LoadingSpinner message="Chargement…" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8F6]">
        <LoadingSpinner message="Chargement de la recette…" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <main className="min-h-screen bg-[#FFF8F6] px-4 py-8 pb-28">
        <div className="max-w-lg mx-auto space-y-4">
          <p className="text-red-700">{error || "Recette introuvable."}</p>
          <Link href="/recettes" className="text-sm font-semibold text-[#D44A4A] underline">
            ← Retour aux recettes
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF8F6] px-4 py-6 pb-28 md:pb-10">
      <div className="max-w-lg md:max-w-2xl mx-auto space-y-4">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/recettes" className="text-[#8A4A4A] hover:text-[#6B2E2E]">
            ← Recettes
          </Link>
          <Link href="/planifier" className="text-[#8A4A4A] hover:text-[#6B2E2E]">
            Planifier
          </Link>
        </div>

        <article className="rounded-2xl border border-[#E8A0A0] bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#F0E4E4]">
            <h1 className="text-xl font-bold text-[#4a2c2c]">{recipe.nom_recette}</h1>
            <p className="text-xs text-[#7a5a5a] mt-1">
              {recipe.temps_preparation_min != null ? `${recipe.temps_preparation_min} min · ` : null}
              {recipe.nombre_personnes || 1} pers. (recette de base)
            </p>
          </div>
          {recipe.image_url ? (
            <div className="h-56 w-full md:h-64">
              <RecipeImage
                imageUrl={recipe.image_url}
                alt={recipe.nom_recette || "Recette"}
                className="w-full h-full object-cover"
              />
            </div>
          ) : null}
          <div className="p-4 space-y-4">
            {recipe.description_courte ? (
              <p className="text-sm text-[#6B2E2E]">{recipe.description_courte}</p>
            ) : null}
            {detectDietaryBadges(recipe).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {detectDietaryBadges(recipe).map((badge) => (
                  <span
                    key={badge}
                    className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FDE8E8] text-[#8A3A3A] border border-[#F2CACA]"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <h2 className="font-semibold text-[#6B2E2E]">Ingrédients</h2>
                <div className="flex items-center gap-1 bg-[#FDF4F0] border border-[#F2CACA] rounded-lg px-1.5 py-1 text-sm">
                  <button
                    type="button"
                    className="w-7 h-7 rounded-md font-bold text-[#6B2E2E] hover:bg-white disabled:opacity-30"
                    onClick={() => setPortions((p) => Math.max(1, p - 1))}
                    disabled={portions <= 1}
                    aria-label="Moins de portions"
                  >
                    −
                  </button>
                  <span className="min-w-[72px] text-center font-semibold text-[#6B2E2E]">{portions} pers.</span>
                  <button
                    type="button"
                    className="w-7 h-7 rounded-md font-bold text-[#6B2E2E] hover:bg-white disabled:opacity-30"
                    onClick={() => setPortions((p) => Math.min(50, p + 1))}
                    disabled={portions >= 50}
                    aria-label="Plus de portions"
                  >
                    +
                  </button>
                </div>
              </div>
              <ul className="space-y-1.5 text-sm text-[#6B2E2E]">
                {(recipe.ingredients ?? "")
                  .split(";")
                  .map((x) => x.trim())
                  .filter(Boolean)
                  .map((line, idx) => {
                    const scaled = scaleIngredientQuantity(
                      parseIngredientLine(line),
                      getScalingFactor(recipe, portions)
                    );
                    return (
                      <li key={`${idx}-${line.slice(0, 24)}`}>• {formatScaledIngredient(scaled)}</li>
                    );
                  })}
              </ul>
            </div>

            <div>
              <h2 className="font-semibold text-[#6B2E2E] mb-2">Étapes</h2>
              <ol className="space-y-2 text-sm text-[#6B2E2E]">
                {(recipe.instructions ?? "")
                  .split(";")
                  .map((x) => x.trim())
                  .filter(Boolean)
                  .map((step, idx) => (
                    <li key={`step-${idx}`}>
                      {idx + 1}. {step}
                    </li>
                  ))}
              </ol>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
