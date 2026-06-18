"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Challenge, Tip } from "../../src/lib/dailyTips";
import {
  HYDRATION_BEVERAGES,
  MEAL_TYPES,
  MEAL_TYPE_ICONS,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_STYLES,
  formatHydrationEntry,
  formatWeekdayShortFr,
  getTodayISO,
  getWeekDayISOList,
  logEntryTypeLabel,
  mealSlotStatusLabel,
  buildLoggedMealsScoreContext,
  buildNutritionalQualityComment,
  uniqueLoggedMealTypes,
  type HydrationBeverage,
  type LogEntryType,
  type MealType,
} from "./dietDiaryUtils";

export interface DiaryFoodLogEntry {
  id: string;
  date: string;
  meal_type: LogEntryType;
  raw_text: string;
  parsed?: { items?: { name?: string }[] };
  confidence: number;
  hunger_before?: number;
  satiety_after?: number;
  created_at: string;
}

export interface DiaryDailySummary {
  score: number;
  strengths: string[];
  priority_tip: string;
  tip_options: string[];
  missing_components: string[];
  plan_for_tomorrow: Record<MealType, string[]>;
}

type DietitianNote = {
  title: string;
  intro: string;
  scopeLine: string;
  coverageWarning: string | null;
  highlights: string[];
  improvements: string[];
};

type WeeklyInsights = {
  patterns: Record<string, string>;
  one_action: string;
};

type DiaryScreen = "diary" | "analysis" | "challenge" | "week";

type DietDiaryDayViewProps = {
  selectedDate: string;
  isToday: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onSelectDate?: (iso: string) => void;
  meals: DiaryFoodLogEntry[];
  summary: DiaryDailySummary | null;
  dietitianNote: DietitianNote;
  defiDuJour: Challenge | null;
  conseilDuJour: Tip | null;
  weekMeals: DiaryFoodLogEntry[];
  weekMealsLoading: boolean;
  weeklyInsights: WeeklyInsights | null;
  onWeekOpen: () => void | Promise<void>;
  addingMeal: boolean;
  canUsePhotoScan: boolean;
  loadingScan: boolean;
  subscriptionTier: string | null;
  onAddMeal: (mealType: LogEntryType, rawText: string) => Promise<void>;
  onDeleteMeal: (id: string) => void;
  onEditMeal?: (entry: DiaryFoodLogEntry) => void;
  onAddFeeling: (id: string) => void;
  onPhotoScanClick: (mealType: MealType) => void;
};

function ScoreRing({ score }: { score: number | null }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const pct = score != null ? Math.max(0, Math.min(100, score)) : 0;
  const dash = (pct / 100) * c;

  return (
    <div className="relative h-[5.5rem] w-[5.5rem] shrink-0">
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="44" cy="44" r={r} fill="none" stroke="#FFE4E4" strokeWidth="7" />
        <circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="#E94E77"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
        <span className="text-lg font-bold leading-none text-[#6B2E2E]">
          {score != null ? score : "—"}
        </span>
        <span className="mt-0.5 text-[8px] leading-tight text-[#726566]">/ 100</span>
      </div>
    </div>
  );
}

function MascotProgressBar({ score }: { score: number | null }) {
  const progressPct = score != null ? Math.max(0, Math.min(100, score)) : 0;

  return (
    <div className="mt-5 border-t border-[#F0E6E8] pt-4 pb-1">
      <div
        className="relative h-11 px-3"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Score des repas saisis : ${score != null ? score : "non calculé"} sur 100`}
      >
        <div
          className="absolute left-3 right-3 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-[#FFE4E4]"
          aria-hidden
        />
        <div
          className="absolute left-3 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#E94E77] to-[#E94E77] transition-all duration-500 ease-out"
          style={{ width: `calc((100% - 1.5rem) * ${progressPct / 100})` }}
          aria-hidden
        />
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-[58%] transition-all duration-500 ease-out"
          style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${progressPct / 100})` }}
        >
          <Image
            src="/equilibre/assistant-raspberry-mascot.png"
            alt=""
            width={40}
            height={46}
            className="h-10 w-auto object-contain drop-shadow-[0_3px_8px_rgba(233,78,119,0.25)]"
            unoptimized
          />
        </div>
      </div>
    </div>
  );
}

function LoggedMealsScoreNotice({
  scopeLine,
  coverageWarning,
  compact = false,
}: {
  scopeLine: string;
  coverageWarning: string | null;
  compact?: boolean;
}) {
  if (!scopeLine && !coverageWarning) return null;

  return (
    <div
      className={`rounded-xl border border-[#F0E6E8] bg-[#FFF8F6] ${
        compact ? "px-3 py-2" : "px-3 py-2.5"
      }`}
      role="note"
    >
      {scopeLine ? (
        <p className={`font-medium text-[#6B2E2E] ${compact ? "text-[11px]" : "text-xs"}`}>
          {scopeLine}
        </p>
      ) : null}
      {coverageWarning ? (
        <p
          className={`leading-relaxed text-[#8A6F6F] ${
            scopeLine ? "mt-1" : ""
          } ${compact ? "text-[10px]" : "text-[11px]"}`}
        >
          {coverageWarning}
        </p>
      ) : null}
    </div>
  );
}

function DiarySummaryCard({
  score,
  summary,
  hasMealEntries,
  mealsAnalyzed,
  mealTypes,
}: {
  score: number | null;
  summary: DiaryDailySummary | null;
  hasMealEntries: boolean;
  mealsAnalyzed: number;
  mealTypes: MealType[];
}) {
  const scoreContext = buildLoggedMealsScoreContext(mealsAnalyzed, mealTypes, score);
  const qualityComment = buildNutritionalQualityComment(summary, hasMealEntries);
  const strengthHint =
    summary?.strengths && summary.strengths.length > 1 ? summary.strengths[1] : null;

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[#F0E6E8] bg-white p-4 shadow-[0_8px_32px_rgba(233,78,119,0.08)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9A8585]">
            Score des repas saisis
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-4xl font-bold leading-none text-[#6B2E2E]">
              {score != null ? score : "—"}
            </span>
            <span className="text-sm font-medium text-[#726566]">/100</span>
          </div>
          <p className="mt-1.5 text-xs font-semibold text-[#E94E77]">
            {scoreContext.balanceLabel}{" "}
            <span aria-hidden>♥</span>
          </p>
          {hasMealEntries ? (
            <div className="mt-2">
              <LoggedMealsScoreNotice
                scopeLine={scoreContext.scopeLine}
                coverageWarning={scoreContext.coverageWarning}
                compact
              />
            </div>
          ) : null}
          <p className="mt-2 text-xs leading-relaxed text-[#726566]">{qualityComment}</p>
          {strengthHint ? (
            <p className="mt-1 text-[11px] leading-relaxed text-[#9A8585]">+ {strengthHint}</p>
          ) : null}
        </div>
        <ScoreRing score={score} />
      </div>
      <MascotProgressBar score={score} />
    </section>
  );
}

function AssistantHero() {
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[#F0E6E8] bg-white p-4 shadow-[0_8px_32px_rgba(233,78,119,0.08)]">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="relative h-[6.75rem] w-[5.75rem] shrink-0 self-center sm:h-28 sm:w-24">
          <Image
            src="/equilibre/assistant-raspberry-mascot.png"
            alt=""
            width={96}
            height={112}
            className="h-full w-full object-contain object-bottom drop-shadow-[0_6px_16px_rgba(233,78,119,0.2)]"
            unoptimized
            priority
          />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[1.35rem] font-bold leading-tight tracking-tight text-[#6B2E2E] sm:text-2xl">
            Assistant diététicien
          </h1>
          <div className="mt-2.5 rounded-2xl rounded-tl-sm border border-[#F0E6E8] bg-[#FFF8F6] px-3.5 py-3">
            <p className="text-sm leading-relaxed text-[#5C4040]">
              <span className="font-semibold text-[#6B2E2E]">Bonjour !</span> Je suis là pour
              t&apos;aider à faire les meilleurs choix chaque jour.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function WeekNavBar({
  canGoPrev,
  canGoNext,
  onPrevDay,
  onNextDay,
  onOpenWeek,
}: {
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onOpenWeek: () => void;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-full border border-[#F5E8EB] bg-white p-1.5 shadow-[0_4px_20px_rgba(233,78,119,0.08)]"
      aria-label="Navigation journalière et accès à la semaine"
    >
      <button
        type="button"
        onClick={onPrevDay}
        disabled={!canGoPrev}
        aria-label="Jour précédent"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-medium text-[#4A2C2A] transition hover:bg-[#FFF8F6] disabled:opacity-30"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={onOpenWeek}
        className="mx-0.5 flex flex-1 items-center justify-center rounded-xl bg-[#E94E77] px-3 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(233,78,119,0.32)] transition hover:bg-[#D63D56] active:scale-[0.98]"
      >
        Ma semaine
      </button>
      <button
        type="button"
        onClick={onNextDay}
        disabled={!canGoNext}
        aria-label="Jour suivant"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-medium text-[#4A2C2A] transition hover:bg-[#FFF8F6] disabled:opacity-30"
      >
        ›
      </button>
    </div>
  );
}

function WeekAnalysisView({
  weekMeals,
  weekMealsLoading,
  weeklyInsights,
  onSelectDay,
}: {
  weekMeals: DiaryFoodLogEntry[];
  weekMealsLoading: boolean;
  weeklyInsights: WeeklyInsights | null;
  onSelectDay: (iso: string) => void;
}) {
  const weekDays = getWeekDayISOList();
  const todayIso = getTodayISO();
  const mealsByDay = new Map<string, DiaryFoodLogEntry[]>();
  for (const day of weekDays) {
    mealsByDay.set(day, []);
  }
  for (const meal of weekMeals) {
    const list = mealsByDay.get(meal.date);
    if (list) list.push(meal);
  }

  const formatDayMonth = (iso: string) => {
    const p = iso.split("-").map(Number);
    if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return iso;
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };
  const weekLabel = `Semaine du ${formatDayMonth(weekDays[0])} au ${formatDayMonth(weekDays[6])}`;

  if (weekMealsLoading) {
    return <p className="text-sm text-[#726566]">Chargement de ta semaine…</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-[#9A8585]">{weekLabel}</p>

      {weeklyInsights ? (
        <div className="space-y-3 rounded-2xl border border-[#F0E6E8] bg-[#FFF8F6] p-4">
          <p className="text-sm font-bold text-[#4A2C2A]">Analyse de la semaine</p>
          {Object.entries(weeklyInsights.patterns).map(([key, value]) => (
            <p key={key} className="text-sm leading-relaxed text-[#5C4040]">
              {value}
            </p>
          ))}
          {weeklyInsights.one_action ? (
            <div className="rounded-xl border border-[#E94E77]/20 bg-white px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#E94E77]">
                Action prioritaire
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#4A2C2A]">{weeklyInsights.one_action}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-[#726566]">
          Note quelques repas cette semaine pour débloquer l&apos;analyse personnalisée.
        </p>
      )}

      <div>
        <h3 className="mb-3 text-sm font-bold text-[#4A2C2A]">Historique des repas</h3>
        <div className="space-y-2.5">
          {weekDays.map((day) => {
            const dayMeals = mealsByDay.get(day) ?? [];
            const isToday = day === todayIso;
            return (
              <div
                key={day}
                className="overflow-hidden rounded-2xl border border-[#F0E6E8] bg-white shadow-[0_2px_12px_rgba(233,78,119,0.05)]"
              >
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left transition hover:bg-[#FFF8F6]"
                >
                  <span className="text-sm font-semibold text-[#4A2C2A]">
                    {isToday ? "Aujourd'hui" : formatWeekdayShortFr(day)}
                  </span>
                  <span className="text-xs text-[#9A8585]">
                    {dayMeals.length > 0
                      ? `${dayMeals.length} repas · voir`
                      : "Aucun repas · ajouter"}
                  </span>
                </button>
                {dayMeals.length > 0 ? (
                  <ul className="space-y-1.5 border-t border-[#F5E8EB] px-3.5 py-2.5">
                    {dayMeals.map((meal) => (
                      <li
                        key={meal.id}
                        className="flex items-start gap-2 rounded-xl bg-[#FFF8F6] px-2.5 py-2 text-xs text-[#5C4040]"
                      >
                        <span className="shrink-0 font-medium text-[#E94E77]">
                          {logEntryTypeLabel(meal.meal_type)}
                        </span>
                        <span className="min-w-0 flex-1 truncate">{meal.raw_text}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HydrationSection({
  entries,
  isExpanded,
  onToggle,
  glasses,
  setGlasses,
  beverage,
  setBeverage,
  onSave,
  onDelete,
  addingMeal,
}: {
  entries: DiaryFoodLogEntry[];
  isExpanded: boolean;
  onToggle: () => void;
  glasses: number;
  setGlasses: (n: number) => void;
  beverage: HydrationBeverage;
  setBeverage: (b: HydrationBeverage) => void;
  onSave: () => void;
  onDelete: (id: string) => void;
  addingMeal: boolean;
}) {
  const hasEntries = entries.length > 0;
  const preview = hasEntries ? entries.map((e) => e.raw_text).join(" · ") : undefined;

  return (
    <article className="overflow-hidden rounded-2xl border border-[#D4E8F5] bg-[#F4FAFF] shadow-sm">
      <div className="flex items-center gap-3 px-3.5 py-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E0F2FC] text-lg">
          💧
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[#3E2A2A]">Hydratation</h3>
          <p className={`truncate text-xs ${hasEntries ? "text-[#726566]" : "text-[#9A8585]"}`}>
            {preview ?? "Nombre de verres et type de boisson"}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Ajouter hydratation"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5BB8E8] text-xl font-light text-white shadow-[0_4px_14px_rgba(91,184,232,0.35)] transition hover:bg-[#4AA8D8]"
        >
          {isExpanded ? "−" : "+"}
        </button>
      </div>

      {hasEntries ? (
        <div className="space-y-2 border-t border-white/60 px-3.5 py-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-white/80 px-2.5 py-2"
            >
              <p className="text-sm text-[#3E2A2A]">{entry.raw_text}</p>
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600"
                title="Supprimer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {isExpanded ? (
        <div className="space-y-4 border-t border-white/60 bg-white/50 px-3.5 py-3">
          <div>
            <p className="mb-2 text-xs font-semibold text-[#4A2C2A]">Nombre de verres</p>
            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setGlasses(Math.max(1, glasses - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4E8F5] bg-white text-lg font-semibold text-[#4A2C2A]"
                aria-label="Moins un verre"
              >
                −
              </button>
              <span className="min-w-[3rem] text-center text-2xl font-bold text-[#2E7AB8]">{glasses}</span>
              <button
                type="button"
                onClick={() => setGlasses(Math.min(20, glasses + 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#D4E8F5] bg-white text-lg font-semibold text-[#4A2C2A]"
                aria-label="Plus un verre"
              >
                +
              </button>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-[#4A2C2A]">Type de boisson</p>
            <div className="flex flex-wrap gap-2">
              {HYDRATION_BEVERAGES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setBeverage(option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    beverage === option
                      ? "bg-[#5BB8E8] text-white shadow-sm"
                      : "border border-[#D4E8F5] bg-white text-[#5C4040]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={addingMeal}
            className="w-full rounded-full bg-[#5BB8E8] py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(91,184,232,0.3)] disabled:opacity-50"
          >
            {addingMeal ? "…" : "Enregistrer"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function SubScreen({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#F0E6E8] bg-white text-lg text-[#6B2E2E] shadow-sm"
          aria-label="Retour"
        >
          ‹
        </button>
        <h2 className="text-lg font-bold text-[#6B2E2E]">{title}</h2>
      </div>
      <div className="rounded-[1.75rem] border border-[#F0E6E8] bg-white p-4 shadow-[0_8px_32px_rgba(233,78,119,0.06)] sm:p-5">
        {children}
      </div>
    </div>
  );
}

function hasTomorrowPlan(plan: Record<MealType, string[]> | undefined): boolean {
  if (!plan) return false;
  return MEAL_TYPES.some((mealType) => (plan[mealType]?.length ?? 0) > 0);
}

function TomorrowPlanSection({
  plan,
}: {
  plan: Record<MealType, string[]>;
}) {
  return (
    <div className="rounded-xl border border-[#F5DDE5] bg-[#FFF5F8] p-3">
      <p className="mb-1 flex items-center gap-2 text-xs font-semibold text-[#6B2E2E]">
        <span aria-hidden>🗓️</span>
        Pour demain
      </p>
      <p className="mb-3 text-xs leading-relaxed text-[#726566]">
        Quelques pistes concrètes pour structurer ta journée.
      </p>
      <div className="space-y-2.5">
        {MEAL_TYPES.map((mealType) => {
          const suggestions = plan[mealType] || [];
          if (suggestions.length === 0) return null;
          const style = MEAL_TYPE_STYLES[mealType];
          return (
            <div key={mealType} className={`rounded-xl border p-2.5 ${style.ring} ${style.bg}`}>
              <h3 className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[#6B2E2E]">
                <span>{MEAL_TYPE_ICONS[mealType]}</span>
                {MEAL_TYPE_LABELS[mealType]}
              </h3>
              <ul className="space-y-1">
                {suggestions.map((s, idx) => (
                  <li key={idx} className="text-xs text-[#726566]">
                    • {s}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdvicePreviewCard({
  text,
  includesTomorrow,
  onOpen,
}: {
  text: string;
  includesTomorrow?: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full overflow-hidden rounded-[1.75rem] border border-[#F0E6E8] bg-white text-left shadow-[0_8px_32px_rgba(233,78,119,0.08)] transition hover:shadow-[0_12px_36px_rgba(233,78,119,0.12)] active:scale-[0.995]"
    >
      <div className="flex gap-0">
        <div className="min-w-0 flex-1 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-[#6B2E2E]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF4DC] text-base">
              💡
            </span>
            Conseils personnalisés
          </p>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#726566]">{text}</p>
          {includesTomorrow ? (
            <p className="mt-2 text-[11px] font-medium text-[#9A8585]">
              Inclut aussi des pistes pour demain
            </p>
          ) : null}
          <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#E94E77]">
            Voir plus de détails <span aria-hidden>→</span>
          </span>
        </div>
        <div className="relative hidden w-[7.5rem] shrink-0 sm:block">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FFE8DC] to-[#FFE4EC]" />
          <Image
            src="/equilibre/assistant-raspberry-mascot.png"
            alt=""
            width={96}
            height={112}
            className="absolute bottom-0 left-1/2 h-[5.5rem] w-auto -translate-x-1/2 object-contain object-bottom drop-shadow-[0_4px_12px_rgba(233,78,119,0.2)]"
            unoptimized
          />
        </div>
      </div>
    </button>
  );
}

function ChallengePreviewCard({
  defi,
  onOpen,
}: {
  defi: Challenge;
  onOpen: () => void;
}) {
  return (
    <section className="rounded-[2rem] border border-[#F5E8EB] bg-white p-5 shadow-[0_8px_32px_rgba(233,78,119,0.08)]">
      <div className="flex items-center gap-3">
        <div className="relative h-11 w-11 shrink-0">
          <Image
            src="/equilibre/defi/target-icon.png"
            alt=""
            width={44}
            height={44}
            className="h-full w-full object-contain"
            unoptimized
          />
        </div>
        <p className="text-base font-bold text-[#4A2C2A]">Défi du jour</p>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#4A2C2A]">{defi.action}</p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-5 w-full rounded-full bg-[#E94E77] py-3.5 text-sm font-bold text-white shadow-[0_6px_20px_rgba(233,78,119,0.35)] transition hover:bg-[#D63D56] active:scale-[0.98]"
      >
        Relever le défi
      </button>
    </section>
  );
}

export default function DietDiaryDayView({
  selectedDate,
  isToday,
  canGoPrev,
  canGoNext,
  onPrevDay,
  onNextDay,
  onSelectDate,
  meals,
  summary,
  dietitianNote,
  defiDuJour,
  conseilDuJour,
  weekMeals,
  weekMealsLoading,
  weeklyInsights,
  onWeekOpen,
  addingMeal,
  canUsePhotoScan,
  loadingScan,
  subscriptionTier,
  onAddMeal,
  onDeleteMeal,
  onEditMeal,
  onAddFeeling,
  onPhotoScanClick,
}: DietDiaryDayViewProps) {
  const [screen, setScreen] = useState<DiaryScreen>("diary");
  const [expandedSlot, setExpandedSlot] = useState<MealType | null>(null);
  const [hydrationExpanded, setHydrationExpanded] = useState(false);
  const [hydrationGlasses, setHydrationGlasses] = useState(1);
  const [hydrationBeverage, setHydrationBeverage] = useState<HydrationBeverage>("Eau");
  const [slotInputs, setSlotInputs] = useState<Record<MealType, string>>({
    breakfast: "",
    lunch: "",
    dinner: "",
    snack: "",
  });

  const mealEntries = meals.filter((m) => m.meal_type !== "hydration");
  const hydrationEntries = meals.filter((m) => m.meal_type === "hydration");
  const loggedMealTypes = uniqueLoggedMealTypes(mealEntries);
  const displayScore = summary?.score ?? null;
  const scoreContext = buildLoggedMealsScoreContext(
    mealEntries.length,
    loggedMealTypes,
    displayScore
  );

  const advicePreview =
    conseilDuJour?.text ||
    summary?.priority_tip ||
    dietitianNote.improvements[0] ||
    null;
  const showTomorrowPlan = isToday && hasTomorrowPlan(summary?.plan_for_tomorrow ?? undefined);
  const showAdviceCard = Boolean(advicePreview || showTomorrowPlan);
  const adviceCardText =
    advicePreview ||
    "Découvre des pistes concrètes pour mieux structurer ta journée de demain.";

  useEffect(() => {
    setScreen("diary");
    setExpandedSlot(null);
    setHydrationExpanded(false);
  }, [selectedDate]);

  const toggleSlot = (mealType: MealType) => {
    setExpandedSlot((prev) => (prev === mealType ? null : mealType));
  };

  const submitSlot = async (mealType: MealType) => {
    const text = slotInputs[mealType].trim();
    if (!text) return;
    await onAddMeal(mealType, text);
    setSlotInputs((prev) => ({ ...prev, [mealType]: "" }));
    setExpandedSlot(null);
  };

  const goBack = () => setScreen("diary");

  const openWeek = () => {
    void onWeekOpen();
    setScreen("week");
  };

  const selectDayFromWeek = (iso: string) => {
    onSelectDate?.(iso);
    setScreen("diary");
  };

  if (screen === "week") {
    return (
      <SubScreen title="Ma semaine" onBack={goBack}>
        <WeekAnalysisView
          weekMeals={weekMeals}
          weekMealsLoading={weekMealsLoading}
          weeklyInsights={weeklyInsights}
          onSelectDay={selectDayFromWeek}
        />
      </SubScreen>
    );
  }

  if (screen === "analysis") {
    return (
      <SubScreen title="Conseils & analyses" onBack={goBack}>
        {mealEntries.length === 0 && !showTomorrowPlan ? (
          <p className="text-sm leading-relaxed text-[#726566]">
            Saisis au moins un repas pour recevoir l&apos;analyse de ton assistant diététicien.
          </p>
        ) : (
          <div className="space-y-4">
            {mealEntries.length > 0 ? (
              <>
            {summary ? (
              <div className="space-y-2 rounded-xl bg-[#FFF8F6] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-[#6B2E2E]">Score des repas saisis</span>
                  <span className="text-2xl font-bold text-[#6B2E2E]">{summary.score}/100</span>
                </div>
                <LoggedMealsScoreNotice
                  scopeLine={dietitianNote.scopeLine || scoreContext.scopeLine}
                  coverageWarning={dietitianNote.coverageWarning ?? scoreContext.coverageWarning}
                  compact
                />
              </div>
            ) : null}
            <div>
              <h3 className="mb-1 font-semibold text-[#3E2A2A]">{dietitianNote.title}</h3>
              <p className="text-sm leading-relaxed text-[#6D5B5B]">{dietitianNote.intro}</p>
            </div>
            <div className="rounded-xl border border-[#DDF1E4] bg-[#F6FFFA] p-3">
              <p className="mb-2 text-xs font-semibold text-[#2E7A4B]">Ce qui est bien</p>
              <ul className="space-y-1.5">
                {dietitianNote.highlights.map((h, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-[#4F5F55]">
                    <span className="text-[#2E9F61]">✓</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-[#F3E4CF] bg-[#FFFBF5] p-3">
              <p className="mb-2 text-xs font-semibold text-[#9A6A26]">Axes d&apos;amélioration</p>
              <ul className="space-y-1.5">
                {dietitianNote.improvements.map((tip, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-[#6D5B5B]">
                    <span className="text-[#C28A39]">→</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
            {summary && summary.strengths.length > 0 ? (
              <div className="rounded-xl border border-[#E94E77]/20 bg-white p-3">
                <p className="mb-2 text-xs font-semibold text-[#6B2E2E]">Synthèse détaillée</p>
                <ul className="space-y-1">
                  {summary.strengths.map((strength, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-[#726566]">
                      <span className="text-[#E94E77]">✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {subscriptionTier !== "premium_plus" ? (
              <div className="rounded-xl border border-[#F5E6C8] bg-[#FFFBF0] p-3">
                <p className="text-sm font-semibold text-[#6B2E2E]">Analyse plus poussée</p>
                <p className="mt-1 text-xs text-[#726566]">
                  Premium Plus : analyse photo et lecture plus fine des repas.
                </p>
                <Link href="/premium" className="mt-2 inline-block text-xs font-semibold text-[#E94E77] underline">
                  Découvrir Premium Plus
                </Link>
              </div>
            ) : null}
              </>
            ) : null}
            {showTomorrowPlan && summary?.plan_for_tomorrow ? (
              <TomorrowPlanSection plan={summary.plan_for_tomorrow} />
            ) : null}
          </div>
        )}
      </SubScreen>
    );
  }

  if (screen === "challenge" && defiDuJour) {
    return (
      <SubScreen title="Défi du jour" onBack={goBack}>
        <div className="rounded-xl bg-[#FFF8F6] p-4">
          <p className="text-base font-semibold leading-snug text-[#6B2E2E]">{defiDuJour.action}</p>
          <p className="mt-3 text-sm italic leading-relaxed text-[#726566]">{defiDuJour.why}</p>
          {defiDuJour.duration_min && defiDuJour.duration_min > 0 ? (
            <p className="mt-4 text-xs text-[#9A8585]">
              Durée estimée :{" "}
              {defiDuJour.duration_min < 1 ? "< 1 min" : `${Math.round(defiDuJour.duration_min)} min`}
            </p>
          ) : null}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-[#726566]">
          Chaque petit défi compte : l&apos;objectif est la régularité, pas la perfection.
        </p>
      </SubScreen>
    );
  }

  return (
    <div className="space-y-5">
      <AssistantHero />

      <DiarySummaryCard
        score={displayScore}
        summary={summary}
        hasMealEntries={mealEntries.length > 0}
        mealsAnalyzed={mealEntries.length}
        mealTypes={loggedMealTypes}
      />

      {!summary && mealEntries.length > 0 ? (
        <p className="-mt-2 text-center text-[11px] text-[#726566]">Calcul du score en cours…</p>
      ) : null}

      {!isToday ? (
        <p className="rounded-xl bg-[#FFF8F6] px-3 py-2 text-center text-[11px] leading-relaxed text-[#726566]">
          Tu peux compléter les repas de ce jour passé — ils seront intégrés à ton suivi hebdomadaire.
        </p>
      ) : null}

      <section>
        <h2 className="mb-3 text-base font-bold text-[#6B2E2E]">Vos repas du jour</h2>
        <div className="space-y-2.5">
          {MEAL_TYPES.map((mealType) => {
            const mealsOfType = mealEntries.filter((m) => m.meal_type === mealType);
            const isExpanded = expandedSlot === mealType;
            const hasEntries = mealsOfType.length > 0;
            const style = MEAL_TYPE_STYLES[mealType];
            const preview = hasEntries
              ? mealsOfType.map((m) => m.raw_text).join(" · ")
              : undefined;

            return (
              <article
                key={mealType}
                className={`overflow-hidden rounded-2xl border shadow-sm transition-colors ${style.ring} ${style.bg}`}
              >
                <div className="flex items-center gap-3 px-3.5 py-3">
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg ${style.iconBg}`}
                  >
                    {MEAL_TYPE_ICONS[mealType]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-[#3E2A2A]">{MEAL_TYPE_LABELS[mealType]}</h3>
                    <p className={`truncate text-xs ${hasEntries ? "text-[#726566]" : "text-[#9A8585]"}`}>
                      {mealSlotStatusLabel(mealType, hasEntries, preview)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSlot(mealType)}
                    aria-label={`Ajouter ${MEAL_TYPE_LABELS[mealType]}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E94E77] text-xl font-light text-white shadow-[0_4px_14px_rgba(233,78,119,0.35)] transition hover:bg-[#D63D56]"
                  >
                    {isExpanded ? "−" : "+"}
                  </button>
                </div>

                {hasEntries ? (
                  <div className="space-y-2 border-t border-white/60 px-3.5 py-2">
                    {mealsOfType.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between gap-2 rounded-xl bg-white/80 px-2.5 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-[#3E2A2A]">{entry.raw_text}</p>
                          {entry.parsed?.items && entry.parsed.items.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {entry.parsed.items.slice(0, 3).map((item, idx) => (
                                <span
                                  key={idx}
                                  className="rounded-full bg-[#FFECE8] px-1.5 py-0.5 text-[8px] text-[#726566]"
                                >
                                  {item.name}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {onEditMeal ? (
                            <button
                              type="button"
                              onClick={() => onEditMeal(entry)}
                              className="rounded-lg bg-[#FFECE8] px-2 py-1 text-xs"
                              title="Modifier les aliments"
                            >
                              ✎
                            </button>
                          ) : null}
                          {!entry.hunger_before || !entry.satiety_after ? (
                            <button
                              type="button"
                              onClick={() => onAddFeeling(entry.id)}
                              className="rounded-lg bg-[#FFECE8] px-2 py-1 text-xs"
                              title="Ajouter ressenti"
                            >
                              💭
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => onDeleteMeal(entry.id)}
                            className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600"
                            title="Supprimer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {isExpanded ? (
                  <div className="border-t border-white/60 bg-white/50 px-3.5 py-3 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={slotInputs[mealType]}
                        onChange={(e) =>
                          setSlotInputs((prev) => ({ ...prev, [mealType]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void submitSlot(mealType);
                          }
                        }}
                        placeholder="Ex : salade de quinoa, poulet rôti…"
                        className="flex-1 rounded-xl border border-[#F0E6E8] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                        disabled={addingMeal}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => void submitSlot(mealType)}
                        disabled={addingMeal || !slotInputs[mealType].trim()}
                        className="shrink-0 rounded-xl bg-[#E94E77] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {addingMeal ? "…" : "OK"}
                      </button>
                    </div>

                    {canUsePhotoScan ? (
                      <button
                        type="button"
                        onClick={() => onPhotoScanClick(mealType)}
                        disabled={loadingScan}
                        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#E94E77]/30 bg-[#FFF8F6] px-3.5 py-2.5 text-left transition hover:border-[#E94E77]/50 disabled:opacity-60"
                      >
                        <span className="text-lg">📷</span>
                        <span className="flex-1 text-sm font-medium text-[#6B2E2E]">
                          {loadingScan ? "Analyse en cours…" : "Scanner une assiette"}
                        </span>
                        <span className="text-[#726566]">›</span>
                      </button>
                    ) : (
                      <Link
                        href="/premium"
                        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-[#E94E77]/30 bg-[#FFF8F6] px-3.5 py-2.5 text-left transition hover:border-[#E94E77]/50"
                      >
                        <span className="text-lg">📷</span>
                        <span className="flex-1 text-sm font-medium text-[#6B2E2E]">Scanner une assiette</span>
                        <span className="text-[10px] font-semibold text-[#E94E77]">Premium Plus</span>
                        <span className="text-[#726566]">›</span>
                      </Link>
                    )}

                    {subscriptionTier !== "premium_plus" ? (
                      <Link
                        href="/premium"
                        className="flex items-center gap-3 rounded-2xl border border-[#F5E6C8] bg-gradient-to-r from-[#FFFBF0] to-white px-3.5 py-3 shadow-sm transition hover:shadow-md"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FFF4DC] text-base">
                          👑
                        </span>
                        <p className="min-w-0 flex-1 text-xs leading-relaxed text-[#726566]">
                          <span className="font-semibold text-[#6B2E2E]">Passe à Foodlane Premium</span>
                          <br />
                          Débloque des analyses détaillées et le scan photo d&apos;assiette.
                        </p>
                        <span className="shrink-0 text-[#E94E77]">›</span>
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}

          <HydrationSection
            entries={hydrationEntries}
            isExpanded={hydrationExpanded}
            onToggle={() => setHydrationExpanded((v) => !v)}
            glasses={hydrationGlasses}
            setGlasses={setHydrationGlasses}
            beverage={hydrationBeverage}
            setBeverage={setHydrationBeverage}
            onSave={() =>
              void onAddMeal("hydration", formatHydrationEntry(hydrationGlasses, hydrationBeverage)).then(
                () => {
                  setHydrationExpanded(false);
                  setHydrationGlasses(1);
                  setHydrationBeverage("Eau");
                }
              )
            }
            onDelete={onDeleteMeal}
            addingMeal={addingMeal}
          />
        </div>
      </section>

      {showAdviceCard ? (
        <AdvicePreviewCard
          text={adviceCardText}
          includesTomorrow={showTomorrowPlan}
          onOpen={() => setScreen("analysis")}
        />
      ) : null}

      {defiDuJour ? (
        <ChallengePreviewCard defi={defiDuJour} onOpen={() => setScreen("challenge")} />
      ) : null}

      <WeekNavBar
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrevDay={onPrevDay}
        onNextDay={onNextDay}
        onOpenWeek={openWeek}
      />
    </div>
  );
}
