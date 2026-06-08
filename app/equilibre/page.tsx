"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePremium } from "../contexts/PremiumContext";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { supabase } from "../src/lib/supabaseClient";
import LoadingSpinner from "../components/LoadingSpinner";
import DietDiaryDayView from "../components/equilibre/DietDiaryDayView";
import { getTodayISO, shiftDateISO } from "../components/equilibre/dietDiaryUtils";
import { loadPreferences } from "../src/lib/userPreferences";
import {
  selectDailyTip,
  selectDailyChallenge,
  type Tip,
  type Challenge,
  type ObjectiveTag,
  type ContextTag,
} from "../src/lib/dailyTips";
import { getTodayTips, getRecentIds, addToHistory } from "../src/lib/dailyTipsHistory";
import { getLocale } from "../src/lib/i18n";
import { sessionAuthHeaders } from "../src/lib/plannerClient";

interface FoodLogEntry {
  id: string;
  date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  raw_text: string;
  parsed: any;
  confidence: number;
  hunger_before?: number;
  satiety_after?: number;
  mood_energy?: number;
  created_at: string;
  updated_at?: string;
}

interface DailySummary {
  score: number;
  strengths: string[];
  priority_tip: string;
  tip_options: string[];
  missing_components: string[];
  plan_for_tomorrow: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
    snack: string[];
  };
  meta: any;
}

interface WeeklyInsights {
  patterns: Record<string, string>;
  one_action: string;
}

/** Lundi–dimanche de la semaine civile courante (ISO date locale via UTC string, aligné au reste de la page). */
function getMondayWeekBoundsISO(now = new Date()) {
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  const weekStart = monday.toISOString().split("T")[0];
  const end = new Date(monday);
  end.setDate(end.getDate() + 6);
  const weekEnd = end.toISOString().split("T")[0];
  return { weekStart, weekEnd };
}

function formatWeekdayFr(isoDate: string) {
  const p = isoDate.split("-");
  if (p.length !== 3) return isoDate;
  const y = Number(p[0]);
  const mo = Number(p[1]);
  const da = Number(p[2]);
  if (!y || !mo || !da) return isoDate;
  return new Date(y, mo - 1, da).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function DietAssistantFreePreview() {
  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">Assistant diététicien</h1>
        <p className="text-sm text-[var(--beige-text-light)] mt-2 leading-relaxed">
          Voici un aperçu du suivi personnalisé : conseil du jour, défi court, lecture de ta journée et tendances sur la semaine.
          Pour enregistrer tes vrais repas, ta note du jour et « Ma semaine », passe à{" "}
          <strong className="text-[#6B2E2E]">Premium</strong>. L’analyse photo est disponible en{" "}
          <strong className="text-[#6B2E2E]">Premium Plus</strong>.
        </p>
      </header>

      <div className="rounded-2xl border border-white/70 bg-white/55 backdrop-blur-md p-4 shadow-sm mb-4">
        <p className="text-xs font-semibold text-[#6B2E2E] mb-2">Conseil du jour (exemple)</p>
        <p className="text-sm text-[#726566]">
          Associe protéines + fibres à chaque repas principal pour une faim plus stable l’après-midi.
        </p>
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/55 backdrop-blur-md p-4 shadow-sm mb-4">
        <p className="text-xs font-semibold text-[#6B2E2E] mb-2">Défi du jour (exemple)</p>
        <p className="text-sm font-medium text-[#6B2E2E] mb-1">12 minutes de marche rapide sans téléphone</p>
        <p className="text-xs text-[#726566] italic">Bouger, c’est aussi nourrir ton équilibre.</p>
      </div>

      <div className="rounded-3xl border border-white/70 bg-white/55 backdrop-blur-md p-5 shadow-sm mb-4">
        <h2 className="text-lg font-bold text-[#6B2E2E] mb-3">Note de ta diététicienne (aperçu)</h2>
        <p className="text-sm text-[#726566] mb-3">
          Ici tu verras un score, des points forts et une action simple pour demain, calculés à partir de ce que tu as vraiment
          mangé.
        </p>
        <div className="rounded-xl bg-white/70 p-3 text-xs text-[#726566] border border-dashed border-[#E94E77]/40">
          Débloqué avec Premium : journal alimentaire, analyse du jour et plan d’actions. Premium Plus ajoute l’analyse photo
          assiette.
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href="/premium"
          className="w-full text-center px-4 py-3 rounded-xl bg-[#E94E77] text-white font-semibold text-sm hover:bg-[#D63D56] transition-colors"
        >
          Voir Premium et Premium Plus
        </Link>
        <Link
          href="/tableau"
          className="w-full text-center px-4 py-2 rounded-xl bg-white border border-[var(--beige-border)] text-[#726566] text-sm font-semibold"
        >
          Retour à l’accueil
        </Link>
      </div>
    </main>
  );
}

function isNonBlockingSupabaseError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; details?: string };
  const text = `${e.message || ""} ${e.details || ""}`.toLowerCase();
  return (
    e.code === "42P01" ||
    e.code === "42501" ||
    text.includes("food_log_entries") ||
    text.includes("permission denied") ||
    text.includes("row-level security")
  );
}

export default function EquilibrePage() {
  const { user, loading: sessionLoading } = useSupabaseSession();
  const { loading: premiumLoading, canAccessDietAssistant, subscriptionTier } = usePremium();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getTodayISO);
  const [meals, setMeals] = useState<FoodLogEntry[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [weeklyInsights, setWeeklyInsights] = useState<WeeklyInsights | null>(null);
  const [currentMeal, setCurrentMeal] = useState<"breakfast" | "lunch" | "dinner" | "snack">("breakfast");
  const [mealInput, setMealInput] = useState("");
  const [addingMeal, setAddingMeal] = useState(false);
  const [showWeeklyInsights, setShowWeeklyInsights] = useState(false);
  const [hungerBefore, setHungerBefore] = useState<number | null>(null);
  const [satietyAfter, setSatietyAfter] = useState<number | null>(null);
  const [showFeelingModal, setShowFeelingModal] = useState(false);
  const [pendingMealId, setPendingMealId] = useState<string | null>(null);
  const [conseilDuJour, setConseilDuJour] = useState<Tip | null>(null);
  const [defiDuJour, setDefiDuJour] = useState<Challenge | null>(null);
  const [weekMeals, setWeekMeals] = useState<FoodLogEntry[]>([]);
  const [weekMealsLoading, setWeekMealsLoading] = useState(false);

  useEffect(() => {
    if (sessionLoading || premiumLoading) return;
    const todayStr = getTodayISO();
    setSelectedDate(todayStr);
    if (!canAccessDietAssistant) return;
    void loadTodayData(todayStr);
    void loadWeeklyInsights();
    void loadWeekMeals();
    void generateDailyTips().catch((error) => {
      console.error("[Equilibre] Erreur génération conseils/défis:", error);
    });
  }, [sessionLoading, premiumLoading, canAccessDietAssistant]);

  const MAX_DAYS_BACK = 30;
  const todayIso = getTodayISO();
  const isSelectedToday = selectedDate === todayIso;
  const minSelectableDate = shiftDateISO(todayIso, -MAX_DAYS_BACK);
  const canGoPrev = selectedDate > minSelectableDate;
  const canGoNext = selectedDate < todayIso;

  function goPrevDay() {
    const prev = shiftDateISO(selectedDate, -1);
    if (prev < minSelectableDate) return;
    setSelectedDate(prev);
    setLoading(true);
    void loadTodayData(prev);
  }

  function goNextDay() {
    const next = shiftDateISO(selectedDate, 1);
    if (next > todayIso) return;
    setSelectedDate(next);
    setLoading(true);
    void loadTodayData(next);
  }

  function goToday() {
    setSelectedDate(todayIso);
    setLoading(true);
    void loadTodayData(todayIso);
  }

  async function generateDailyTips() {
    const preferences = loadPreferences();

    const userObjectives: ObjectiveTag[] = [];
    const objectifsUsage = preferences.objectifsUsage || [];
    const add = (x: ObjectiveTag) => {
      if (!userObjectives.includes(x)) userObjectives.push(x);
    };
    for (const x of objectifsUsage) {
      if (x === "weight-loss" || x === "Perte de poids") add("weight_loss");
      if (x === "muscle-gain" || x === "Prise de masse") add("muscle_gain");
      if (x === "vegetarian" || x === "Réduire la viande") add("reduce_meat");
      if (x === "rebalancing" || x === "Cuisiner plus") add("cook_more");
      if (x === "energy" || x === "Meilleure énergie") add("better_energy");
      if (x === "perte_poids") add("weight_loss");
      if (x === "prise_masse") add("muscle_gain");
      if (x === "vegetarien_plus") add("reduce_meat");
      if (x === "mieux_manger" || x === "equilibre" || x === "charge_mentale" || x === "gain_temps" || x === "batch" || x === "famille" || x === "autre") {
        add("cook_more");
      }
    }
    if (userObjectives.length === 0) userObjectives.push("general");
    
    // Déterminer le contexte (simplifié pour l'instant, peut être affiné)
    const userContext: ContextTag[] = ["anytime"]; // On peut affiner selon l'heure, le jour, etc.
    
    // Vérifier si on a déjà des conseils/défis pour aujourd'hui
    const todayTips = await getTodayTips();
    
    // Si on a déjà des conseils/défis pour aujourd'hui, on pourrait les charger depuis la base
    // Pour l'instant, on régénère à chaque fois pour avoir de la variété
    
    // Récupérer les IDs récents pour éviter les répétitions (7 derniers jours)
    const { tipIds, challengeIds } = await getRecentIds();
    
    // Sélectionner un conseil et un défi adaptés
    const selectedTip = selectDailyTip(userObjectives, userContext, tipIds);
    const selectedChallenge = selectDailyChallenge(userObjectives, userContext, challengeIds);
    
    if (selectedTip) {
      setConseilDuJour(selectedTip);
    }
    
    if (selectedChallenge) {
      setDefiDuJour(selectedChallenge);
    }
    
    // Sauvegarder dans l'historique Supabase (automatiquement)
    if (selectedTip && selectedChallenge) {
      await addToHistory(selectedTip, selectedChallenge);
    }
  }


  async function loadTodayData(date: string, opts?: { silent?: boolean }) {
    const silent = Boolean(opts?.silent);
    if (!silent) setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const authHeaders: Record<string, string> = {};
      if (session.access_token) {
        authHeaders.Authorization = `Bearer ${session.access_token}`;
      }

      const [mealsResult, summaryRes] = await Promise.all([
        supabase
          .from("food_log_entries")
          .select("*")
          .eq("user_id", session.user.id)
          .eq("date", date)
          .order("created_at", { ascending: true }),
        fetch(`/api/foodlog/summary?date=${date}`, { headers: authHeaders }),
      ]);

      const { data: mealsData, error: mealsError } = mealsResult;
      if (mealsError) {
        if (isNonBlockingSupabaseError(mealsError)) {
          console.warn("[Equilibre] Table/accès food_log_entries indisponible, affichage en mode vide.");
          setMeals([]);
        } else {
          console.error("[Equilibre] Erreur chargement repas:", mealsError);
        }
      } else {
        setMeals(mealsData || []);
      }

      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }
    } catch (error) {
      console.error("[Equilibre] Erreur:", error);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const loadWeeklyInsights = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const { weekStart } = getMondayWeekBoundsISO();

      const res = await fetch(`/api/foodlog/weekly?week_start=${weekStart}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setWeeklyInsights(data);
      }
    } catch (error) {
      console.error("[Equilibre] Erreur chargement insights:", error);
    }
  }, []);

  const loadWeekMeals = useCallback(async () => {
    setWeekMealsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setWeekMeals([]);
        return;
      }
      const { weekStart, weekEnd } = getMondayWeekBoundsISO();
      const { data, error } = await supabase
        .from("food_log_entries")
        .select("*")
        .eq("user_id", session.user.id)
        .gte("date", weekStart)
        .lte("date", weekEnd)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) {
        console.error("[Equilibre] Erreur chargement repas de la semaine:", error);
        setWeekMeals([]);
        return;
      }
      setWeekMeals(data || []);
    } catch (e) {
      console.error("[Equilibre] loadWeekMeals:", e);
      setWeekMeals([]);
    } finally {
      setWeekMealsLoading(false);
    }
  }, []);

  const reloadWeekData = useCallback(async () => {
    await Promise.all([loadWeeklyInsights(), loadWeekMeals()]);
  }, [loadWeeklyInsights, loadWeekMeals]);

  async function handleAddMeal() {
    if (!mealInput.trim()) return;
    await handleAddMealWithRawText(mealInput.trim());
    setMealInput("");
    setHungerBefore(null);
    setSatietyAfter(null);
    setShowFeelingModal(false);
    setPendingMealId(null);
  }

  async function handleAddMealWithRawText(
    rawText: string,
    mealType: "breakfast" | "lunch" | "dinner" | "snack" = currentMeal
  ) {
    if (!rawText.trim()) return;

    setAddingMeal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        alert("Tu dois être connecté pour ajouter un repas");
        return;
      }

      const mealDate =
        selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)
          ? selectedDate
          : getTodayISO();

      const res = await fetch("/api/foodlog/add", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          date: mealDate,
          meal_type: mealType,
          raw_text: rawText.trim(),
          hunger_before: hungerBefore || undefined,
          satiety_after: satietyAfter || undefined,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        details?: string;
        message?: string;
        entry?: FoodLogEntry;
        summary?: DailySummary;
      };

      if (!res.ok) {
        const technical = [payload.error, payload.details].filter(Boolean).join(" — ");
        const friendly =
          typeof payload.message === "string" && payload.message.trim()
            ? payload.message.trim()
            : "";
        throw new Error(friendly || technical || "Erreur lors de l'ajout du repas");
      }

      const j = payload;

      if (j.summary) setSummary(j.summary);
      if (j.entry) {
        setMeals((prev) => {
          const next = prev.filter((m) => m.id !== j.entry!.id);
          next.push(j.entry!);
          next.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          return next;
        });
      }

      await loadTodayData(selectedDate, { silent: true });
      await reloadWeekData();
    } catch (error) {
      console.error("[Equilibre] Erreur ajout repas:", error);
      const msg =
        error instanceof Error ? error.message : "Erreur lors de l'ajout du repas";
      const isJournalServeur =
        /food_log_entries|Journal indisponible|journal alimentaire|001_create_food_log/i.test(msg);
      alert(
        `${msg}${
          isJournalServeur
            ? ""
            : "\n\nAstuce : le repas doit être enregistré dans ton journal (bouton « Ajouter ») pour être retrouvé dans l’onglet « Ma semaine »."
        }`
      );
    } finally {
      setAddingMeal(false);
    }
  }

  async function handleDeleteMeal(entryId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from("food_log_entries")
        .delete()
        .eq("id", entryId)
        .eq("user_id", session.user.id);

      if (error) throw error;

      await loadTodayData(selectedDate);
      await reloadWeekData();
    } catch (error) {
      console.error("[Equilibre] Erreur suppression:", error);
      alert("Erreur lors de la suppression");
    }
  }

  async function handleAddFeeling(entryId: string) {
    setPendingMealId(entryId);
    setShowFeelingModal(true);
  }

  async function handleSaveFeeling() {
    if (!pendingMealId || hungerBefore === null || satietyAfter === null) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from("food_log_entries")
        .update({
          hunger_before: hungerBefore,
          satiety_after: satietyAfter,
        })
        .eq("id", pendingMealId)
        .eq("user_id", session.user.id);

      if (error) throw error;

      await loadTodayData(selectedDate);
      await reloadWeekData();
      setShowFeelingModal(false);
      setPendingMealId(null);
      setHungerBefore(null);
      setSatietyAfter(null);
    } catch (error) {
      console.error("[Equilibre] Erreur sauvegarde ressenti:", error);
      alert("Erreur lors de la sauvegarde");
    }
  }

  const mealTypeLabels = {
    breakfast: "Petit-déjeuner",
    lunch: "Déjeuner",
    dinner: "Dîner",
    snack: "Collation",
  };

  if (sessionLoading || premiumLoading) {
    return (
      <main className="max-w-md mx-auto px-4 pt-6 pb-24">
        <LoadingSpinner message="Chargement..." />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-md mx-auto px-4 pt-6 pb-24 text-center">
        <p className="text-sm text-[var(--beige-text-light)] mb-4">
          Connecte-toi pour accéder à l’assistant diététicien.
        </p>
        <Link
          href="/login"
          className="inline-block px-4 py-3 rounded-xl bg-[#E94E77] text-white font-semibold text-sm hover:bg-[#D63D56] transition-colors"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  if (!canAccessDietAssistant) {
    return <DietAssistantFreePreview />;
  }

  const canUsePhotoScan = subscriptionTier === "premium_plus";

  return loading ? (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <LoadingSpinner message="Chargement..." />
    </main>
  ) : (
    <EquilibrePageContent
      meals={meals}
      summary={summary}
      weeklyInsights={weeklyInsights}
      weekMeals={weekMeals}
      weekMealsLoading={weekMealsLoading}
      onWeekTabOpen={reloadWeekData}
      currentMeal={currentMeal}
      mealInput={mealInput}
      setMealInput={setMealInput}
      addingMeal={addingMeal}
      showWeeklyInsights={showWeeklyInsights}
      setShowWeeklyInsights={setShowWeeklyInsights}
      hungerBefore={hungerBefore}
      setHungerBefore={setHungerBefore}
      satietyAfter={satietyAfter}
      setSatietyAfter={setSatietyAfter}
      showFeelingModal={showFeelingModal}
      setShowFeelingModal={setShowFeelingModal}
      pendingMealId={pendingMealId}
      setPendingMealId={setPendingMealId}
      conseilDuJour={conseilDuJour}
      defiDuJour={defiDuJour}
      selectedDate={selectedDate}
      isSelectedToday={isSelectedToday}
      canGoPrev={canGoPrev}
      canGoNext={canGoNext}
      onPrevDay={goPrevDay}
      onNextDay={goNextDay}
      onGoToday={goToday}
      subscriptionTier={subscriptionTier}
      handleAddMeal={handleAddMeal}
      handleAddMealWithRawText={handleAddMealWithRawText}
      handleDeleteMeal={handleDeleteMeal}
      handleAddFeeling={handleAddFeeling}
      handleSaveFeeling={handleSaveFeeling}
      setCurrentMeal={setCurrentMeal}
      canUsePhotoScan={canUsePhotoScan}
    />
  );
}

interface ScanAnalysis {
  ingredients: { name: string; confidence: number }[];
  mealName?: string;
  advice?: { rating: string; message: string; suggestions?: string[] };
}

interface EquilibrePageContentProps {
  meals: FoodLogEntry[];
  summary: DailySummary | null;
  weeklyInsights: WeeklyInsights | null;
  weekMeals: FoodLogEntry[];
  weekMealsLoading: boolean;
  onWeekTabOpen: () => Promise<void>;
  currentMeal: "breakfast" | "lunch" | "dinner" | "snack";
  mealInput: string;
  setMealInput: (value: string) => void;
  addingMeal: boolean;
  showWeeklyInsights: boolean;
  setShowWeeklyInsights: (value: boolean) => void;
  hungerBefore: number | null;
  setHungerBefore: (value: number | null) => void;
  satietyAfter: number | null;
  setSatietyAfter: (value: number | null) => void;
  showFeelingModal: boolean;
  setShowFeelingModal: (value: boolean) => void;
  pendingMealId: string | null;
  setPendingMealId: (value: string | null) => void;
  conseilDuJour: Tip | null;
  defiDuJour: Challenge | null;
  selectedDate: string;
  isSelectedToday: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onGoToday: () => void;
  subscriptionTier: string | null;
  handleAddMeal: () => Promise<void>;
  handleAddMealWithRawText: (rawText: string, mealType?: "breakfast" | "lunch" | "dinner" | "snack") => Promise<void>;
  handleDeleteMeal: (id: string) => Promise<void>;
  handleAddFeeling: (id: string) => void;
  handleSaveFeeling: () => Promise<void>;
  setCurrentMeal: (meal: "breakfast" | "lunch" | "dinner" | "snack") => void;
  canUsePhotoScan: boolean;
}

type DietitianDailyNote = {
  title: string;
  intro: string;
  highlights: string[];
  improvements: string[];
};

function buildDailyDietitianNote(
  summary: DailySummary | null,
  meals: FoodLogEntry[],
  mealTypeLabels: Record<string, string>
): DietitianDailyNote {
  const totalMeals = meals.length;
  const mealTypesPresent = [...new Set(meals.map((m) => m.meal_type))];
  const prettyMealTypes = mealTypesPresent
    .map((m) => mealTypeLabels[m] || m)
    .join(", ");

  const title =
    summary && summary.score >= 75
      ? "Excellent rythme aujourd'hui"
      : summary && summary.score >= 55
      ? "Bonne base, on affine"
      : "On consolide ton équilibre";

  const intro =
    totalMeals === 0
      ? "Aucun repas enregistré pour cette journée. Ajoute au moins 1 repas pour recevoir une note personnalisée."
      : `Tu as noté ${totalMeals} repas (${prettyMealTypes}). Voici ma lecture rapide de ta journée.`;

  const highlights =
    summary?.strengths?.slice(0, 3).length
      ? summary.strengths.slice(0, 3)
      : totalMeals > 0
      ? [
          "Tu as pris le temps de suivre tes repas, c'est une excellente habitude.",
          "Ton journal permet déjà d'identifier des leviers précis pour progresser.",
        ]
      : ["Commence par noter ton prochain repas pour lancer le suivi."];

  const improvements: string[] = [];
  if (summary?.priority_tip) improvements.push(summary.priority_tip);
  if (summary?.missing_components?.length) {
    improvements.push(`Pense à intégrer: ${summary.missing_components.slice(0, 3).join(", ")}.`);
  }
  if (!improvements.length && totalMeals > 0) {
    improvements.push("Vise une assiette avec une protéine + des fibres + une source de bons gras.");
  }
  if (!improvements.length) {
    improvements.push("Ajoute un repas pour débloquer tes recommandations de la journée.");
  }

  return { title, intro, highlights, improvements };
}

function EquilibrePageContent({
  meals,
  summary,
  weeklyInsights,
  weekMeals,
  weekMealsLoading,
  onWeekTabOpen,
  currentMeal,
  mealInput,
  setMealInput,
  addingMeal,
  showWeeklyInsights,
  setShowWeeklyInsights,
  hungerBefore,
  setHungerBefore,
  satietyAfter,
  setSatietyAfter,
  showFeelingModal,
  setShowFeelingModal,
  pendingMealId,
  setPendingMealId,
  conseilDuJour,
  defiDuJour,
  selectedDate,
  isSelectedToday,
  canGoPrev,
  canGoNext,
  onPrevDay,
  onNextDay,
  onGoToday,
  handleAddMealWithRawText,
  handleDeleteMeal,
  handleAddFeeling,
  handleSaveFeeling,
  setCurrentMeal,
  canUsePhotoScan,
  subscriptionTier,
}: EquilibrePageContentProps) {
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanAnalysis, setScanAnalysis] = useState<ScanAnalysis | null>(null);
  const [manualIngredients, setManualIngredients] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [loadingScan, setLoadingScan] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mealTypeLabels = {
    breakfast: "Petit-déjeuner",
    lunch: "Déjeuner",
    dinner: "Dîner",
    snack: "Collation",
  };
  const dietitianNote = buildDailyDietitianNote(summary, meals, mealTypeLabels as Record<string, string>);

  const handleImageFromScan = async (imageDataUrl: string) => {
    setLoadingScan(true);
    setScanError(null);
    try {
      const auth = await sessionAuthHeaders();
      const res = await fetch("/api/analyze-meal", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", ...auth },
        body: JSON.stringify({ imageBase64: imageDataUrl, locale: getLocale() }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as {
          error?: string;
          details?: string;
          message?: string;
        };
        if (res.status === 403 && err.error === "premium_plus_required" && typeof err.message === "string") {
          throw new Error(err.message);
        }
        const base =
          typeof err.error === "string" && err.error.trim()
            ? err.error.trim()
            : "Erreur lors de l'analyse";
        const detail =
          typeof err.details === "string" && err.details.trim() ? ` — ${err.details.trim()}` : "";
        throw new Error(base + detail);
      }
      const data = await res.json();
      setScanAnalysis({
        ingredients: data.ingredients || [],
        mealName: data.mealName,
        advice: data.advice,
      });
      setManualIngredients([]);
      setManualInput("");
      setShowScanModal(true);
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Erreur lors de l'analyse de la photo");
    } finally {
      setLoadingScan(false);
    }
  };

  const handleSaveScanAsMeal = async () => {
    if (!scanAnalysis) return;
    const detected = scanAnalysis.ingredients.map((i) => i.name);
    const combined = [...detected, ...manualIngredients].filter(Boolean).join(", ");
    if (!combined.trim()) {
      alert(
        "Le repas doit être enregistré dans ton journal (avec au moins un ingrédient ou une description) pour être retrouvé dans « Ma semaine ». Ajoute des aliments détectés ou saisis-les à la main, puis réessaie."
      );
      return;
    }
    await handleAddMealWithRawText(combined);
    setShowScanModal(false);
    setScanAnalysis(null);
    setManualIngredients([]);
    setManualInput("");
  };

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            void handleImageFromScan(dataUrl);
          };
          reader.readAsDataURL(file);
          e.target.value = "";
        }}
      />
      <DietDiaryDayView
        selectedDate={selectedDate}
        isToday={isSelectedToday}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onPrevDay={onPrevDay}
        onNextDay={onNextDay}
        meals={meals}
        summary={summary}
        dietitianNote={dietitianNote}
        defiDuJour={defiDuJour}
        conseilDuJour={conseilDuJour}
        addingMeal={addingMeal}
        canUsePhotoScan={canUsePhotoScan}
        loadingScan={loadingScan}
        subscriptionTier={subscriptionTier}
        onAddMeal={async (mealType, rawText) => {
          setCurrentMeal(mealType);
          await handleAddMealWithRawText(rawText, mealType);
        }}
        onDeleteMeal={(id) => void handleDeleteMeal(id)}
        onAddFeeling={handleAddFeeling}
        onPhotoScanClick={(mealType) => {
          setCurrentMeal(mealType);
          fileInputRef.current?.click();
        }}
      />

      {showFeelingModal && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#FFF0F0] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#6B2E2E] mb-4">Ton ressenti</h3>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-[#6B2E2E] mb-2">Faim avant le repas (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setHungerBefore(val)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        hungerBefore === val
                          ? "bg-[#E94E77] text-white"
                          : "bg-white border border-[var(--beige-border)] text-[#726566]"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#6B2E2E] mb-2">Satiété après le repas (1-5)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSatietyAfter(val)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        satietyAfter === val
                          ? "bg-[#E94E77] text-white"
                          : "bg-white border border-[var(--beige-border)] text-[#726566]"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowFeelingModal(false);
                  setPendingMealId(null);
                  setHungerBefore(null);
                  setSatietyAfter(null);
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-white border border-[var(--beige-border)] text-sm text-[#726566] font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveFeeling}
                disabled={hungerBefore === null || satietyAfter === null}
                className="flex-1 px-4 py-2 rounded-xl bg-[#E94E77] text-white text-sm font-semibold disabled:opacity-50"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modales globales (visibles quel que soit l'onglet) */}
      {/* Modal scan : ingrédients détectés + ajout manuel */}
      {showScanModal && scanAnalysis && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-sm bg-[#FFF0F0] rounded-2xl p-5 shadow-xl">
            <h3 className="text-lg font-bold text-[#6B2E2E] mb-3">
              {scanAnalysis.mealName ? `« ${scanAnalysis.mealName} »` : "Ingrédients détectés"}
            </h3>
            <p className="text-xs text-[#726566] mb-3">
              L’assistant diététicien a repéré les aliments suivants. Tu peux en ajouter (ex. crème fraîche, parmesan).
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {scanAnalysis.ingredients.map((i, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-full bg-[#FFD9D9] text-[#6B2E2E] text-sm"
                >
                  {i.name}
                </span>
              ))}
              {manualIngredients.map((name, idx) => (
                <span
                  key={`m-${idx}`}
                  className="px-2.5 py-1 rounded-full bg-[#E94E77] text-white text-sm flex items-center gap-1"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => setManualIngredients((prev) => prev.filter((_, i) => i !== idx))}
                    className="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (manualInput.trim()) {
                      setManualIngredients((prev) => [...prev, manualInput.trim()]);
                      setManualInput("");
                    }
                  }
                }}
                placeholder="Ex: crème fraîche, parmesan..."
                className="flex-1 rounded-xl border border-[var(--beige-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#E94E77] text-[var(--foreground)]"
              />
              <button
                type="button"
                onClick={() => {
                  if (manualInput.trim()) {
                    setManualIngredients((prev) => [...prev, manualInput.trim()]);
                    setManualInput("");
                  }
                }}
                disabled={!manualInput.trim()}
                className="px-3 py-2 rounded-xl bg-[#E94E77] text-white text-sm font-semibold disabled:opacity-50"
              >
                +
              </button>
            </div>
            {scanAnalysis.advice?.message && (
              <p className="text-xs text-[#726566] mb-4 p-2 bg-white/60 rounded-lg">
                {scanAnalysis.advice.message}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowScanModal(false);
                  setScanAnalysis(null);
                  setManualIngredients([]);
                  setManualInput("");
                }}
                className="flex-1 py-2 rounded-xl bg-white border border-[var(--beige-border)] text-sm text-[#726566] font-semibold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveScanAsMeal}
                disabled={addingMeal}
                className="flex-1 py-2 rounded-xl bg-[#E94E77] text-white text-sm font-semibold hover:bg-[#D63D56] disabled:opacity-50"
              >
                {addingMeal ? "..." : "Enregistrer le repas"}
              </button>
            </div>
          </div>
        </div>
      )}

      {scanError && (
        <div className="fixed top-4 left-4 right-4 z-50 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
          <span>{scanError}</span>
          <button
            type="button"
            onClick={() => setScanError(null)}
            className="underline font-semibold"
          >
            Fermer
          </button>
        </div>
      )}

    </main>
  );
}
