"use client";

import { useMemo, useState } from "react";
import type { PlannerPreferences } from "../src/lib/weeklyPlanner";
import {
  BREAKFAST_PREFERENCE_OPTIONS,
  COOKING_SKILL_OPTIONS,
  COOKING_TIME_OPTIONS,
  DIETARY_FILTER_OPTIONS,
  EQUIPMENT_OPTIONS,
  MEAL_TYPE_OPTIONS,
  OBJECTIVE_OPTIONS,
} from "../src/lib/plannerConstants";
import { useTranslation } from "./TranslationProvider";

type Props = {
  initial: PlannerPreferences;
  submitLabel: string;
  /** Même charte que l’onglet Foyer du menu (cartes beige). */
  visualVariant?: "default" | "foyer";
  onSubmit: (payload: {
    preferences: PlannerPreferences;
    equipment_keys: string[];
    allergy_keys: string[];
    excluded_ingredients: string[];
  }) => Promise<void>;
};

export default function PlannerProfileForm({
  initial,
  submitLabel,
  onSubmit,
  visualVariant = "default",
}: Props) {
  const { t } = useTranslation();
  const [cooking_time_preference, setCooking] = useState(initial.cooking_time_preference);
  const [household_size, setHousehold] = useState(initial.household_size);
  const [recipe_scaling_portions, setRecipeScalingPortions] = useState<number | null>(
    initial.recipe_scaling_portions ?? null
  );
  const [adults_count, setAdults] = useState(initial.adults_count);
  const [children_count, setChildren] = useState(initial.children_count);
  const [planning_days, setPlanningDays] = useState(initial.planning_days);
  const [meal_types, setMealTypes] = useState<string[]>(initial.meal_types);
  // Structure de repas figée à la valeur initiale (toujours "plat_seul" en pratique).
  const [meal_structure] = useState(initial.meal_structure);
  const [objectives, setObjectives] = useState<string[]>(initial.objectives);
  const [customGoalText, setCustomGoalText] = useState(
    () => initial.custom_goal?.trim() || ""
  );
  const [cooking_skill_level, setCookingSkill] = useState(initial.cooking_skill_level);
  const [dietary_filters, setDietary] = useState<string[]>(initial.dietary_filters);
  const [world_cuisines, setWorld] = useState(initial.world_cuisines.join(", "));
  const [seasonal_preference, setSeasonal] = useState(initial.seasonal_preference);
  const [breakfast_preference, setBreakfastPref] = useState(initial.breakfast_preference);
  const [equipment_keys, setEquipment] = useState<string[]>(initial.equipment_keys);
  const [allergiesText, setAllergiesText] = useState(initial.allergy_keys.join(", "));
  const [excludedText, setExcludedText] = useState(initial.excluded_ingredients.join(", "));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allergy_keys = useMemo(
    () =>
      allergiesText
        .split(/[,;\n]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    [allergiesText]
  );

  const excluded_ingredients = useMemo(
    () =>
      excludedText
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    [excludedText]
  );

  function toggle<T extends string>(arr: T[], v: T, set: (x: T[]) => void) {
    if (arr.includes(v)) set(arr.filter((x) => x !== v));
    else set([...arr, v]);
  }

  function toggleObjective(key: string) {
    if (key === "autre") {
      setObjectives(["autre"]);
      return;
    }
    setObjectives((prev) => {
      const base = prev.filter((x) => x !== "autre");
      if (base.includes(key)) return base.filter((x) => x !== key);
      return [...base, key];
    });
    setCustomGoalText("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const customTrim = customGoalText.trim().slice(0, 150);
      if (objectives.includes("autre") && !customTrim) {
        setError(t("planner.err.custom_goal"));
        return;
      }

      const objectivesFinal = objectives.includes("autre")
        ? (["autre"] as string[])
        : objectives.length
          ? objectives.filter((x) => x !== "autre")
          : ["mieux_manger"];

      const preferences: PlannerPreferences = {
        cooking_time_preference,
        cooking_skill_level,
        household_size: Math.max(1, household_size),
        recipe_scaling_portions:
          Math.max(1, household_size) === 5 ? recipe_scaling_portions : null,
        adults_count: Math.max(0, adults_count),
        children_count: Math.max(0, children_count),
        planning_days: Math.min(14, Math.max(1, planning_days)),
        meal_types: meal_types.length ? (meal_types as PlannerPreferences["meal_types"]) : ["lunch", "dinner"],
        meal_structure,
        objectives: objectivesFinal,
        custom_goal: objectives.includes("autre") ? customTrim : null,
        dietary_filters: dietary_filters as PlannerPreferences["dietary_filters"],
        world_cuisines: world_cuisines
          .split(/[,]+/)
          .map((s) => s.trim())
          .filter(Boolean),
        seasonal_preference,
        breakfast_preference: breakfast_preference as PlannerPreferences["breakfast_preference"],
        equipment_keys,
        allergy_keys,
        excluded_ingredients,
      };
      await onSubmit({ preferences, equipment_keys, allergy_keys, excluded_ingredients });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const chip =
    "rounded-full px-3 py-1.5 text-sm border transition-colors cursor-pointer select-none";
  const chipOn =
    visualVariant === "foyer"
      ? "bg-[var(--beige-accent)] text-white border-[var(--beige-accent)]"
      : "bg-[#6B2E2E] text-white border-[#6B2E2E]";
  const chipOff =
    visualVariant === "foyer"
      ? "bg-white text-[#2A2523] border-[var(--beige-border)] hover:border-[var(--beige-accent)]"
      : "bg-white text-[#5c3d3d] border-[#E8A0A0] hover:border-[#6B2E2E]";

  const sectionClass =
    visualVariant === "foyer"
      ? "rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4 space-y-3"
      : "rounded-2xl bg-white border border-[#E8A0A0] p-5 shadow-sm space-y-3";

  const titleClass =
    visualVariant === "foyer"
      ? "text-lg font-semibold text-[var(--foreground)]"
      : "text-lg font-semibold text-[#4a2c2c]";

  const mutedClass =
    visualVariant === "foyer" ? "text-sm text-[var(--text-secondary)]" : "text-sm text-[#7a5a5a]";

  const inputClass =
    visualVariant === "foyer"
      ? "w-full rounded-lg border border-[var(--beige-border)] bg-white px-3 py-2 text-[var(--foreground)]"
      : "w-full rounded-xl border border-[#E8D5D5] px-3 py-2 text-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto pb-24">
      {error && (
        <div className="rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm border border-red-200">
          {error}
        </div>
      )}

      <section className={sectionClass}>
        <h2 className={titleClass}>{t("planner.section.equipment")}</h2>
        <p className={mutedClass}>{t("planner.section.equipment_desc")}</p>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((eq) => (
            <button
              key={eq.key}
              type="button"
              className={`${chip} ${equipment_keys.includes(eq.key) ? chipOn : chipOff}`}
              onClick={() => toggle(equipment_keys, eq.key, setEquipment)}
            >
              {t(`planner.eq.${eq.key}`)}
            </button>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={titleClass}>{t("planner.section.cooking_time")}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {COOKING_TIME_OPTIONS.map((o) => (
            <label
              key={o.key}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer ${
                cooking_time_preference === o.key
                  ? visualVariant === "foyer"
                    ? "border-[var(--beige-accent)] bg-[var(--beige-rose-light)]"
                    : "border-[#6B2E2E] bg-[#FFF5F5]"
                  : visualVariant === "foyer"
                    ? "border-[var(--beige-border)] bg-white"
                    : "border-[#E8D5D5]"
              }`}
            >
              <input
                type="radio"
                name="ct"
                checked={cooking_time_preference === o.key}
                onChange={() => setCooking(o.key)}
              />
              <span className="text-sm">{t(`planner.ct.${o.key}`)}</span>
            </label>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={titleClass}>{t("planner.section.skill")}</h2>
        <div className="flex flex-wrap gap-2">
          {COOKING_SKILL_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`${chip} ${cooking_skill_level === o.key ? chipOn : chipOff}`}
              onClick={() => setCookingSkill(o.key)}
            >
              {t(`planner.sk.${o.key}`)}
            </button>
          ))}
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={titleClass}>{t("planner.section.objectives")}</h2>
        <p className={mutedClass}>{t("planner.section.objectives_hint")}</p>
        <div className="flex flex-wrap gap-2">
          {OBJECTIVE_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`${chip} ${objectives.includes(o.key) ? chipOn : chipOff}`}
              onClick={() => toggleObjective(o.key)}
            >
              {t(`planner.obj.${o.key}`)}
            </button>
          ))}
        </div>
        {objectives.includes("autre") && (
          <div>
            <label className={`block text-sm font-medium mb-1 ${visualVariant === "foyer" ? "text-[var(--foreground)]" : "text-[#5c3d3d]"}`}>
              {t("planner.section.custom_goal")}
            </label>
            <textarea
              className={`${inputClass} min-h-[80px]`}
              placeholder={t("planner.section.custom_goal_ph")}
              maxLength={150}
              value={customGoalText}
              onChange={(e) => setCustomGoalText(e.target.value.slice(0, 150))}
            />
            <p className="text-xs text-[#9a7a7a] mt-1 text-right">{customGoalText.length}/150</p>
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={titleClass}>{t("planner.section.dietary")}</h2>
        <div className="flex flex-wrap gap-2">
          {DIETARY_FILTER_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`${chip} ${dietary_filters.includes(o.key) ? chipOn : chipOff}`}
              onClick={() => toggle(dietary_filters, o.key, setDietary)}
            >
              {t(`planner.diet.${o.key}`)}
            </button>
          ))}
        </div>
        <div>
          <label className={`block text-sm font-medium mb-1 ${visualVariant === "foyer" ? "text-[var(--foreground)]" : "text-[#5c3d3d]"}`}>
            {t("planner.section.dietary_other")}
          </label>
          <input
            className={inputClass}
            value={world_cuisines}
            onChange={(e) => setWorld(e.target.value)}
            placeholder={t("planner.section.dietary_other_ph")}
          />
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={titleClass}>{t("planner.section.allergies")}</h2>
        <p className={mutedClass}>{t("planner.section.allergies_desc")}</p>
        <textarea
          className={`${inputClass} min-h-[72px]`}
          placeholder={t("planner.section.allergies_ph1")}
          value={allergiesText}
          onChange={(e) => setAllergiesText(e.target.value)}
        />
        <textarea
          className={`${inputClass} min-h-[72px]`}
          placeholder={t("planner.section.allergies_ph2")}
          value={excludedText}
          onChange={(e) => setExcludedText(e.target.value)}
        />
      </section>

      <section className={sectionClass}>
        <h2 className={titleClass}>{t("planner.section.household")}</h2>
        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm">
            <span className={`block mb-1 ${visualVariant === "foyer" ? "text-[var(--foreground)] font-medium" : "text-[#7a5a5a]"}`}>
              {t("planner.field.people")}
            </span>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={household_size}
              onChange={(e) => {
                const n = Math.max(1, Number(e.target.value) || 1);
                setHousehold(n);
                if (n !== 5) setRecipeScalingPortions(null);
              }}
            />
          </label>
          <label className="text-sm">
            <span className={`block mb-1 ${visualVariant === "foyer" ? "text-[var(--foreground)] font-medium" : "text-[#7a5a5a]"}`}>
              {t("planner.field.adults")}
            </span>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={adults_count}
              onChange={(e) => setAdults(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            <span className={`block mb-1 ${visualVariant === "foyer" ? "text-[var(--foreground)] font-medium" : "text-[#7a5a5a]"}`}>
              {t("planner.field.children")}
            </span>
            <input
              type="number"
              min={0}
              className={inputClass}
              value={children_count}
              onChange={(e) => setChildren(Number(e.target.value))}
            />
          </label>
        </div>
        {household_size === 5 && (
          <div>
            <span className={`block text-sm mb-2 ${visualVariant === "foyer" ? "text-[var(--foreground)] font-medium" : "text-[#7a5a5a]"}`}>
              {t("planner.field.portions5")}
            </span>
            <div className="flex flex-wrap gap-2">
              {([4, 5, 6] as const).map((n) => {
                const active = (recipe_scaling_portions ?? 5) === n;
                return (
                  <button
                    key={n}
                    type="button"
                    className={`${chip} ${active ? chipOn : chipOff}`}
                    onClick={() => setRecipeScalingPortions(n === 5 ? null : n)}
                  >
                    {n} {t("planner.field.pers_suffix")}
                  </button>
                );
              })}
            </div>
            <p className={`text-xs mt-1 ${mutedClass}`}>
              {t("planner.field.portions5_hint")}
            </p>
          </div>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className={titleClass}>{t("planner.section.meals")}</h2>
        <div>
          <span className={`block text-sm mb-2 ${mutedClass}`}>{t("planner.field.planning_days")}</span>
          <input
            type="number"
            min={1}
            max={14}
            className={`w-28 ${inputClass}`}
            value={planning_days}
            onChange={(e) => setPlanningDays(Number(e.target.value))}
          />
        </div>
        <div>
          <span className={`block text-sm mb-2 ${mutedClass}`}>{t("planner.field.meal_types")}</span>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPE_OPTIONS.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`${chip} ${meal_types.includes(m.key) ? chipOn : chipOff}`}
                onClick={() => toggle(meal_types, m.key, setMealTypes)}
              >
                {t(`planner.meal.${m.key}`)}
              </button>
            ))}
          </div>
        </div>
        {/* Structure des repas : volontairement masquée. Toujours "plat_seul". */}
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={seasonal_preference}
            onChange={(e) => setSeasonal(e.target.checked)}
          />
          {t("planner.field.seasonal")}
        </label>

        <div>
          <span className={`block text-sm mb-2 ${mutedClass}`}>
            {t("planner.field.breakfast_pref")}
          </span>
          <p className={`text-xs mb-2 ${mutedClass}`}>
            Utilisé pour tes petits-déjeuners lors de la génération de menus.
          </p>
          <div className="flex flex-wrap gap-2">
            {BREAKFAST_PREFERENCE_OPTIONS.map((o) => (
              <button
                key={o.key}
                type="button"
                className={`${chip} ${breakfast_preference === o.key ? chipOn : chipOff}`}
                onClick={() => setBreakfastPref(o.key)}
              >
                {t(`planner.bf.${o.key}`)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <button
        type="submit"
        disabled={saving}
        className={`w-full rounded-2xl text-white font-semibold py-3.5 shadow-md disabled:opacity-60 ${
          visualVariant === "foyer"
            ? "bg-[var(--beige-accent)] hover:bg-[var(--beige-accent-hover)]"
            : "bg-[#6B2E2E]"
        }`}
      >
        {saving ? t("planner.submit.saving") : submitLabel}
      </button>
    </form>
  );
}
