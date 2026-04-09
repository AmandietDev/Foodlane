"use client";

import { useMemo, useState } from "react";
import type { PlannerPreferences } from "../src/lib/weeklyPlanner";
import {
  BREAKFAST_PREFERENCE_OPTIONS,
  COOKING_SKILL_OPTIONS,
  COOKING_TIME_OPTIONS,
  DIETARY_FILTER_OPTIONS,
  EQUIPMENT_OPTIONS,
  MEAL_STRUCTURE_OPTIONS,
  MEAL_TYPE_OPTIONS,
  OBJECTIVE_OPTIONS,
} from "../src/lib/plannerConstants";

type Props = {
  initial: PlannerPreferences;
  submitLabel: string;
  onSubmit: (payload: {
    preferences: PlannerPreferences;
    equipment_keys: string[];
    allergy_keys: string[];
    excluded_ingredients: string[];
  }) => Promise<void>;
};

export default function PlannerProfileForm({ initial, submitLabel, onSubmit }: Props) {
  const [cooking_time_preference, setCooking] = useState(initial.cooking_time_preference);
  const [household_size, setHousehold] = useState(initial.household_size);
  const [adults_count, setAdults] = useState(initial.adults_count);
  const [children_count, setChildren] = useState(initial.children_count);
  const [planning_days, setPlanningDays] = useState(initial.planning_days);
  const [meal_types, setMealTypes] = useState<string[]>(initial.meal_types);
  const [meal_structure, setMealStructure] = useState(initial.meal_structure);
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
        setError("Décris ton objectif en quelques mots, ou choisis une autre option.");
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
  const chipOn = "bg-[#6B2E2E] text-white border-[#6B2E2E]";
  const chipOff = "bg-white text-[#5c3d3d] border-[#E8A0A0] hover:border-[#6B2E2E]";

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto pb-24">
      {error && (
        <div className="rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm border border-red-200">
          {error}
        </div>
      )}

      <section className="rounded-2xl bg-white border border-[#E8A0A0] p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-[#4a2c2c]">Équipements disponibles</h2>
        <p className="text-sm text-[#7a5a5a]">On n’affichera pas de recettes impossibles à réaliser.</p>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_OPTIONS.map((eq) => (
            <button
              key={eq.key}
              type="button"
              className={`${chip} ${equipment_keys.includes(eq.key) ? chipOn : chipOff}`}
              onClick={() => toggle(equipment_keys, eq.key, setEquipment)}
            >
              {eq.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-[#E8A0A0] p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-[#4a2c2c]">Temps de cuisine souhaité</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {COOKING_TIME_OPTIONS.map((o) => (
            <label
              key={o.key}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 cursor-pointer ${
                cooking_time_preference === o.key ? "border-[#6B2E2E] bg-[#FFF5F5]" : "border-[#E8D5D5]"
              }`}
            >
              <input
                type="radio"
                name="ct"
                checked={cooking_time_preference === o.key}
                onChange={() => setCooking(o.key)}
              />
              <span className="text-sm">{o.label}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-[#E8A0A0] p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-[#4a2c2c]">Niveau en cuisine</h2>
        <div className="flex flex-wrap gap-2">
          {COOKING_SKILL_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`${chip} ${cooking_skill_level === o.key ? chipOn : chipOff}`}
              onClick={() => setCookingSkill(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-[#E8A0A0] p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-[#4a2c2c]">Objectifs d’utilisation</h2>
        <p className="text-sm text-[#7a5a5a]">
          « Autre » est exclusif : il désélectionne les autres options (et inversement).
        </p>
        <div className="flex flex-wrap gap-2">
          {OBJECTIVE_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`${chip} ${objectives.includes(o.key) ? chipOn : chipOff}`}
              onClick={() => toggleObjective(o.key)}
            >
              {o.label}
            </button>
          ))}
        </div>
        {objectives.includes("autre") && (
          <div>
            <label className="block text-sm font-medium text-[#5c3d3d] mb-1">
              Décris ton objectif en quelques mots…
            </label>
            <textarea
              className="w-full rounded-xl border border-[#E8D5D5] px-3 py-2 text-sm min-h-[80px]"
              placeholder="Ex. : mieux gérer mes repas post-grossesse…"
              maxLength={150}
              value={customGoalText}
              onChange={(e) => setCustomGoalText(e.target.value.slice(0, 150))}
            />
            <p className="text-xs text-[#9a7a7a] mt-1 text-right">{customGoalText.length}/150</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white border border-[#E8A0A0] p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-[#4a2c2c]">Contraintes alimentaires</h2>
        <div className="flex flex-wrap gap-2">
          {DIETARY_FILTER_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              className={`${chip} ${dietary_filters.includes(o.key) ? chipOn : chipOff}`}
              onClick={() => toggle(dietary_filters, o.key, setDietary)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <div>
          <label className="block text-sm font-medium text-[#5c3d3d] mb-1">
            Autres (texte libre : cuisines préférées, contraintes spécifiques…)
          </label>
          <input
            className="w-full rounded-xl border border-[#E8D5D5] px-3 py-2 text-sm"
            value={world_cuisines}
            onChange={(e) => setWorld(e.target.value)}
            placeholder="ex: cuisine italienne, pas de coriandre, végétarien le week-end"
          />
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-[#E8A0A0] p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-[#4a2c2c]">Allergies &amp; exclusions</h2>
        <p className="text-sm text-[#7a5a5a]">
          Liste libre (séparateurs : virgule ou point-virgule). Appliqué comme contrainte stricte.
        </p>
        <textarea
          className="w-full rounded-xl border border-[#E8D5D5] px-3 py-2 text-sm min-h-[72px]"
          placeholder="Allergies : ex. céleri, moutarde"
          value={allergiesText}
          onChange={(e) => setAllergiesText(e.target.value)}
        />
        <textarea
          className="w-full rounded-xl border border-[#E8D5D5] px-3 py-2 text-sm min-h-[72px]"
          placeholder="Aliments à éviter / détestés"
          value={excludedText}
          onChange={(e) => setExcludedText(e.target.value)}
        />
      </section>

      <section className="rounded-2xl bg-white border border-[#E8A0A0] p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-[#4a2c2c]">Composition du foyer</h2>
        <div className="grid grid-cols-3 gap-3">
          <label className="text-sm">
            <span className="block text-[#7a5a5a] mb-1">Personnes</span>
            <input
              type="number"
              min={1}
              className="w-full rounded-xl border border-[#E8D5D5] px-2 py-2"
              value={household_size}
              onChange={(e) => setHousehold(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            <span className="block text-[#7a5a5a] mb-1">Adultes</span>
            <input
              type="number"
              min={0}
              className="w-full rounded-xl border border-[#E8D5D5] px-2 py-2"
              value={adults_count}
              onChange={(e) => setAdults(Number(e.target.value))}
            />
          </label>
          <label className="text-sm">
            <span className="block text-[#7a5a5a] mb-1">Enfants</span>
            <input
              type="number"
              min={0}
              className="w-full rounded-xl border border-[#E8D5D5] px-2 py-2"
              value={children_count}
              onChange={(e) => setChildren(Number(e.target.value))}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl bg-white border border-[#E8A0A0] p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-[#4a2c2c]">Organisation des repas</h2>
        <div>
          <span className="block text-sm text-[#7a5a5a] mb-2">Jours à planifier (1–14)</span>
          <input
            type="number"
            min={1}
            max={14}
            className="w-28 rounded-xl border border-[#E8D5D5] px-2 py-2"
            value={planning_days}
            onChange={(e) => setPlanningDays(Number(e.target.value))}
          />
        </div>
        <div>
          <span className="block text-sm text-[#7a5a5a] mb-2">Repas concernés</span>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPE_OPTIONS.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`${chip} ${meal_types.includes(m.key) ? chipOn : chipOff}`}
                onClick={() => toggle(meal_types, m.key, setMealTypes)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm text-[#7a5a5a] mb-2">Structure des repas (info pour évolutions)</label>
          <select
            className="w-full rounded-xl border border-[#E8D5D5] px-3 py-2 text-sm"
            value={meal_structure}
            onChange={(e) => setMealStructure(e.target.value as typeof meal_structure)}
          >
            {MEAL_STRUCTURE_OPTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={seasonal_preference}
            onChange={(e) => setSeasonal(e.target.checked)}
          />
          Privilégier les recettes de saison
        </label>

        {meal_types.includes("breakfast") && (
          <div>
            <span className="block text-sm text-[#7a5a5a] mb-2">Petit-déjeuner préféré</span>
            <div className="flex flex-wrap gap-2">
              {BREAKFAST_PREFERENCE_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  className={`${chip} ${breakfast_preference === o.key ? chipOn : chipOff}`}
                  onClick={() => setBreakfastPref(o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white border border-[#E8A0A0] p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-[#4a2c2c]">Allergies & exclusions</h2>
        <p className="text-sm text-[#7a5a5a]">
          Liste libre (séparateurs : virgule ou point-virgule). Appliqué comme contrainte stricte.
        </p>
        <textarea
          className="w-full rounded-xl border border-[#E8D5D5] px-3 py-2 text-sm min-h-[72px]"
          placeholder="Allergies : ex. céleri, moutarde"
          value={allergiesText}
          onChange={(e) => setAllergiesText(e.target.value)}
        />
        <textarea
          className="w-full rounded-xl border border-[#E8D5D5] px-3 py-2 text-sm min-h-[72px]"
          placeholder="Aliments à éviter / détestés"
          value={excludedText}
          onChange={(e) => setExcludedText(e.target.value)}
        />
      </section>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-2xl bg-[#6B2E2E] text-white font-semibold py-3.5 shadow-md disabled:opacity-60"
      >
        {saving ? "Enregistrement…" : submitLabel}
      </button>
    </form>
  );
}
