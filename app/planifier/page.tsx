"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { plannerFetch } from "../src/lib/plannerClient";
import { getLocale } from "../src/lib/i18n";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  clearPlanifierDraft,
  loadPlanifierDraft,
  planifierEditHref,
  plannedWeekFromMenuApi,
  savePlanifierDraft,
} from "../src/lib/plannerDraftStorage";
import type { PlannedWeek as StoredPlannedWeek } from "../src/lib/weeklyPlanner";

// ─── Types ────────────────────────────────────────────────────────────────────

type MealType = "breakfast" | "snack" | "lunch" | "dinner";

interface RecipePayload {
  id: number;
  nom_recette?: string | null;
  type?: string | null;
  difficulte?: string | null;
  temps_preparation_min?: number | null;
  calories?: number | null;
  ingredients?: string | null;
  image_url?: string | null;
}

interface PlannedMeal {
  meal_type: MealType;
  recipe_id: number;
  recipe_name: string;
  recipe_payload: RecipePayload;
  batch_group_id?: string | null;
  is_batch_origin?: boolean | null;
  batch_servings?: number | null;
  portion_adaptation?: "scale" | "batch_portions" | null;
  portion_note?: string | null;
}

interface PlannedDay {
  day_index: number;
  day_date: string;
  meals: PlannedMeal[];
}

interface PlannedWeek {
  days: PlannedDay[];
  meta: { season: string; recipes_considered: number; recipes_after_filters: number };
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const MEAL_ORDER: MealType[] = ["breakfast", "snack", "lunch", "dinner"];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Petit-déjeuner",
  snack: "Collation",
  lunch: "Déjeuner",
  dinner: "Dîner",
};

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: "🌅",
  snack: "🍎",
  lunch: "☀️",
  dinner: "🌙",
};

const DAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const DIFF_COLORS: Record<string, { bg: string; text: string }> = {
  facile:    { bg: "#d1fae5", text: "#065f46" },
  moyen:     { bg: "#fef3c7", text: "#92400e" },
  difficile: { bg: "#fee2e2", text: "#991b1b" },
};

// ─── Utilitaires date ─────────────────────────────────────────────────────────

function mondayISO(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function formatWeekRange(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const fmt = (x: Date) => x.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `${fmt(d)} – ${fmt(end)}`;
}

function slotKey(dayIndex: number, mealType: string) {
  return `${dayIndex}|${mealType}`;
}

// ─── Score nutritionnel PNNS simplifié ────────────────────────────────────────

interface NutritionCheck {
  icon: string;
  label: string;
  ok: boolean;
  detail: string;
}

function computeNutrition(plan: PlannedWeek): NutritionCheck[] {
  const meals = plan.days.flatMap((d) => d.meals);
  const text = (m: PlannedMeal) =>
    `${m.recipe_name} ${m.recipe_payload.ingredients || ""}`.toLowerCase();

  const fishCount = meals.filter((m) =>
    /\b(poisson|saumon|thon|cabillaud|maquereau|sardine|bar\b|dorade|hareng|anchois|lieu\b|merlu|sole\b)\b/.test(text(m))
  ).length;

  const legumeCount = meals.filter((m) =>
    /\b(lentille|pois chiche|haricot|f[eè]ve|pois cass[eé]|flageolet|soja\b|edamame)\b/.test(text(m))
  ).length;

  const redMeatCount = meals.filter((m) =>
    /\b(boeuf|b[oœ]euf|agneau|porc\b|veau|steak|hach[eé]|entrecôte|longe|côtelette)\b/.test(text(m))
  ).length;

  const veggieDays = plan.days.filter((d) =>
    d.meals.some((m) =>
      /\b(légume|tomate|carotte|courgette|épinard|brocoli|poivron|aubergine|haricot vert|chou\b|champignon|asperge)\b/.test(text(m))
    )
  ).length;

  return [
    { icon: "🐟", label: "Poisson", ok: fishCount >= 2,    detail: `${fishCount} repas · min. 2/sem.` },
    { icon: "🫘", label: "Légumineuses", ok: legumeCount >= 2, detail: `${legumeCount} repas · min. 2/sem.` },
    { icon: "🥩", label: "Viande rouge", ok: redMeatCount <= 4, detail: `${redMeatCount} repas · max. 4/sem.` },
    { icon: "🥦", label: "Légumes",    ok: veggieDays >= 5, detail: `${veggieDays} jours sur 7` },
  ];
}

// ─── Carte de slot ────────────────────────────────────────────────────────────

// ─── Modales ─────────────────────────────────────────────────────────────

interface PickerRecipe {
  id: number;
  nom_recette: string | null;
  type: string | null;
  difficulte: string | null;
  temps_preparation_min: number | null;
  calories: number | null;
  ingredients: string | null;
  image_url: string | null;
  dish_type?: string | null;
  nombre_personnes?: number | null;
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // Fermer avec ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          maxWidth: 640,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1f2937" }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 22,
              color: "#9ca3af",
              lineHeight: 1,
              padding: "0 6px",
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function RecipePickerModal({
  mealType,
  excludeRecipeIds,
  onPick,
  onClose,
}: {
  mealType: MealType;
  excludeRecipeIds: number[];
  onPick: (recipe: PickerRecipe) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [recipes, setRecipes] = useState<PickerRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);

  // Charger les recettes au montage et à chaque debounce de query
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ meal_type: mealType });
        if (query.trim()) params.set("query", query.trim());
        if (excludeRecipeIds.length > 0) {
          params.set("exclude_ids", excludeRecipeIds.join(","));
        }
        const res = await plannerFetch(`/recipes-for-slot?${params.toString()}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        setRecipes(data.recipes || []);
        setTotal(data.total || 0);
        setTruncated(Boolean(data.truncated));
      } catch (e) {
        console.error("[RecipePicker]", e);
        if (!cancelled) setRecipes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query.trim() ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mealType, query, excludeRecipeIds]);

  const mealLabel = MEAL_LABELS[mealType];

  return (
    <ModalShell title={`Choisir une recette · ${mealLabel}`} onClose={onClose}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid #f3f4f6" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom (ex: omelette, curry…)"
          autoFocus
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            fontSize: 14,
            outline: "none",
            color: "#1f2937",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#6366f1"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
        />
        <p style={{ margin: "8px 0 0", fontSize: 11, color: "#9ca3af" }}>
          {loading
            ? "Chargement…"
            : `${recipes.length} affichées${truncated ? ` sur ${total}+ disponibles` : ""}`}
        </p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {loading && recipes.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
            <LoadingSpinner />
          </div>
        )}
        {!loading && recipes.length === 0 && (
          <div style={{ textAlign: "center", padding: 30, color: "#9ca3af", fontSize: 13 }}>
            Aucune recette ne correspond à votre recherche.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {recipes.map((r) => {
            const diff = (r.difficulte || "").toLowerCase();
            const diffStyle = DIFF_COLORS[diff];
            return (
              <button
                key={r.id}
                onClick={() => onPick(r)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 10,
                  borderRadius: 10,
                  background: "#fff",
                  border: "1px solid #f3f4f6",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s, border 0.12s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#f9fafb";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#a5b4fc";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#f3f4f6";
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1f2937" }}>
                    {(r.nom_recette || "Recette").trim()}
                  </p>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    {r.temps_preparation_min != null && (
                      <span style={{ fontSize: 10, color: "#6b7280", background: "#f9fafb", borderRadius: 4, padding: "1px 5px" }}>
                        ⏱ {r.temps_preparation_min}min
                      </span>
                    )}
                    {diffStyle && (
                      <span style={{ fontSize: 10, fontWeight: 600, background: diffStyle.bg, color: diffStyle.text, borderRadius: 4, padding: "1px 5px" }}>
                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                      </span>
                    )}
                    {r.calories != null && (
                      <span style={{ fontSize: 10, color: "#6b7280", background: "#f9fafb", borderRadius: 4, padding: "1px 5px" }}>
                        {r.calories} kcal
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 18, color: "#9ca3af" }}>›</span>
              </button>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}

function BatchDuplicatorModal({
  plan,
  dayIndex,
  mealType,
  lockedSlots,
  onApply,
  onClose,
}: {
  plan: PlannedWeek;
  dayIndex: number;
  mealType: MealType;
  lockedSlots: Set<string>;
  onApply: (targetDayIndexes: number[]) => void;
  onClose: () => void;
}) {
  const originMeal = plan.days
    .find((d) => d.day_index === dayIndex)
    ?.meals.find((m) => m.meal_type === mealType);

  // Jours candidats : jours postérieurs où le même meal_type existe et n'est pas verrouillé
  const candidates = useMemo(() => {
    const eligibleTypes: MealType[] =
      mealType === "lunch" || mealType === "dinner" ? ["lunch", "dinner"] : [mealType];
    return plan.days
      .filter((d) => d.day_index !== dayIndex)
      .map((d) => {
        const matching = d.meals.find((m) => eligibleTypes.includes(m.meal_type) && m.meal_type === mealType);
        if (!matching) return null;
        const key = slotKey(d.day_index, mealType);
        return {
          dayIndex: d.day_index,
          dayLabel: DAY_SHORT[d.day_index % 7] || `J${d.day_index + 1}`,
          dayDate: d.day_date,
          currentRecipeName: (matching.recipe_payload?.nom_recette || matching.recipe_name || "").trim(),
          locked: lockedSlots.has(key),
        };
      })
      .filter(Boolean) as Array<{
        dayIndex: number;
        dayLabel: string;
        dayDate: string;
        currentRecipeName: string;
        locked: boolean;
      }>;
  }, [plan, dayIndex, mealType, lockedSlots]);

  const [selected, setSelected] = useState<Set<number>>(new Set());

  if (!originMeal) {
    return null;
  }

  const recipeName = (originMeal.recipe_payload?.nom_recette || originMeal.recipe_name || "").trim();

  return (
    <ModalShell title="Dupliquer ce plat sur d'autres jours" onClose={onClose}>
      <div style={{ padding: 18 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#4b5563" }}>
          Le plat <strong style={{ color: "#1f2937" }}>{recipeName}</strong> sera préparé une seule
          fois et compté <strong>une seule fois dans la liste de courses</strong>. Les jours
          sélectionnés afficheront « Restes de… ».
        </p>

        {candidates.length === 0 ? (
          <p style={{ marginTop: 16, fontSize: 13, color: "#9ca3af", fontStyle: "italic" }}>
            Aucun jour suivant disponible avec un créneau {MEAL_LABELS[mealType]} non verrouillé.
          </p>
        ) : (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
            {candidates.map((c) => {
              const isSelected = selected.has(c.dayIndex);
              const disabled = c.locked;
              return (
                <label
                  key={c.dayIndex}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: isSelected ? "#fffbeb" : disabled ? "#f9fafb" : "#fff",
                    border: `1px solid ${isSelected ? "#f59e0b" : "#e5e7eb"}`,
                    borderRadius: 10,
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.5 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={disabled}
                    onChange={(e) => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(c.dayIndex);
                        else next.delete(c.dayIndex);
                        return next;
                      });
                    }}
                    style={{ accentColor: "#f59e0b" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1f2937" }}>
                      {c.dayLabel} — {MEAL_LABELS[mealType]}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {disabled ? "🔒 Verrouillé" : `Actuel : ${c.currentRecipeName || "(vide)"}`}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "12px 18px",
          borderTop: "1px solid #f3f4f6",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={onClose}
          style={{
            padding: "9px 16px",
            background: "#fff",
            color: "#374151",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Annuler
        </button>
        <button
          onClick={() => {
            onApply([...selected]);
            onClose();
          }}
          disabled={selected.size === 0}
          style={{
            padding: "9px 16px",
            background: selected.size === 0 ? "#e5e7eb" : "#f59e0b",
            color: selected.size === 0 ? "#9ca3af" : "#fff",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: selected.size === 0 ? "not-allowed" : "pointer",
          }}
        >
          🍱 Dupliquer sur {selected.size} jour{selected.size > 1 ? "s" : ""}
        </button>
      </div>
    </ModalShell>
  );
}

// Palette de couleurs pour différencier visuellement les batchs sur la semaine
const BATCH_COLORS = [
  { border: "#f59e0b", bg: "#fffbeb", text: "#92400e" }, // ambre
  { border: "#10b981", bg: "#ecfdf5", text: "#065f46" }, // émeraude
  { border: "#3b82f6", bg: "#eff6ff", text: "#1e40af" }, // bleu
  { border: "#ec4899", bg: "#fdf2f8", text: "#9d174d" }, // rose
  { border: "#8b5cf6", bg: "#f5f3ff", text: "#5b21b6" }, // violet
  { border: "#14b8a6", bg: "#f0fdfa", text: "#115e59" }, // teal
];

function SlotCard({
  meal,
  isLocked,
  isRegenerating,
  onRegenerate,
  onToggleLock,
  onPickRecipe,
  onDuplicateBatch,
  onDelete,
  onViewRecipe,
  batchColor,
  batchOriginDayLabel,
}: {
  meal: PlannedMeal;
  isLocked: boolean;
  isRegenerating: boolean;
  onRegenerate: () => void;
  onToggleLock: () => void;
  onPickRecipe: () => void;
  onDuplicateBatch: () => void;
  onDelete: () => void;
  /** Ouvre la fiche recette (URL /recette/[id]). */
  onViewRecipe: () => void;
  /** Couleur attribuée au batch_group_id (undefined si pas de batch). */
  batchColor?: (typeof BATCH_COLORS)[number];
  /** Label court du jour d'origine du batch (ex: "Lun") — défini uniquement pour les reprises. */
  batchOriginDayLabel?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Fermer le menu au clic dehors
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);
  const p = meal.recipe_payload;
  const name = (p.nom_recette || meal.recipe_name || "Recette").trim();
  const diff = (p.difficulte || "").toLowerCase();
  const diffStyle = DIFF_COLORS[diff];
  const prepTime = p.temps_preparation_min;
  const isBatchOrigin = batchColor && meal.is_batch_origin === true;
  const isBatchRepeat = batchColor && meal.is_batch_origin === false;

  // Priorité de la bordure : verrou > batch > défaut
  const border = isLocked
    ? "1.5px solid #a5b4fc"
    : batchColor
      ? `1.5px solid ${batchColor.border}`
      : "1px solid #e5e7eb";
  const boxShadow = isLocked
    ? "0 0 0 2px #e0e7ff"
    : batchColor
      ? `0 0 0 2px ${batchColor.bg}`
      : "0 1px 3px rgba(0,0,0,.06)";

  return (
    <div
      style={{
        background: "#fff",
        border,
        borderRadius: 14,
        boxShadow,
        display: "flex",
        flexDirection: "column",
        minHeight: 130,
        opacity: isRegenerating ? 0.55 : 1,
        transition: "opacity 0.15s, border 0.15s",
        position: "relative",
      }}
    >
      {isLocked && (
        <span
          style={{ position: "absolute", top: 7, right: 8, fontSize: 12 }}
          title="Verrouillé"
        >🔒</span>
      )}

      {/* Bandeau batch */}
      {batchColor && !isRegenerating && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 8px",
            background: batchColor.bg,
            color: batchColor.text,
            fontSize: 10,
            fontWeight: 700,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            borderBottom: `1px solid ${batchColor.border}33`,
            letterSpacing: 0.2,
          }}
          title={
            meal.portion_note ||
            (isBatchOrigin
              ? `Préparation en lot pour ${meal.batch_servings ?? "?"} portions`
              : `Restes de ${batchOriginDayLabel ?? "ce plat"}`)
          }
        >
          {isBatchOrigin ? (
            <>
              {meal.portion_adaptation === "batch_portions" ? "🍱 BATCH" : "🍱 À PRÉPARER"}
              {meal.batch_servings ? ` · ${meal.batch_servings} portions` : ""}
            </>
          ) : (
            <>♻️ RESTES{batchOriginDayLabel ? ` DE ${batchOriginDayLabel.toUpperCase()}` : ""}</>
          )}
        </div>
      )}

      {meal.portion_note && !batchColor && !isRegenerating ? (
        <div
          style={{
            padding: "4px 10px",
            fontSize: 10,
            fontWeight: 600,
            color: "#9A6A6A",
            background: "#FFF5F7",
            borderBottom: "1px solid #F5DDE5",
          }}
          title={meal.portion_note}
        >
          {meal.portion_adaptation === "batch_portions" ? "🍱 " : "⚖️ "}
          {meal.portion_adaptation === "scale"
            ? `Pour ton foyer`
            : meal.portion_adaptation === "batch_portions"
              ? "Plusieurs repas"
              : "Adapté"}
        </div>
      ) : null}

      {/* Contenu */}
      <div style={{ flex: 1, padding: "10px 12px 4px" }}>
        {isRegenerating ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 72 }}>
            <div
              style={{
                width: 20, height: 20,
                border: "2px solid #6366f1",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={onViewRecipe}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onViewRecipe();
              }
            }}
            title="Voir la fiche recette"
            style={{
              cursor: "pointer",
              borderRadius: 10,
              outline: "none",
            }}
          >
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#1f2937",
                lineHeight: 1.35,
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                margin: 0,
              }}
            >
              {name}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 7 }}>
              {prepTime != null && !isBatchRepeat && (
                <span style={{ fontSize: 11, color: "#6b7280", background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 6, padding: "2px 6px" }}>
                  ⏱ {prepTime} min
                </span>
              )}
              {isBatchRepeat && (
                <span style={{ fontSize: 11, color: "#6b7280", background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 6, padding: "2px 6px" }}>
                  ⏱ 0 min
                </span>
              )}
              {diffStyle && (
                <span style={{ fontSize: 11, fontWeight: 600, background: diffStyle.bg, color: diffStyle.text, borderRadius: 6, padding: "2px 6px" }}>
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </span>
              )}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "#6366f1", fontWeight: 600 }}>
              Voir la fiche recette →
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 4,
          padding: "4px 8px 8px",
          borderTop: "1px solid #f3f4f6",
          position: "relative",
        }}
      >
        <button
          onClick={onRegenerate}
          disabled={isLocked || isRegenerating}
          title={isLocked ? "Déverrouillez pour régénérer" : "Régénérer aléatoirement"}
          style={{
            background: "none",
            border: "none",
            cursor: isLocked || isRegenerating ? "not-allowed" : "pointer",
            opacity: isLocked || isRegenerating ? 0.3 : 1,
            padding: "5px 6px",
            borderRadius: 8,
            color: "#9ca3af",
            fontSize: 15,
            lineHeight: 1,
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => { if (!isLocked && !isRegenerating) { (e.currentTarget as HTMLButtonElement).style.background = "#ede9fe"; (e.currentTarget as HTMLButtonElement).style.color = "#6366f1"; } }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "#9ca3af"; }}
        >
          ↺
        </button>

        {/* Menu actions secondaires */}
        <div ref={menuRef} style={{ position: "relative" }}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            disabled={isRegenerating}
            title="Plus d'options"
            style={{
              background: menuOpen ? "#ede9fe" : "none",
              border: "none",
              cursor: isRegenerating ? "not-allowed" : "pointer",
              opacity: isRegenerating ? 0.3 : 1,
              padding: "5px 6px",
              borderRadius: 8,
              color: menuOpen ? "#6366f1" : "#9ca3af",
              fontSize: 16,
              lineHeight: 1,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            ⋯
          </button>
          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                right: 0,
                minWidth: 200,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                padding: 4,
                zIndex: 50,
              }}
            >
              <MenuItem
                icon="📋"
                label="Choisir une recette…"
                onClick={() => { setMenuOpen(false); onPickRecipe(); }}
                disabled={isLocked}
              />
              <MenuItem
                icon="🍱"
                label="Dupliquer sur d'autres jours…"
                onClick={() => { setMenuOpen(false); onDuplicateBatch(); }}
                disabled={isLocked}
              />
              <div style={{ height: 1, background: "#f3f4f6", margin: "4px 0" }} />
              <MenuItem
                icon="🗑️"
                label="Supprimer ce repas"
                danger
                onClick={() => { setMenuOpen(false); onDelete(); }}
                disabled={isLocked}
              />
            </div>
          )}
        </div>

        <button
          onClick={onToggleLock}
          title={isLocked ? "Déverrouiller" : "Verrouiller (conserver ce repas)"}
          style={{
            background: isLocked ? "#ede9fe" : "none",
            border: "none",
            cursor: "pointer",
            padding: "5px 6px",
            borderRadius: 8,
            color: isLocked ? "#6366f1" : "#9ca3af",
            fontSize: 14,
            lineHeight: 1,
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {isLocked ? "🔒" : "🔓"}
        </button>
      </div>
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "8px 10px",
        background: "none",
        border: "none",
        borderRadius: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        color: danger ? "#dc2626" : "#374151",
        fontSize: 13,
        textAlign: "left",
        fontWeight: 500,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = danger ? "#fef2f2" : "#f3f4f6";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "none";
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function PlanifierPage() {
  const router = useRouter();
  const { user, loading: sessionLoading } = useSupabaseSession();

  const [checking, setChecking] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekStart, setWeekStart] = useState(() => mondayISO(0));
  const [activeMealTypes, setActiveMealTypes] = useState<Set<MealType>>(
    new Set(["lunch", "dinner"])
  );

  const [plan, setPlan] = useState<PlannedWeek | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [lockedSlots, setLockedSlots] = useState<Set<string>>(new Set());
  const [regeneratingSlot, setRegeneratingSlot] = useState<string | null>(null);
  /** Historique des recettes déjà proposées par créneau (évite les répétitions). */
  const slotRegenHistoryRef = useRef<Map<string, number[]>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Modales actions slot ────────────────────────────────────────────────
  // Cible : { dayIndex, mealType } du slot sur lequel on a déclenché l'action.
  const [pickerTarget, setPickerTarget] = useState<{ dayIndex: number; mealType: MealType } | null>(null);
  const [duplicatorTarget, setDuplicatorTarget] = useState<{ dayIndex: number; mealType: MealType } | null>(null);

  // ── Batch cooking : map des couleurs et des jours d'origine ─────────────
  // Pour chaque batch_group_id présent dans le plan, on assigne une couleur
  // unique (rotation dans BATCH_COLORS) et on stocke le day_index d'origine.
  const batchMeta = useMemo(() => {
    const colors = new Map<string, (typeof BATCH_COLORS)[number]>();
    const originDayIndex = new Map<string, number>();
    if (!plan) return { colors, originDayIndex };

    let idx = 0;
    const seen = new Set<string>();
    for (const day of plan.days) {
      for (const meal of day.meals) {
        const gid = meal.batch_group_id;
        if (!gid) continue;
        if (!seen.has(gid)) {
          seen.add(gid);
          colors.set(gid, BATCH_COLORS[idx % BATCH_COLORS.length]);
          idx++;
        }
        if (meal.is_batch_origin === true && !originDayIndex.has(gid)) {
          originDayIndex.set(gid, day.day_index);
        }
      }
    }
    return { colors, originDayIndex };
  }, [plan]);

  // Auth & onboarding
  useEffect(() => {
    if (!sessionLoading && !user) router.push("/login");
  }, [sessionLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const res = await plannerFetch("/preferences");
      const j = res.ok ? await res.json().catch(() => ({})) : {};
      if (cancelled) return;
      if (!j.completed) { router.replace("/onboarding"); return; }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [user, router]);

  // Navigation semaine
  const navigateWeek = useCallback((delta: number) => {
    const next = weekOffset + delta;
    setWeekOffset(next);
    setWeekStart(mondayISO(next));
    setPlan(null);
    setMenuId(null);
    setLockedSlots(new Set());
    slotRegenHistoryRef.current.clear();
    clearPlanifierDraft();
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/planifier");
    }
  }, [weekOffset]);

  // Restaurer le menu en cours d’édition (retour fiche recette ou ?menu=…)
  useEffect(() => {
    if (!user || checking || plan) return;

    const draft = loadPlanifierDraft();
    if (draft) {
      setPlan(draft.plan as unknown as PlannedWeek);
      setMenuId(draft.menuId);
      setWeekStart(draft.weekStart);
      setLockedSlots(new Set(draft.lockedSlots));
      return;
    }

    const menuParam =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("menu")
        : null;
    if (!menuParam) return;

    let cancelled = false;
    void (async () => {
      const res = await plannerFetch(`/menus/${menuParam}`);
      const j = await res.json().catch(() => ({}));
      if (cancelled) return;
      if (!res.ok) return;
      const restored = plannedWeekFromMenuApi(j);
      if (!restored) return;
      const week =
        typeof j.menu?.week_start_date === "string" ? j.menu.week_start_date : weekStart;
      setPlan(restored);
      setMenuId(menuParam);
      setWeekStart(week);
      setLockedSlots(new Set());
      savePlanifierDraft({
        plan: restored as StoredPlannedWeek,
        menuId: menuParam,
        weekStart: week,
        lockedSlots: [],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, checking, plan, weekStart]);

  // Brouillon session : garder la grille si on quitte vers une fiche recette
  useEffect(() => {
    if (!plan || !menuId) return;
    savePlanifierDraft({
      plan: plan as unknown as StoredPlannedWeek,
      menuId,
      weekStart,
      lockedSlots: [...lockedSlots],
    });
  }, [plan, menuId, weekStart, lockedSlots]);

  // Toggle type de repas
  const toggleMealType = useCallback((mt: MealType) => {
    setActiveMealTypes((prev) => {
      const next = new Set(prev);
      if (next.has(mt)) { if (next.size > 1) next.delete(mt); }
      else next.add(mt);
      return next;
    });
  }, []);

  // Génère le menu complet (avec slots verrouillés si plan existant)
  const generate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    // Serialiser les slots verrouillés depuis le plan en cours
    const locked_slots = plan
      ? [...lockedSlots].flatMap((key) => {
          const [di, mt] = key.split("|");
          const dayIndex = Number(di);
          const meal = plan.days[dayIndex]?.meals.find((m) => m.meal_type === mt);
          if (!meal) return [];
          return [{
            day_index: dayIndex,
            meal_type: mt,
            recipe_id: meal.recipe_id,
            recipe_payload: meal.recipe_payload,
          }];
        })
      : [];

    try {
      const res = await plannerFetch("/generate", {
        method: "POST",
        body: JSON.stringify({
          week_start_date: weekStart,
          overrides: { meal_types: [...activeMealTypes] },
          use_ai_menu: true,
          locale: getLocale(),
          locked_slots,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Échec de la génération");
      const newPlan = data.plan as PlannedWeek;
      const newMenuId = data.menu_id as string;
      setPlan(newPlan);
      setMenuId(newMenuId);
      setLockedSlots(new Set());
      slotRegenHistoryRef.current.clear();
      savePlanifierDraft({
        plan: newPlan as unknown as StoredPlannedWeek,
        menuId: newMenuId,
        weekStart,
        lockedSlots: [],
      });
      router.replace(planifierEditHref(newMenuId), { scroll: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsGenerating(false);
    }
  }, [weekStart, activeMealTypes, plan, lockedSlots, router]);

  // Régénérer un slot individuel
  const regenerateSlot = useCallback(async (dayIndex: number, mealType: MealType) => {
    if (!plan) return;
    const key = slotKey(dayIndex, mealType);
    setRegeneratingSlot(key);

    // Détection batch : si on régénère un slot lié à un batch_group_id,
    // on identifie tous les slots qui en font partie pour décider quoi faire.
    const targetMeal = plan.days
      .find((d) => d.day_index === dayIndex)
      ?.meals.find((m) => m.meal_type === mealType);
    const targetBatchGroupId = targetMeal?.batch_group_id || null;
    const isOrigin = targetMeal?.is_batch_origin === true;
    // Si on régénère l'origin -> on doit aussi orphaniser/régénérer les reprises.
    // Si on régénère une reprise -> on casse juste son lien batch, l'origin reste OK.
    const batchSiblings: { day_index: number; meal_type: MealType }[] = targetBatchGroupId
      ? plan.days.flatMap((d) =>
          d.meals
            .filter(
              (m) =>
                m.batch_group_id === targetBatchGroupId &&
                !(d.day_index === dayIndex && m.meal_type === mealType)
            )
            .map((m) => ({ day_index: d.day_index, meal_type: m.meal_type }))
        )
      : [];

    const weekRecipeIds = plan.days
      .flatMap((d) => d.meals.map((m) => m.recipe_id))
      .filter((id): id is number => Number.isFinite(id));
    const previousHistory = slotRegenHistoryRef.current.get(key) ?? [];
    const currentRecipeId = targetMeal?.recipe_id;
    const rejectedRecipeIds = [
      ...new Set([
        ...previousHistory,
        ...(Number.isFinite(currentRecipeId) ? [currentRecipeId] : []),
      ]),
    ];
    try {
      const res = await plannerFetch("/slots/regenerate", {
        method: "POST",
        body: JSON.stringify({
          meal_type: mealType,
          week_start_date: weekStart,
          exclude_recipe_ids: weekRecipeIds,
          rejected_recipe_ids: rejectedRecipeIds,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Impossible de régénérer");
      const r = data.recipe as RecipePayload & { nom_recette?: string };
      const nextHistory = [...new Set([...previousHistory, targetMeal?.recipe_id, r.id])]
        .filter((id): id is number => Number.isFinite(id))
        .slice(-15);
      slotRegenHistoryRef.current.set(key, nextHistory);
      setPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          days: prev.days.map((d) => {
            return {
              ...d,
              meals: d.meals.map((m) => {
                // Slot ciblé : nouvelle recette + on casse le lien batch
                if (d.day_index === dayIndex && m.meal_type === mealType) {
                  return {
                    ...m,
                    recipe_id: r.id,
                    recipe_name: r.nom_recette || "Recette",
                    recipe_payload: r,
                    batch_group_id: null,
                    is_batch_origin: null,
                    batch_servings: null,
                  };
                }
                // Reprises orphelines (si on a régénéré l'origin) : on les libère
                // visuellement (perte du lien batch). L'utilisateur devra
                // régénérer chacune s'il veut s'en débarrasser, ou les laisser.
                if (
                  isOrigin &&
                  batchSiblings.some(
                    (s) => s.day_index === d.day_index && s.meal_type === m.meal_type
                  )
                ) {
                  return {
                    ...m,
                    batch_group_id: null,
                    is_batch_origin: null,
                    batch_servings: null,
                  };
                }
                return m;
              }),
            };
          }),
        };
      });
    } catch (e) {
      console.error("[Planifier] régénération slot :", e);
    } finally {
      setRegeneratingSlot(null);
    }
  }, [plan, weekStart]);

  const toggleLock = useCallback((dayIndex: number, mealType: string) => {
    const key = slotKey(dayIndex, mealType);
    setLockedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // ── Suppression d'un slot ───────────────────────────────────────────────
  // Vide le slot (le rendu affichera le placeholder "vide"). Si le slot était
  // un batch origin, libère le lien batch sur les reprises (qui gardent leur
  // recette mais perdent le badge "Restes de…").
  const deleteSlot = useCallback((dayIndex: number, mealType: MealType) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const targetMeal = prev.days
        .find((d) => d.day_index === dayIndex)
        ?.meals.find((m) => m.meal_type === mealType);
      const batchId = targetMeal?.batch_group_id || null;
      const wasOrigin = targetMeal?.is_batch_origin === true;

      return {
        ...prev,
        days: prev.days.map((d) => ({
          ...d,
          meals: d.meals
            // Suppression effective du slot ciblé
            .filter((m) => !(d.day_index === dayIndex && m.meal_type === mealType))
            // Libération des reprises orphelines si on supprimait l'origin
            .map((m) => {
              if (wasOrigin && batchId && m.batch_group_id === batchId) {
                return {
                  ...m,
                  batch_group_id: null,
                  is_batch_origin: null,
                  batch_servings: null,
                };
              }
              return m;
            }),
        })),
      };
    });

    // Retire aussi le verrou s'il existait sur ce slot
    setLockedSlots((prev) => {
      const next = new Set(prev);
      next.delete(slotKey(dayIndex, mealType));
      return next;
    });
  }, []);

  // ── Sélection d'une recette depuis la modale RecipePicker ──────────────
  const applyPickedRecipe = useCallback((dayIndex: number, mealType: MealType, recipe: RecipePayload & { nom_recette?: string | null }) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const targetMeal = prev.days
        .find((d) => d.day_index === dayIndex)
        ?.meals.find((m) => m.meal_type === mealType);
      const batchId = targetMeal?.batch_group_id || null;
      const wasOrigin = targetMeal?.is_batch_origin === true;

      return {
        ...prev,
        days: prev.days.map((d) => ({
          ...d,
          meals: d.meals.map((m) => {
            // Remplacement du slot ciblé (casse son lien batch)
            if (d.day_index === dayIndex && m.meal_type === mealType) {
              return {
                ...m,
                recipe_id: recipe.id,
                recipe_name: (recipe.nom_recette || "Recette").trim(),
                recipe_payload: recipe,
                batch_group_id: null,
                is_batch_origin: null,
                batch_servings: null,
              };
            }
            // Libération des reprises orphelines si on remplaçait l'origin
            if (wasOrigin && batchId && m.batch_group_id === batchId) {
              return {
                ...m,
                batch_group_id: null,
                is_batch_origin: null,
                batch_servings: null,
              };
            }
            return m;
          }),
        })),
      };
    });
  }, []);

  // ── Application d'un batch manuel ──────────────────────────────────────
  // L'utilisateur a sélectionné des jours cibles dans BatchDuplicator.
  // On marque l'origin + chaque cible avec un nouveau batch_group_id.
  const applyManualBatch = useCallback((dayIndex: number, mealType: MealType, targetDayIndexes: number[]) => {
    if (targetDayIndexes.length === 0) return;
    setPlan((prev) => {
      if (!prev) return prev;
      const originDay = prev.days.find((d) => d.day_index === dayIndex);
      const originMeal = originDay?.meals.find((m) => m.meal_type === mealType);
      if (!originMeal) return prev;

      const groupId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // batch_servings reflète : 1 prep × (origin + cibles) × household. Comme on
      // n'a pas household_size côté client ici, on stocke juste le nombre de
      // créneaux servis ; le backend recalcule à la prochaine régénération.
      const totalCreneaux = 1 + targetDayIndexes.length;

      return {
        ...prev,
        days: prev.days.map((d) => {
          // L'origin
          if (d.day_index === dayIndex) {
            return {
              ...d,
              meals: d.meals.map((m) =>
                m.meal_type === mealType
                  ? {
                      ...m,
                      batch_group_id: groupId,
                      is_batch_origin: true,
                      batch_servings: totalCreneaux,
                    }
                  : m
              ),
            };
          }
          // Les cibles : on remplace par la même recette + flag reprise
          if (targetDayIndexes.includes(d.day_index)) {
            // On cherche un slot du même meal_type (sinon, on prend l'équivalent
            // accessible : pour origin lunch/dinner on accepte les deux).
            const eligibleTypes: MealType[] =
              mealType === "lunch" || mealType === "dinner"
                ? ["lunch", "dinner"]
                : [mealType];
            return {
              ...d,
              meals: d.meals.map((m) => {
                if (!eligibleTypes.includes(m.meal_type)) return m;
                // On remplace seulement le premier slot éligible (priorité même type)
                const sameType = m.meal_type === mealType;
                if (!sameType) return m;
                return {
                  ...m,
                  recipe_id: originMeal.recipe_id,
                  recipe_name: originMeal.recipe_name,
                  recipe_payload: originMeal.recipe_payload,
                  batch_group_id: groupId,
                  is_batch_origin: false,
                  batch_servings: totalCreneaux,
                };
              }),
            };
          }
          return d;
        }),
      };
    });
  }, []);

  const activeMealsOrdered = MEAL_ORDER.filter((mt) => activeMealTypes.has(mt));
  const nutrition = useMemo(() => plan ? computeNutrition(plan) : [], [plan]);

  // ── Gardes ──
  if (sessionLoading || !user || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner message="Chargement…" />
      </div>
    );
  }

  return (
    <>
      {/* Animation spinner (CSS inline car pas de fichier global dispo ici) */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div className="min-h-[100dvh] bg-[var(--background,#f9fafb)]">

        {/* ── Header ── */}
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 20, boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link
                href="/tableau"
                style={{ color: "#9ca3af", textDecoration: "none", fontSize: 20, lineHeight: 1, display: "flex", alignItems: "center" }}
              >←</Link>
              <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#111827" }}>Planifier ma semaine</h1>
            </div>

            {plan && menuId && (
              <button
                onClick={() => router.push(`/menus/${menuId}`)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px",
                  background: "var(--accent, #6366f1)", color: "#fff",
                  border: "none", borderRadius: 12, cursor: "pointer",
                  fontWeight: 700, fontSize: 13,
                  boxShadow: "0 2px 6px rgba(99,102,241,.3)",
                }}
              >
                ✓ Voir le menu complet
              </button>
            )}
          </div>
        </div>

        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px" }}>

          {/* ── Barre de configuration ── */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 18, padding: "16px 20px", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,.05)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16 }}>

              {/* Navigation semaine */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  onClick={() => navigateWeek(-1)}
                  style={{ width: 32, height: 32, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 18, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}
                >‹</button>
                <div style={{ textAlign: "center", minWidth: 170 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", fontWeight: 600 }}>Semaine du</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{formatWeekRange(weekStart)}</div>
                </div>
                <button
                  onClick={() => navigateWeek(1)}
                  style={{ width: 32, height: 32, border: "1px solid #e5e7eb", borderRadius: 10, background: "#fff", cursor: "pointer", fontSize: 18, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}
                >›</button>
              </div>

              {/* Séparateur */}
              <div style={{ width: 1, height: 36, background: "#e5e7eb", flexShrink: 0 }} />

              {/* Toggles repas */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {MEAL_ORDER.map((mt) => {
                  const active = activeMealTypes.has(mt);
                  return (
                    <button
                      key={mt}
                      onClick={() => toggleMealType(mt)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 14px",
                        background: active ? "var(--accent, #6366f1)" : "#fff",
                        color: active ? "#fff" : "#6b7280",
                        border: active ? "1.5px solid var(--accent, #6366f1)" : "1.5px solid #e5e7eb",
                        borderRadius: 20, cursor: "pointer",
                        fontWeight: 600, fontSize: 13,
                        transition: "all 0.15s",
                      }}
                    >
                      <span>{MEAL_ICONS[mt]}</span>
                      <span>{MEAL_LABELS[mt]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Bouton générer */}
              <button
                onClick={generate}
                disabled={isGenerating || activeMealTypes.size === 0}
                style={{
                  marginLeft: "auto",
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 22px",
                  background: isGenerating ? "#a5b4fc" : "var(--accent, #6366f1)",
                  color: "#fff",
                  border: "none", borderRadius: 12, cursor: isGenerating ? "not-allowed" : "pointer",
                  fontWeight: 700, fontSize: 14,
                  boxShadow: "0 2px 6px rgba(99,102,241,.25)",
                  whiteSpace: "nowrap",
                  transition: "background 0.15s",
                }}
              >
                {isGenerating ? (
                  <>
                    <div style={{ width: 16, height: 16, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                    Génération…
                  </>
                ) : (
                  <>{plan ? "↺ Régénérer" : "⚡ Générer le menu"}</>
                )}
              </button>
            </div>
          </div>

          {/* ── Erreur ── */}
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: "12px 16px", fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* ── État vide ── */}
          {!plan && !isGenerating && (
            <div style={{ textAlign: "center", padding: "80px 20px" }}>
              <div style={{ width: 72, height: 72, background: "#ede9fe", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 32 }}>
                📅
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1f2937", margin: "0 0 8px" }}>
                Générez votre menu de la semaine
              </h2>
              <p style={{ fontSize: 14, color: "#9ca3af", maxWidth: 400, margin: "0 auto" }}>
                Activez les repas souhaités, naviguez vers la bonne semaine, puis cliquez sur <strong>Générer le menu</strong>.
                L&apos;IA adapte les recettes à votre profil et à la saison.
              </p>
            </div>
          )}

          {/* ── Skeleton ── */}
          {isGenerating && (
            <div style={{ opacity: 0.5 }}>
              <div style={{ height: 48, background: "#f3f4f6", borderRadius: 12, marginBottom: 12, animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ display: "grid", gridTemplateColumns: "96px repeat(7, 1fr)", gap: 8, minWidth: 900 }}>
                {Array.from({ length: (activeMealsOrdered.length + 1) * 8 }).map((_, i) => (
                  <div key={i} style={{ height: 130, background: "#f3f4f6", borderRadius: 12 }} />
                ))}
              </div>
              <style>{`@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
            </div>
          )}

          {/* ── Grille ── */}
          {plan && !isGenerating && (
            <div>
              {/* Score nutritionnel */}
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "14px 18px", marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", fontWeight: 700, marginBottom: 10 }}>
                  Équilibre nutritionnel (PNNS)
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {nutrition.map((b) => (
                    <div
                      key={b.label}
                      title={b.detail}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "5px 12px",
                        background: b.ok ? "#ecfdf5" : "#fffbeb",
                        border: `1px solid ${b.ok ? "#a7f3d0" : "#fde68a"}`,
                        borderRadius: 20,
                        fontSize: 12, fontWeight: 600,
                        color: b.ok ? "#065f46" : "#92400e",
                        cursor: "default",
                      }}
                    >
                      <span>{b.icon}</span>
                      <span>{b.label}</span>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: b.ok ? "#10b981" : "#f59e0b", display: "inline-block" }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Note slots verrouillés */}
              {lockedSlots.size > 0 && (
                <div style={{ fontSize: 12, color: "#6366f1", background: "#ede9fe", border: "1px solid #c7d2fe", borderRadius: 10, padding: "8px 14px", marginBottom: 12 }}>
                  🔒 {lockedSlots.size} slot{lockedSlots.size > 1 ? "s" : ""} verrouillé{lockedSlots.size > 1 ? "s" : ""} — ces repas seront conservés lors d&apos;une nouvelle génération.
                </div>
              )}

              {/* Grille principale */}
              <div style={{ overflowX: "auto", paddingBottom: 8 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: `96px repeat(7, minmax(148px, 1fr))`,
                    gap: 8,
                    minWidth: 1050,
                  }}
                >
                  {/* Ligne d'en-têtes */}
                  <div />
                  {plan.days.map((day) => {
                    const date = new Date(day.day_date + "T12:00:00");
                    return (
                      <div
                        key={day.day_index}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          height: 44, borderRadius: 12, background: "#f3f4f6",
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          {DAY_SHORT[day.day_index]}
                        </span>
                        <span style={{ fontSize: 11, color: "#9ca3af" }}>
                          {date.getDate()} {date.toLocaleDateString("fr-FR", { month: "short" })}
                        </span>
                      </div>
                    );
                  })}

                  {/* Lignes par repas */}
                  {activeMealsOrdered.map((mealType) => (
                    <React.Fragment key={`row-${mealType}`}>
                      {/* Label ligne */}
                      <div
                        key={`lbl-${mealType}`}
                        style={{
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                          borderRadius: 12, background: "#f9fafb", border: "1px solid #f3f4f6",
                          padding: "10px 6px", textAlign: "center",
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{MEAL_ICONS[mealType]}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#4b5563", marginTop: 4, lineHeight: 1.2 }}>
                          {MEAL_LABELS[mealType]}
                        </span>
                      </div>

                      {/* Cellules */}
                      {plan.days.map((day) => {
                        const meal = day.meals.find((m) => m.meal_type === mealType);
                        const key = slotKey(day.day_index, mealType);
                        return (
                          <div key={`${day.day_index}-${mealType}`}>
                            {meal ? (
                              <SlotCard
                                meal={meal}
                                isLocked={lockedSlots.has(key)}
                                isRegenerating={regeneratingSlot === key}
                                onRegenerate={() => regenerateSlot(day.day_index, mealType)}
                                onToggleLock={() => toggleLock(day.day_index, mealType)}
                                onPickRecipe={() =>
                                  setPickerTarget({ dayIndex: day.day_index, mealType })
                                }
                                onDuplicateBatch={() =>
                                  setDuplicatorTarget({ dayIndex: day.day_index, mealType })
                                }
                                onDelete={() => {
                                  if (window.confirm("Supprimer ce repas ?")) {
                                    deleteSlot(day.day_index, mealType);
                                  }
                                }}
                                onViewRecipe={() => {
                                  const rid = meal.recipe_id;
                                  if (Number.isFinite(rid) && rid > 0) {
                                    if (plan && menuId) {
                                      savePlanifierDraft({
                                        plan: plan as unknown as StoredPlannedWeek,
                                        menuId,
                                        weekStart,
                                        lockedSlots: [...lockedSlots],
                                      });
                                    }
                                    router.push(
                                      `/recette/${rid}?from=${encodeURIComponent(planifierEditHref(menuId))}`
                                    );
                                  }
                                }}
                                batchColor={
                                  meal.batch_group_id
                                    ? batchMeta.colors.get(meal.batch_group_id)
                                    : undefined
                                }
                                batchOriginDayLabel={
                                  meal.batch_group_id && meal.is_batch_origin === false
                                    ? DAY_SHORT[
                                        batchMeta.originDayIndex.get(meal.batch_group_id) ?? 0
                                      ]
                                    : undefined
                                }
                              />
                            ) : (
                              <div
                                style={{
                                  minHeight: 130, borderRadius: 14,
                                  border: "1.5px dashed #e5e7eb", background: "#f9fafb",
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}
                              >
                                <span style={{ fontSize: 12, color: "#d1d5db" }}>—</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Barre d'actions globales */}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 20 }}>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>
                  {plan.meta.recipes_after_filters} recettes disponibles · Saison : {plan.meta.season}
                </span>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={generate}
                    disabled={isGenerating}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "9px 18px",
                      background: "#fff", border: "1px solid #e5e7eb",
                      color: "#374151", borderRadius: 12, cursor: "pointer",
                      fontWeight: 600, fontSize: 13,
                    }}
                  >
                    ↺ Tout régénérer
                  </button>
                  {menuId && (
                    <button
                      onClick={() => router.push(`/menus/${menuId}`)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "9px 18px",
                        background: "var(--accent, #6366f1)", color: "#fff",
                        border: "none", borderRadius: 12, cursor: "pointer",
                        fontWeight: 700, fontSize: 13,
                        boxShadow: "0 2px 6px rgba(99,102,241,.3)",
                      }}
                    >
                      ✓ Valider ce menu
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modales actions slot ──────────────────────────────────── */}
      {pickerTarget && plan && (
        <RecipePickerModal
          mealType={pickerTarget.mealType}
          excludeRecipeIds={plan.days.flatMap((d) => d.meals.map((m) => m.recipe_id)).filter(Number.isFinite)}
          onPick={(recipe) => {
            applyPickedRecipe(pickerTarget.dayIndex, pickerTarget.mealType, recipe);
            setPickerTarget(null);
          }}
          onClose={() => setPickerTarget(null)}
        />
      )}

      {duplicatorTarget && plan && (
        <BatchDuplicatorModal
          plan={plan}
          dayIndex={duplicatorTarget.dayIndex}
          mealType={duplicatorTarget.mealType}
          lockedSlots={lockedSlots}
          onApply={(targets) => {
            applyManualBatch(duplicatorTarget.dayIndex, duplicatorTarget.mealType, targets);
            setDuplicatorTarget(null);
          }}
          onClose={() => setDuplicatorTarget(null)}
        />
      )}
    </>
  );
}
