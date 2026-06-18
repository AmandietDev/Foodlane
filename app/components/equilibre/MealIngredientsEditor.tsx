"use client";

import { useState } from "react";

type MealIngredientsEditorProps = {
  ingredients: string[];
  onChange: (ingredients: string[]) => void;
  placeholder?: string;
  detectedClassName?: string;
};

/** Liste éditable d'aliments (scan IA ou correction manuelle). */
export function MealIngredientsEditor({
  ingredients,
  onChange,
  placeholder = "Ex. crème fraîche, parmesan…",
  detectedClassName = "bg-[#FFD9D9] text-[#6B2E2E]",
}: MealIngredientsEditorProps) {
  const [input, setInput] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const removeAt = (idx: number) => {
    onChange(ingredients.filter((_, i) => i !== idx));
    if (editingIndex === idx) {
      setEditingIndex(null);
      setEditValue("");
    }
  };

  const commitEdit = (idx: number) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      removeAt(idx);
    } else {
      const next = [...ingredients];
      next[idx] = trimmed;
      onChange(next);
    }
    setEditingIndex(null);
    setEditValue("");
  };

  const addIngredient = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onChange([...ingredients, trimmed]);
    setInput("");
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {ingredients.map((name, idx) =>
          editingIndex === idx ? (
            <input
              key={`edit-${idx}`}
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => commitEdit(idx)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitEdit(idx);
                }
                if (e.key === "Escape") {
                  setEditingIndex(null);
                  setEditValue("");
                }
              }}
              className="min-w-[7rem] rounded-full border border-[#E94E77] bg-white px-2.5 py-1 text-sm text-[#3E2A2A] outline-none"
            />
          ) : (
            <span
              key={`${name}-${idx}`}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm ${detectedClassName}`}
            >
              <button
                type="button"
                onClick={() => {
                  setEditingIndex(idx);
                  setEditValue(name);
                }}
                className="text-left hover:underline"
                title="Modifier"
              >
                {name}
              </button>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="flex h-4 w-4 items-center justify-center rounded-full text-xs hover:bg-black/10"
                title="Retirer"
                aria-label={`Retirer ${name}`}
              >
                ×
              </button>
            </span>
          )
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addIngredient();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-[var(--beige-border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
        />
        <button
          type="button"
          onClick={addIngredient}
          disabled={!input.trim()}
          className="rounded-xl bg-[#E94E77] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>
  );
}
