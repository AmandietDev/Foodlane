"use client";

import { useCallback } from "react";
import {
  formatGroceryStoreLine,
  groceryCategoryLabel,
  mapLegacyGroceryCategory,
  sanitizeGroceryIngredientName,
  sortCategoriesForDisplay,
  type GroceryCategorySlug,
} from "../src/lib/groceryFormat";
import type { Locale } from "../src/lib/i18n";
import { sessionAuthHeaders } from "../src/lib/plannerClient";
import { inferGroceryCategory } from "../src/lib/weeklyPlanner";

export type GroceryExportItem = {
  id: string;
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  category: string;
  checked: boolean;
};

function groupByCategory(items: GroceryExportItem[]): Map<GroceryCategorySlug, GroceryExportItem[]> {
  const m = new Map<GroceryCategorySlug, GroceryExportItem[]>();
  for (const it of items) {
    if (!sanitizeGroceryIngredientName(it.ingredient_name).trim()) continue;
    const slug = mapLegacyGroceryCategory(inferGroceryCategory(it.ingredient_name));
    if (!m.has(slug)) m.set(slug, []);
    m.get(slug)!.push(it);
  }
  return m;
}

function sortLocaleTag(locale: Locale): string {
  if (locale === "fr") return "fr";
  if (locale === "de") return "de";
  return "en";
}

function buildPlainText(menuTitle: string, items: GroceryExportItem[], locale: Locale): string {
  if (items.length === 0) return `${menuTitle}\n\n(liste vide)`;
  const grouped = groupByCategory(items);
  const cats = sortCategoriesForDisplay([...grouped.keys()]);
  const lines: string[] = [`Liste de courses — ${menuTitle}`, ""];
  const loc = sortLocaleTag(locale);
  for (const c of cats) {
    const list = (grouped.get(c) || []).slice().sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name, loc));
    if (!list.length) continue;
    lines.push(groceryCategoryLabel(c, locale));
    for (const it of list) {
      const line = formatGroceryStoreLine(
        it.ingredient_name,
        it.quantity,
        it.unit,
        locale,
        mapLegacyGroceryCategory(inferGroceryCategory(it.ingredient_name))
      );
      lines.push(`${it.checked ? "☑ " : "☐ "}${line}`);
    }
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

function sanitizeFilename(title: string): string {
  return title.replace(/[^\w\u00C0-\u024F-]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "menu";
}

function fallbackDownloadPng(blob: Blob, menuTitle: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `courses-${sanitizeFilename(menuTitle)}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderPngAndSave(menuTitle: string, items: GroceryExportItem[], locale: Locale) {
  const grouped = groupByCategory(items);
  const cats = sortCategoriesForDisplay([...grouped.keys()]);
  const pad = 36;
  const lineH = 26;
  const w = 680;
  const blocks: { title: string; lines: string[] }[] = [];
  const loc = sortLocaleTag(locale);
  for (const c of cats) {
    const list = (grouped.get(c) || []).slice().sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name, loc));
    if (!list.length) continue;
    const lines = list.map((it) => {
      const line = formatGroceryStoreLine(
        it.ingredient_name,
        it.quantity,
        it.unit,
        locale,
        mapLegacyGroceryCategory(inferGroceryCategory(it.ingredient_name))
      );
      return `${it.checked ? "☑ " : "☐ "}${line}`;
    });
    blocks.push({ title: groceryCategoryLabel(c, locale), lines });
  }
  let h = pad + 44;
  for (const b of blocks) {
    h += 28 + b.lines.length * lineH + 14;
  }
  h += pad;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#4a2c2c";
  ctx.font = "bold 20px system-ui, -apple-system, Segoe UI, sans-serif";
  const head = `Courses — ${menuTitle.slice(0, 72)}`;
  ctx.fillText(head, pad, pad + 18);
  let y = pad + 48;
  for (const b of blocks) {
    ctx.fillStyle = "#6B2E2E";
    ctx.font = "bold 15px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(b.title, pad, y);
    y += 24;
    ctx.fillStyle = "#333333";
    ctx.font = "14px system-ui, -apple-system, Segoe UI, sans-serif";
    for (const line of b.lines) {
      ctx.fillText(line.length > 52 ? `${line.slice(0, 49)}…` : line, pad + 4, y);
      y += lineH;
    }
    y += 12;
  }

  canvas.toBlob(
    (blob) => {
      if (!blob) return;

      const file = new File([blob], `courses-${sanitizeFilename(menuTitle)}.png`, {
        type: "image/png",
      });
      if (
        typeof navigator !== "undefined" &&
        navigator.share &&
        navigator.canShare?.({ files: [file] })
      ) {
        navigator
          .share({
            files: [file],
            title: menuTitle,
            text: "Liste de courses",
          })
          .catch(() => fallbackDownloadPng(blob, menuTitle));
        return;
      }
      fallbackDownloadPng(blob, menuTitle);
    },
    "image/png",
    1
  );
}

export default function GroceryExportBar({
  menuTitle,
  items,
  locale = "fr",
}: {
  menuTitle: string;
  items: GroceryExportItem[];
  locale?: Locale;
}) {
  const plain = useCallback(() => buildPlainText(menuTitle, items, locale), [menuTitle, items, locale]);

  async function reserveGroceryExport(): Promise<boolean> {
    const auth = await sessionAuthHeaders();
    const res = await fetch("/api/usage/grocery-export", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...auth },
    });
    if (res.ok) return true;
    let msg = "Quota d’export atteint pour cette semaine.";
    try {
      const j = (await res.json()) as { message?: string };
      if (typeof j.message === "string" && j.message.trim()) msg = j.message;
    } catch {
      /* ignore */
    }
    alert(msg);
    return false;
  }

  async function shareNote() {
    if (!(await reserveGroceryExport())) return;
    const text = plain();
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: `Courses — ${menuTitle}`, text });
        return;
      }
    } catch {
      /* annulé ou indisponible */
    }
    try {
      await navigator.clipboard.writeText(text);
      alert("Liste copiée dans le presse-papiers.");
    } catch {
      alert("Impossible de partager ou de copier sur cet appareil.");
    }
  }

  async function printPdf() {
    if (!(await reserveGroceryExport())) return;
    window.print();
  }

  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4 print:hidden">
      <button
        type="button"
        onClick={() => shareNote()}
        className="rounded-full px-4 py-2 text-sm font-medium bg-[#6B2E2E] text-white shadow-sm"
      >
        Partager / note
      </button>
      <button
        type="button"
        onClick={printPdf}
        className="rounded-full px-4 py-2 text-sm font-medium border border-[#6B2E2E] text-[#6B2E2E] bg-white"
      >
        PDF (impression)
      </button>
      <button
        type="button"
        onClick={async () => {
          if (!(await reserveGroceryExport())) return;
          renderPngAndSave(menuTitle, items, locale);
        }}
        className="rounded-full px-4 py-2 text-sm font-medium border border-[#6B2E2E] text-[#6B2E2E] bg-white"
      >
        Image (PNG)
      </button>
    </div>
  );
}
