import type { Recipe } from "./recipes";
import { recipeDiversityTags } from "./recipeDiversity";

type ScoredRecipe = { r: Recipe; s: number };

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function recipeTokenSet(r: Recipe): Set<string> {
  const out = new Set<string>();
  const tags = recipeDiversityTags(r);
  tags.forEach((t) => out.add(`tag:${t}`));
  if (r.family) out.add(`family:${norm(r.family)}`);
  if (r.meal_subtype) out.add(`sub:${norm(r.meal_subtype)}`);
  if (r.cooking_method) out.add(`cook:${norm(r.cooking_method)}`);
  if (r.texture) out.add(`tex:${norm(r.texture)}`);
  const text = norm(`${r.nom_recette || ""} ${r.type || ""}`) || "";
  text
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .slice(0, 8)
    .forEach((w) => out.add(`w:${w}`));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) {
    if (b.has(x)) inter++;
  }
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * MMR simple (lexical/metadata) pour diversifier les candidats top score.
 */
export function rerankWithMMR(scored: ScoredRecipe[], lambda = 0.72): ScoredRecipe[] {
  if (scored.length <= 2) return scored;
  const capped = scored.slice(0, Math.min(220, scored.length));
  const tail = scored.slice(capped.length);

  const maxScore = Math.max(1, ...capped.map((x) => x.s));
  const tokenById = new Map<number, Set<string>>();
  for (const item of capped) tokenById.set(item.r.id, recipeTokenSet(item.r));

  const selected: ScoredRecipe[] = [];
  const remaining = [...capped];

  // point de départ = score max
  remaining.sort((a, b) => b.s - a.s);
  selected.push(remaining.shift()!);

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestValue = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const relevance = cand.s / maxScore;
      const candT = tokenById.get(cand.r.id) || new Set<string>();
      let maxSim = 0;
      for (const sel of selected) {
        const selT = tokenById.get(sel.r.id) || new Set<string>();
        maxSim = Math.max(maxSim, jaccard(candT, selT));
      }
      const mmr = lambda * relevance - (1 - lambda) * maxSim;
      if (mmr > bestValue) {
        bestValue = mmr;
        bestIdx = i;
      }
    }

    selected.push(remaining.splice(bestIdx, 1)[0]);
  }

  return [...selected, ...tail];
}
