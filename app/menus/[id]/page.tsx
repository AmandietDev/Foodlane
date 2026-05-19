"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useSupabaseSession } from "../../hooks/useSupabaseSession";
import { plannerFetch } from "../../src/lib/plannerClient";
import GroceryExportBar from "../../components/GroceryExportBar";
import LoadingSpinner from "../../components/LoadingSpinner";
import RecipeImage from "../../components/RecipeImage";
import {
  formatGroceryStoreLine,
  groceryCategoryLabel,
  mapLegacyGroceryCategory,
  sanitizeGroceryIngredientName,
  sortCategoriesForDisplay,
} from "../../src/lib/groceryFormat";
import { getEffectiveRecipePortions, inferGroceryCategory } from "../../src/lib/weeklyPlanner";
import { getLocale } from "../../src/lib/i18n";
import { sortMealsByDisplayOrder } from "../../src/lib/mealOrder";
import type { Recipe } from "../../src/lib/recipes";
import {
  formatScaledIngredient,
  getScalingFactor,
  parseIngredientLine,
  scaleIngredientQuantity,
} from "../../src/lib/ingredientQuantities";
import { detectDietaryBadges } from "../../src/lib/dietaryProfiles";

type MealRow = {
  id: string;
  meal_type: string;
  recipe_name: string;
  recipe_payload: Recipe;
};

type DayRow = {
  id: string;
  day_index: number;
  day_date: string;
  meals: MealRow[];
};

type GroceryItem = {
  id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  checked: boolean;
};

const MEAL_LABEL: Record<string, string> = {
  breakfast: "Petit-déj.",
  lunch: "Déjeuner",
  dinner: "Dîner",
  snack: "Collation",
};

export default function MenuDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { user, loading: sessionLoading } = useSupabaseSession();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [days, setDays] = useState<DayRow[]>([]);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [savedInCarnet, setSavedInCarnet] = useState(false);
  const [householdSize, setHouseholdSize] = useState(2);
  const [savingCarnet, setSavingCarnet] = useState(false);
  const [dislikedIds, setDislikedIds] = useState<Set<number>>(new Set());
  const [dislikingId, setDislikingId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Sélecteur "Pour combien de personnes ?" sur la fiche recette ouverte.
  const [previewPortions, setPreviewPortions] = useState<number>(2);
  // À chaque nouvelle recette ouverte, on remet le sélecteur de portions
  // sur la taille de foyer par défaut.
  useEffect(() => {
    if (selectedRecipe) {
      setPreviewPortions(Math.max(1, householdSize || 1));
    }
  }, [selectedRecipe, householdSize]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const res = await plannerFetch(`/menus/${id}`);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error || "Erreur");
      setLoading(false);
      return;
    }
    setTitle(j.menu?.title || "Menu");
    setSavedInCarnet(Boolean(j.menu?.saved_in_carnet));
    const pref = j.menu?.generation_context?.preferences as
      | { household_size?: number; recipe_scaling_portions?: number | null }
      | undefined;
    setHouseholdSize(
      getEffectiveRecipePortions({
        household_size: Number(pref?.household_size) || 2,
        recipe_scaling_portions:
          pref?.recipe_scaling_portions === undefined ? null : pref.recipe_scaling_portions,
      })
    );
    setDays(Array.isArray(j.days) ? j.days : []);
    setGroceryItems(Array.isArray(j.grocery_items) ? j.grocery_items : []);
    setLoading(false);
  }, [id]);

  /** Impression / PDF paysage : uniquement le planning (pas la liste de courses). */
  const printMenuLandscape = useCallback(() => {
    const sid = "menu-landscape-print-style";
    let el = document.getElementById(sid) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = sid;
      el.textContent = `
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          html.menu-print-landscape body * {
            visibility: hidden !important;
          }
          html.menu-print-landscape #menu-print-root,
          html.menu-print-landscape #menu-print-root * {
            visibility: visible !important;
          }
          html.menu-print-landscape #menu-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
        }
      `;
      document.head.appendChild(el);
    }
    document.documentElement.classList.add("menu-print-landscape");
    const cleanup = () => {
      document.documentElement.classList.remove("menu-print-landscape");
      el?.remove();
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(cleanup, 120_000);
    requestAnimationFrame(() => window.print());
  }, []);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  useEffect(() => {
    if (user && id) load();
  }, [user, id, load]);

  const visibleGroceryItems = useMemo(
    () => groceryItems.filter((it) => sanitizeGroceryIngredientName(it.ingredient_name).trim()),
    [groceryItems]
  );

  async function toggleItem(item: GroceryItem) {
    const res = await plannerFetch(`/grocery-items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ checked: !item.checked }),
    });
    if (res.ok) {
      setGroceryItems((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, checked: !item.checked } : x))
      );
    }
  }

  async function removeItem(item: GroceryItem) {
    const res = await plannerFetch(`/grocery-items/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ remove: true }),
    });
    if (res.ok) {
      setGroceryItems((prev) => prev.filter((x) => x.id !== item.id));
    }
  }

  async function dislikeRecipe(recipeId: number, recipeName: string) {
    if (dislikingId === recipeId) return;
    setDislikingId(recipeId);
    const already = dislikedIds.has(recipeId);
    const method = already ? "DELETE" : "POST";
    const res = await plannerFetch("/disliked-recipes", {
      method,
      body: JSON.stringify({ recipe_id: recipeId, recipe_name: recipeName }),
    });
    if (res.ok) {
      setDislikedIds((prev) => {
        const next = new Set(prev);
        if (already) next.delete(recipeId);
        else next.add(recipeId);
        return next;
      });
    }
    setDislikingId(null);
  }

  async function saveInCarnet() {
    if (savingCarnet) return;
    setSaveError(null);
    setSavingCarnet(true);
    try {
      const res = await plannerFetch(`/menus/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ saved_in_carnet: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setSavedInCarnet(true);
      } else {
        setSaveError(
          typeof j.error === "string" && j.error.trim()
            ? j.error
            : "Enregistrement impossible. Réessaie dans un instant."
        );
      }
    } catch {
      setSaveError(
        "Connexion interrompue. Vérifie que le serveur de développement tourne et réessaie."
      );
    } finally {
      setSavingCarnet(false);
    }
  }

  if (sessionLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8F6]">
        <LoadingSpinner />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8F6]">
        <LoadingSpinner message="Chargement du menu…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FFF8F6] p-6">
        <p className="text-red-700">{error}</p>
        <Link href="/tableau" className="text-sm underline mt-4 inline-block">
          Retour
        </Link>
      </div>
    );
  }

  const grouped = new Map<string, GroceryItem[]>();
  for (const it of visibleGroceryItems) {
    const slug = mapLegacyGroceryCategory(inferGroceryCategory(it.ingredient_name));
    if (!grouped.has(slug)) grouped.set(slug, []);
    grouped.get(slug)!.push(it);
  }
  const sortedCategorySlugs = sortCategoriesForDisplay([...grouped.keys()]);

  return (
    <div className="min-h-screen bg-[#FFF8F6] pb-28 pt-4 px-4 print:bg-white md:pt-8 md:px-8">
      <div className="max-w-lg md:max-w-3xl lg:max-w-4xl mx-auto space-y-6 md:space-y-8">
        <div className="print:hidden">
          <Link href="/tableau" className="text-sm text-[#8A4A4A]">
            ← Tableau de bord
          </Link>
        </div>

        <div id="menu-print-root" className="space-y-4">
          <h1 className="text-xl font-bold text-[#4a2c2c] print:text-2xl">{title}</h1>
          <div className="print:hidden flex flex-col gap-2">
            <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              disabled={savedInCarnet || savingCarnet}
              onClick={saveInCarnet}
              className="rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              {savedInCarnet ? "Menu enregistré dans Mon carnet" : savingCarnet ? "Enregistrement..." : "Enregistrer mon menu"}
            </button>
            <button
              type="button"
              onClick={printMenuLandscape}
              className="rounded-xl border border-[#6B2E2E] text-[#6B2E2E] bg-white text-sm font-semibold px-4 py-2 hover:bg-[#FFF0F0] transition-colors"
            >
              Imprimer le menu
            </button>
            <button
              type="button"
              onClick={printMenuLandscape}
              title="Dans la fenêtre d'impression, choisis « Enregistrer au format PDF » comme destination."
              className="rounded-xl border border-[#6B2E2E] text-[#6B2E2E] bg-white text-sm font-semibold px-4 py-2 hover:bg-[#FFF0F0] transition-colors"
            >
              PDF paysage
            </button>
            </div>
            {saveError ? (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {saveError}
              </p>
            ) : null}
          </div>

          <section>
            <h2 className="text-lg font-semibold text-[#4a2c2c] mb-1 print:text-xl">Planning</h2>
            <p className="text-xs text-[#8a6a6a] mb-3 print:hidden">
              Touche ou clique sur un plat pour ouvrir la fiche recette (ingrédients ajustés au foyer, étapes).
            </p>
          <div className="space-y-4">
            {days.map((d) => (
              <div key={d.id} className="rounded-2xl border border-[#E8A0A0] bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-[#6B2E2E] mb-2">
                  Jour {d.day_index + 1} — {d.day_date}
                </div>
                <ul className="space-y-3">
                  {sortMealsByDisplayOrder(d.meals).map((m) => {
                    const r = m.recipe_payload;
                    const recipeTitle =
                      (m.recipe_name && m.recipe_name.trim()) ||
                      (r?.nom_recette && r.nom_recette.trim()) ||
                      "Recette à découvrir";
                    return (
                      <li
                        key={m.id}
                        className="flex gap-3 items-start border-t border-[#f5e8e8] pt-3 first:border-0 first:pt-0 cursor-pointer hover:bg-[#FFF8F8] rounded-lg px-1"
                        onClick={() => setSelectedRecipe(r)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedRecipe(r);
                          }
                        }}
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-[#f5e8e8]">
                          {r?.image_url ? (
                            <RecipeImage
                              imageUrl={r.image_url}
                              alt={recipeTitle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#FFE5E5] to-[#FFD2D2] flex flex-col items-center justify-center gap-1 text-[#9C4A4A] font-bold p-1">
                              <span>{recipeTitle.charAt(0).toUpperCase()}</span>
                              <span className="text-[10px] leading-none rounded bg-white/80 px-1.5 py-0.5 text-[#6B2E2E] border border-[#E8A0A0]">
                                Image indisponible
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-[#9a7a7a]">
                            {MEAL_LABEL[m.meal_type] || m.meal_type}
                          </div>
                          <div className="font-medium text-[#4a2c2c]">{recipeTitle}</div>
                          {r?.temps_preparation_min != null && (
                            <div className="text-xs text-[#7a5a5a]">{r.temps_preparation_min} min</div>
                          )}
                          {detectDietaryBadges(r || ({} as Recipe)).length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {detectDietaryBadges(r).slice(0, 4).map((badge) => (
                                <span
                                  key={`${r.id}-${badge}`}
                                  className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDE8E8] text-[#8A3A3A] border border-[#F2CACA]"
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); dislikeRecipe(r.id, m.recipe_name); }}
                            disabled={dislikingId === r.id}
                            title={dislikedIds.has(r.id) ? "Retirer des recettes exclues" : "Ne plus proposer cette recette"}
                            className={`print:hidden mt-1 text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                              dislikedIds.has(r.id)
                                ? "bg-[#6B2E2E] text-white border-[#6B2E2E]"
                                : "text-[#9a7a7a] border-[#E8D5D5] hover:border-[#D44A4A] hover:text-[#D44A4A]"
                            }`}
                          >
                            {dislikedIds.has(r.id) ? "✓ Recette exclue" : "👎 Ne plus proposer"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-[#4a2c2c] mb-1 print:mb-3">Liste de courses</h2>
          <p className="hidden print:block text-sm text-[#4a2c2c] font-medium mb-2">{title}</p>
          <p className="text-xs text-[#7a5a5a] mb-3 print:hidden">
            Coche ce que tu as déjà ; supprime ce dont tu n’as pas besoin.
          </p>
          <GroceryExportBar menuTitle={title} items={visibleGroceryItems} locale={getLocale()} />
          {visibleGroceryItems.length === 0 ? (
            <p className="text-sm text-[#7a5a5a]">Aucun ingrédient agrégé.</p>
          ) : (
            <div className="space-y-4">
              {sortedCategorySlugs.map((cat) => {
                const items = (grouped.get(cat) || []).slice().sort((a, b) =>
                  a.ingredient_name.localeCompare(b.ingredient_name, "fr")
                );
                if (!items.length) return null;
                return (
                  <div key={cat}>
                    <h3 className="text-sm font-semibold text-[#6B2E2E] mb-2">
                      {groceryCategoryLabel(cat, getLocale())}
                    </h3>
                    <ul className="rounded-xl border border-[#E8D5D5] bg-white divide-y divide-[#f0e4e4] print:border-gray-300 print:divide-gray-200">
                      {items.map((it) => (
                        <li
                          key={it.id}
                          className="flex items-center gap-3 px-3 py-2 text-sm print:py-1.5"
                        >
                          <button
                            type="button"
                            aria-label="Cocher"
                            onClick={() => toggleItem(it)}
                            className={`print:hidden w-6 h-6 rounded border shrink-0 ${
                              it.checked ? "bg-[#6B2E2E] border-[#6B2E2E]" : "border-[#ccc]"
                            }`}
                          />
                          <span className="hidden print:inline text-[#666] mr-1">{it.checked ? "☑" : "☐"}</span>
                          <span
                            className={`flex-1 ${
                              it.checked ? "line-through text-[#aaa]" : "text-[#4a2c2c]"
                            } print:text-black`}
                          >
                            {formatGroceryStoreLine(
                              it.ingredient_name,
                              it.quantity,
                              it.unit,
                              getLocale(),
                              mapLegacyGroceryCategory(inferGroceryCategory(it.ingredient_name))
                            )}
                          </span>
                          <button
                            type="button"
                            className="print:hidden text-xs text-red-600 shrink-0"
                            onClick={() => removeItem(it)}
                          >
                            Retirer
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <Link
          href="/planifier"
          className="print:hidden block text-center text-sm text-[#6B2E2E] font-medium underline"
        >
          Générer un autre menu
        </Link>
      </div>

      {selectedRecipe && (
        <div
          className="fixed inset-0 z-[120] bg-black/55 flex items-center justify-center p-4"
          onClick={() => setSelectedRecipe(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#FFF0F0] border border-[#E8A0A0] shadow-xl max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-[#E8D5D5] flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-semibold text-[#4a2c2c]">{selectedRecipe.nom_recette}</h3>
              <div className="flex items-center gap-2 shrink-0">
                {selectedRecipe.id > 0 ? (
                  <Link
                    href={`/recette/${selectedRecipe.id}`}
                    className="text-xs font-semibold text-[#6366f1] hover:underline"
                  >
                    Fiche complète →
                  </Link>
                ) : null}
                <button type="button" className="text-sm text-[#7a5a5a]" onClick={() => setSelectedRecipe(null)}>
                  Fermer ✕
                </button>
              </div>
            </div>
            {selectedRecipe.image_url ? (
              <div className="h-56 w-full">
                <RecipeImage imageUrl={selectedRecipe.image_url} alt={selectedRecipe.nom_recette || "Recette"} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="p-4 border-b border-[#E8D5D5] text-xs text-[#7A3A3A]">
                Image indisponible temporairement.
              </div>
            )}
            <div className="p-4 space-y-4">
              <p className="text-sm text-[#7A3A3A]">{selectedRecipe.description_courte}</p>
              <div className="text-xs text-[#7A3A3A]">
                {selectedRecipe.temps_preparation_min} min • {selectedRecipe.nombre_personnes || 1} pers. base • {householdSize} pers. foyer
              </div>
              {detectDietaryBadges(selectedRecipe).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {detectDietaryBadges(selectedRecipe).map((badge) => (
                    <span
                      key={`selected-${selectedRecipe.id}-${badge}`}
                      className="px-2 py-1 rounded-full text-[11px] font-semibold bg-[#FDE8E8] text-[#8A3A3A] border border-[#F2CACA]"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                  <h4 className="font-semibold text-[#6B2E2E]">Ingrédients ajustés</h4>
                  {/* Sélecteur "Pour X personnes" — recalcule les quantités en live */}
                  <div className="flex items-center gap-1 bg-[#FDF4F0] border border-[#F2CACA] rounded-lg px-1.5 py-1">
                    <button
                      type="button"
                      onClick={() => setPreviewPortions((p) => Math.max(1, p - 1))}
                      disabled={previewPortions <= 1}
                      aria-label="Diminuer le nombre de portions"
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[#6B2E2E] font-bold hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      −
                    </button>
                    <span className="text-sm font-semibold text-[#6B2E2E] min-w-[70px] text-center">
                      {previewPortions} pers.
                    </span>
                    <button
                      type="button"
                      onClick={() => setPreviewPortions((p) => Math.min(50, p + 1))}
                      disabled={previewPortions >= 50}
                      aria-label="Augmenter le nombre de portions"
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[#6B2E2E] font-bold hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      +
                    </button>
                  </div>
                </div>
                <ul className="space-y-1.5 text-sm text-[#6B2E2E]">
                  {(selectedRecipe.ingredients ?? "")
                    .split(";")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .map((line, idx) => {
                      const scaled = scaleIngredientQuantity(
                        parseIngredientLine(line),
                        getScalingFactor(selectedRecipe, previewPortions)
                      );
                      return <li key={`${line}-${idx}`}>• {formatScaledIngredient(scaled)}</li>;
                    })}
                </ul>
                <p className="mt-2 text-xs text-[#9b7878] italic">
                  Recette de base : {selectedRecipe.nombre_personnes || 1} pers. • Affichage ajusté pour {previewPortions} pers.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-[#6B2E2E] mb-2">Étapes</h4>
                <ol className="space-y-2 text-sm text-[#6B2E2E]">
                  {(selectedRecipe.instructions ?? "")
                    .split(";")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .map((step, idx) => (
                      <li key={`${step}-${idx}`}>{idx + 1}. {step}</li>
                    ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
