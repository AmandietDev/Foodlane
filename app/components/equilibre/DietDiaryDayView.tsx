"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Challenge, Tip } from "../../src/lib/dailyTips";
import {
  MEAL_TYPES,
  MEAL_TYPE_ICONS,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_STYLES,
  countFilledMealSlots,
  mealSlotStatusLabel,
  scoreBalanceLabel,
  type MealType,
} from "./dietDiaryUtils";

export interface DiaryFoodLogEntry {
  id: string;
  date: string;
  meal_type: MealType;
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
  highlights: string[];
  improvements: string[];
};

type DiaryScreen = "diary" | "analysis" | "challenge";

type DietDiaryDayViewProps = {
  selectedDate: string;
  isToday: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  meals: DiaryFoodLogEntry[];
  summary: DiaryDailySummary | null;
  dietitianNote: DietitianNote;
  defiDuJour: Challenge | null;
  conseilDuJour: Tip | null;
  addingMeal: boolean;
  canUsePhotoScan: boolean;
  loadingScan: boolean;
  subscriptionTier: string | null;
  onAddMeal: (mealType: MealType, rawText: string) => Promise<void>;
  onDeleteMeal: (id: string) => void;
  onAddFeeling: (id: string) => void;
  onPhotoScanClick: (mealType: MealType) => void;
};

function CompletionRing({ percent }: { percent: number }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const dash = (percent / 100) * c;

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
        <span className="text-lg font-bold leading-none text-[#6B2E2E]">{percent}%</span>
        <span className="mt-0.5 text-[8px] leading-tight text-[#726566]">repas saisis</span>
      </div>
    </div>
  );
}

function MascotProgressBar({ filledCount }: { filledCount: number }) {
  const total = MEAL_TYPES.length;
  const progressPct = total === 0 ? 0 : (filledCount / total) * 100;

  return (
    <div className="mt-5 border-t border-[#F0E6E8] pt-4 pb-1">
      <div
        className="relative h-11 px-3"
        role="progressbar"
        aria-valuenow={filledCount}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`${filledCount} repas sur ${total} saisis`}
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

function DiarySummaryCard({
  score,
  filledCount,
}: {
  score: number | null;
  filledCount: number;
}) {
  const completionPct = Math.round((filledCount / MEAL_TYPES.length) * 100);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-[#F0E6E8] bg-white p-4 shadow-[0_8px_32px_rgba(233,78,119,0.08)]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9A8585]">
            Score d&apos;équilibre
          </p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-4xl font-bold leading-none text-[#6B2E2E]">
              {score != null ? score : "—"}
            </span>
            <span className="text-sm font-medium text-[#726566]">/100</span>
          </div>
          <p className="mt-1.5 text-xs font-medium text-[#E94E77]">
            {scoreBalanceLabel(score)}{" "}
            <span aria-hidden>♥</span>
          </p>
        </div>
        <CompletionRing percent={completionPct} />
      </div>
      <MascotProgressBar filledCount={filledCount} />
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
}: {
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[#F0E6E8] bg-white p-1.5 shadow-sm" aria-label="Navigation hebdomadaire">
      <button
        type="button"
        onClick={onPrevDay}
        disabled={!canGoPrev}
        aria-label="Semaine précédente"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg text-[#6B2E2E] transition hover:bg-[#FFF8F6] disabled:opacity-30"
      >
        ‹
      </button>
      <div className="flex flex-1 items-center justify-center rounded-lg bg-[#E94E77] px-3 py-2.5 text-sm font-semibold text-white shadow-sm">
        Ma semaine
      </div>
      <button
        type="button"
        onClick={onNextDay}
        disabled={!canGoNext}
        aria-label="Semaine suivante"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg text-[#6B2E2E] transition hover:bg-[#FFF8F6] disabled:opacity-30"
      >
        ›
      </button>
    </div>
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
    <div className="rounded-xl border border-[#F3E8FF] bg-[#FBF8FF] p-3">
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
    <section className="rounded-[1.75rem] border border-[#F0E6E8] bg-white p-4 shadow-[0_8px_32px_rgba(233,78,119,0.08)]">
      <p className="flex items-center gap-2 text-sm font-bold text-[#6B2E2E]">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFE4EC] text-base">
          🎯
        </span>
        Défi du jour
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[#5C4040]">{defi.action}</p>
      <button
        type="button"
        onClick={onOpen}
        className="mt-4 w-full rounded-full bg-[#E94E77] py-3 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(233,78,119,0.35)] transition hover:bg-[#D63D56] active:scale-[0.98]"
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
  meals,
  summary,
  dietitianNote,
  defiDuJour,
  conseilDuJour,
  addingMeal,
  canUsePhotoScan,
  loadingScan,
  subscriptionTier,
  onAddMeal,
  onDeleteMeal,
  onAddFeeling,
  onPhotoScanClick,
}: DietDiaryDayViewProps) {
  const [screen, setScreen] = useState<DiaryScreen>("diary");
  const [expandedSlot, setExpandedSlot] = useState<MealType | null>(null);
  const [slotInputs, setSlotInputs] = useState<Record<MealType, string>>({
    breakfast: "",
    lunch: "",
    dinner: "",
    snack: "",
  });

  const filledCount = countFilledMealSlots(meals);
  const displayScore = summary?.score ?? null;

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

  if (screen === "analysis") {
    return (
      <SubScreen title="Conseils & analyses" onBack={goBack}>
        {meals.length === 0 && !showTomorrowPlan ? (
          <p className="text-sm leading-relaxed text-[#726566]">
            Saisis au moins un repas pour recevoir l&apos;analyse de ton assistant diététicien.
          </p>
        ) : (
          <div className="space-y-4">
            {meals.length > 0 ? (
              <>
            {summary ? (
              <div className="flex items-center justify-between rounded-xl bg-[#FFF8F6] px-4 py-3">
                <span className="text-sm font-semibold text-[#6B2E2E]">Score du jour</span>
                <span className="text-2xl font-bold text-[#6B2E2E]">{summary.score}/100</span>
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

      <DiarySummaryCard score={displayScore} filledCount={filledCount} />

      {!summary && meals.length > 0 ? (
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
            const mealsOfType = meals.filter((m) => m.meal_type === mealType);
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
      />
    </div>
  );
}
