"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useSupabaseSession } from "../../hooks/useSupabaseSession";
import { plannerFetch } from "../../src/lib/plannerClient";
import GroceryExportBar from "../../components/GroceryExportBar";
import LoadingSpinner from "../../components/LoadingSpinner";
import RecipeImage from "../../components/RecipeImage";
import {
  formatGroceryDisplayLine,
  GROCERY_CATEGORY_LABEL_FR,
  mapLegacyGroceryCategory,
  sortCategoriesForDisplay,
} from "../../src/lib/groceryFormat";
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
    setHouseholdSize(Number(j.menu?.generation_context?.preferences?.household_size) || 2);
    setDays(Array.isArray(j.days) ? j.days : []);
    setGroceryItems(Array.isArray(j.grocery_items) ? j.grocery_items : []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  useEffect(() => {
    if (user && id) load();
  }, [user, id, load]);

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

  async function saveInCarnet() {
    if (savingCarnet) return;
    setSavingCarnet(true);
    const res = await plannerFetch(`/menus/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ saved_in_carnet: true }),
    });
    setSavingCarnet(false);
    if (res.ok) setSavedInCarnet(true);
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
  for (const it of groceryItems) {
    const slug = mapLegacyGroceryCategory(it.category || "divers");
    if (!grouped.has(slug)) grouped.set(slug, []);
    grouped.get(slug)!.push(it);
  }
  const sortedCategorySlugs = sortCategoriesForDisplay([...grouped.keys()]);

  return (
    <div className="min-h-screen bg-[#FFF8F6] pb-28 pt-4 px-4 print:bg-white">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="print:hidden">
          <Link href="/tableau" className="text-sm text-[#8A4A4A]">
            ← Tableau de bord
          </Link>
          <h1 className="text-xl font-bold text-[#4a2c2c] mt-2">{title}</h1>
          <div className="mt-3">
            <button
              type="button"
              disabled={savedInCarnet || savingCarnet}
              onClick={saveInCarnet}
              className="rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              {savedInCarnet ? "Menu enregistré dans Mon carnet" : savingCarnet ? "Enregistrement..." : "Enregistrer mon menu"}
            </button>
          </div>
        </div>

        <section className="print:hidden">
          <h2 className="text-lg font-semibold text-[#4a2c2c] mb-3">Planning</h2>
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
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#4a2c2c] mb-1 print:mb-3">Liste de courses</h2>
          <p className="hidden print:block text-sm text-[#4a2c2c] font-medium mb-2">{title}</p>
          <p className="text-xs text-[#7a5a5a] mb-3 print:hidden">
            Coche ce que tu as déjà ; supprime ce dont tu n’as pas besoin.
          </p>
          <GroceryExportBar menuTitle={title} items={groceryItems} />
          {groceryItems.length === 0 ? (
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
                      {GROCERY_CATEGORY_LABEL_FR[cat] || cat}
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
                            {formatGroceryDisplayLine(it.ingredient_name, it.quantity, it.unit)}
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
            <div className="p-4 border-b border-[#E8D5D5] flex items-center justify-between">
              <h3 className="font-semibold text-[#4a2c2c]">{selectedRecipe.nom_recette}</h3>
              <button className="text-sm text-[#7a5a5a]" onClick={() => setSelectedRecipe(null)}>
                Fermer ✕
              </button>
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
                <h4 className="font-semibold text-[#6B2E2E] mb-2">Ingrédients ajustés</h4>
                <ul className="space-y-1.5 text-sm text-[#6B2E2E]">
                  {selectedRecipe.ingredients
                    .split(";")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .map((line, idx) => {
                      const scaled = scaleIngredientQuantity(
                        parseIngredientLine(line),
                        getScalingFactor(selectedRecipe, householdSize)
                      );
                      return <li key={`${line}-${idx}`}>• {formatScaledIngredient(scaled)}</li>;
                    })}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-[#6B2E2E] mb-2">Étapes</h4>
                <ol className="space-y-2 text-sm text-[#6B2E2E]">
                  {selectedRecipe.instructions
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
