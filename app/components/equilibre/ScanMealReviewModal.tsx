"use client";

import { MealIngredientsEditor } from "./MealIngredientsEditor";

export type ScanMealAdvice = {
  rating: string;
  message: string;
  suggestions?: string[];
};

type ScanMealReviewModalProps = {
  mealName?: string;
  ingredients: string[];
  onIngredientsChange: (ingredients: string[]) => void;
  advice?: ScanMealAdvice;
  saving?: boolean;
  onSave: () => void;
  onCancel: () => void;
};

/** Validation / correction des aliments détectés par scan photo. */
export function ScanMealReviewModal({
  mealName,
  ingredients,
  onIngredientsChange,
  advice,
  saving = false,
  onSave,
  onCancel,
}: ScanMealReviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#6B2E2E]/70 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-[#FFF0F0] p-5 shadow-xl">
        <h3 className="mb-1 text-lg font-bold text-[#6B2E2E]">
          {mealName ? `« ${mealName} »` : "Aliments repérés"}
        </h3>
        <p className="mb-3 text-xs text-[#726566]">
          Corrige ou retire les aliments détectés, puis ajoute ceux que l&apos;IA n&apos;a pas vus.
        </p>

        <MealIngredientsEditor
          ingredients={ingredients}
          onChange={onIngredientsChange}
        />

        {advice?.message ? (
          <p className="mb-4 mt-4 rounded-lg bg-white/60 p-2 text-xs text-[#726566]">{advice.message}</p>
        ) : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[var(--beige-border)] bg-white px-4 py-2 text-sm font-semibold text-[#726566]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || ingredients.length === 0}
            className="flex-1 rounded-xl bg-[#E94E77] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer le repas"}
          </button>
        </div>
      </div>
    </div>
  );
}
