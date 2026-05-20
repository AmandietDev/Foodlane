"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePremium } from "../contexts/PremiumContext";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { supabase } from "../src/lib/supabaseClient";
import LoadingSpinner from "../components/LoadingSpinner";
import { loadPreferences } from "../src/lib/userPreferences";
import { selectDailyTip, selectDailyChallenge, type Tip, type Challenge, type ObjectiveTag, type ContextTag } from "../src/lib/dailyTips";
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
        <div className="rounded-xl bg-white/70 p-3 text-xs text-[#726566] border border-dashed border-[#D44A4A]/40">
          Débloqué avec Premium : journal alimentaire, analyse du jour et plan d’actions. Premium Plus ajoute l’analyse photo
          assiette.
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href="/premium"
          className="w-full text-center px-4 py-3 rounded-xl bg-[#D44A4A] text-white font-semibold text-sm hover:bg-[#C03A3A] transition-colors"
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
  const [today, setToday] = useState<string>("");
  const [meals, setMeals] = useState<FoodLogEntry[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [weeklyInsights, setWeeklyInsights] = useState<WeeklyInsights | null>(null);
  const [currentMeal, setCurrentMeal] = useState<"breakfast" | "lunch" | "dinner" | "snack">("breakfast");
  const [mealInput, setMealInput] = useState("");
  const [addingMeal, setAddingMeal] = useState(false);
  const [showPlanTomorrow, setShowPlanTomorrow] = useState(false);
  const [showWeeklyInsights, setShowWeeklyInsights] = useState(false);
  const [hungerBefore, setHungerBefore] = useState<number | null>(null);
  const [satietyAfter, setSatietyAfter] = useState<number | null>(null);
  const [showFeelingModal, setShowFeelingModal] = useState(false);
  const [pendingMealId, setPendingMealId] = useState<string | null>(null);
  const [conseilDuJour, setConseilDuJour] = useState<Tip | null>(null);
  const [defiDuJour, setDefiDuJour] = useState<Challenge | null>(null);

  useEffect(() => {
    if (sessionLoading || premiumLoading) return;
    const todayStr = new Date().toISOString().split("T")[0];
    setToday(todayStr);
    if (!canAccessDietAssistant) return;
    void loadTodayData(todayStr);
    void loadWeeklyInsights();
    void generateDailyTips().catch((error) => {
      console.error("[Equilibre] Erreur génération conseils/défis:", error);
    });
  }, [sessionLoading, premiumLoading, canAccessDietAssistant]);

  async function generateDailyTips() {
    const preferences = loadPreferences();
    
    // Convertir les objectifs utilisateur en ObjectiveTag
    const userObjectives: ObjectiveTag[] = [];
    const objectifsUsage = preferences.objectifsUsage || [];
    if (objectifsUsage.includes("Perte de poids")) userObjectives.push("weight_loss");
    if (objectifsUsage.includes("Prise de masse")) userObjectives.push("muscle_gain");
    if (objectifsUsage.includes("Réduire la viande")) userObjectives.push("reduce_meat");
    if (objectifsUsage.includes("Cuisiner plus")) userObjectives.push("cook_more");
    if (objectifsUsage.includes("Meilleure énergie")) userObjectives.push("better_energy");
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


  async function loadTodayData(date: string) {
    setLoading(true);
    try {
      // Charger les repas du jour
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const { data: mealsData, error: mealsError } = await supabase
        .from("food_log_entries")
        .select("*")
        .eq("date", date)
        .order("created_at", { ascending: true });

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

      const authHeaders: Record<string, string> = {};
      if (session.access_token) {
        authHeaders.Authorization = `Bearer ${session.access_token}`;
      }

      // Charger le résumé du jour
      const summaryRes = await fetch(`/api/foodlog/summary?date=${date}`, { headers: authHeaders });
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }
    } catch (error) {
      console.error("[Equilibre] Erreur:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadWeeklyInsights() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const d = new Date();
      const dayOfWeek = d.getDay();
      const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lundi de la semaine
      const monday = new Date(d);
      monday.setDate(diff);
      const weekStart = monday.toISOString().split("T")[0];

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
  }

  async function handleAddMeal() {
    if (!mealInput.trim()) return;
    await handleAddMealWithRawText(mealInput.trim());
    setMealInput("");
    setHungerBefore(null);
    setSatietyAfter(null);
    setShowFeelingModal(false);
    setPendingMealId(null);
  }

  async function handleAddMealWithRawText(rawText: string) {
    if (!rawText.trim()) return;

    setAddingMeal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        alert("Tu dois être connecté pour ajouter un repas");
        return;
      }

      const res = await fetch("/api/foodlog/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          date: today,
          meal_type: currentMeal,
          raw_text: rawText.trim(),
          hunger_before: hungerBefore || undefined,
          satiety_after: satietyAfter || undefined,
          userId: session.user.id,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erreur lors de l'ajout");
      }

      await loadTodayData(today);
      await loadWeeklyInsights();
    } catch (error) {
      console.error("[Equilibre] Erreur ajout repas:", error);
      const msg =
        error instanceof Error ? error.message : "Erreur lors de l'ajout du repas";
      alert(
        `${msg}\n\nAstuce : le repas doit être enregistré dans ton journal (bouton « Ajouter ») pour être retrouvé dans l’onglet « Ma semaine ».`
      );
    } finally {
      setAddingMeal(false);
    }
  }

  async function handleDeleteMeal(entryId: string) {
    try {
      const { error } = await supabase
        .from("food_log_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;

      await loadTodayData(today);
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
      const { error } = await supabase
        .from("food_log_entries")
        .update({
          hunger_before: hungerBefore,
          satiety_after: satietyAfter,
        })
        .eq("id", pendingMealId);

      if (error) throw error;

      await loadTodayData(today);
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
          className="inline-block px-4 py-3 rounded-xl bg-[#D44A4A] text-white font-semibold text-sm hover:bg-[#C03A3A] transition-colors"
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
      currentMeal={currentMeal}
      mealInput={mealInput}
      setMealInput={setMealInput}
      addingMeal={addingMeal}
      showPlanTomorrow={showPlanTomorrow}
      setShowPlanTomorrow={setShowPlanTomorrow}
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
      today={today}
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
  currentMeal: "breakfast" | "lunch" | "dinner" | "snack";
  mealInput: string;
  setMealInput: (value: string) => void;
  addingMeal: boolean;
  showPlanTomorrow: boolean;
  setShowPlanTomorrow: (value: boolean) => void;
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
  today: string;
  subscriptionTier: string | null;
  handleAddMeal: () => Promise<void>;
  handleAddMealWithRawText: (rawText: string) => Promise<void>;
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
      ? "Aucun repas enregistré pour aujourd'hui. Ajoute au moins 1 repas pour recevoir une note ultra personnalisée."
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
  currentMeal,
  mealInput,
  setMealInput,
  addingMeal,
  showPlanTomorrow,
  setShowPlanTomorrow,
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
  today,
  handleAddMeal,
  handleAddMealWithRawText,
  handleDeleteMeal,
  handleAddFeeling,
  handleSaveFeeling,
  setCurrentMeal,
  canUsePhotoScan,
  subscriptionTier,
}: EquilibrePageContentProps) {
  const [activePart, setActivePart] = useState<"repas" | "semaine">("repas");
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanAnalysis, setScanAnalysis] = useState<ScanAnalysis | null>(null);
  const [manualIngredients, setManualIngredients] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState("");
  const [loadingScan, setLoadingScan] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFullDietitianAnalysis, setShowFullDietitianAnalysis] = useState(false);

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
        const err = await res.json().catch(() => ({}));
        if (res.status === 403 && err.error === "premium_plus_required" && typeof err.message === "string") {
          throw new Error(err.message);
        }
        throw new Error(err.error || "Erreur lors de l'analyse");
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
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">Assistant diététicien</h1>
        <p className="text-sm text-[var(--beige-text-light)] mt-2 leading-relaxed">
          Ton assistant diététicien en 2 volets : repas du jour et équilibre de la semaine
        </p>
      </header>

      {/* Onglets Mon repas / Ma semaine */}
      <div className="flex rounded-2xl border border-white/60 bg-white/45 backdrop-blur-md shadow-sm p-1.5 mb-6">
        <button
          type="button"
          onClick={() => setActivePart("repas")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activePart === "repas"
              ? "bg-[#D44A4A] text-white shadow-sm"
              : "text-[var(--beige-text-light)] hover:bg-white/60"
          }`}
        >
          Mon repas
        </button>
        <button
          type="button"
          onClick={() => setActivePart("semaine")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activePart === "semaine"
              ? "bg-[#D44A4A] text-white shadow-sm"
              : "text-[var(--beige-text-light)] hover:bg-white/60"
          }`}
        >
          Ma semaine
        </button>
      </div>

      {activePart === "repas" && (
        <>
      {/* Conseil du jour */}
      {conseilDuJour && (
        <section className="mb-4 rounded-2xl border border-white/70 bg-white/55 backdrop-blur-md p-4 shadow-sm">
          <h2 className="text-sm font-semibold mb-2 text-[#6B2E2E] flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FFE4E4] text-[#D44A4A]">✦</span>
            <span>Conseil du jour</span>
          </h2>
          <p className="text-sm text-[#726566]">{conseilDuJour.text}</p>
        </section>
      )}

      {/* Journal alimentaire — saisie d’abord, puis score & analyse */}
      <section className="mb-6 rounded-3xl border border-white/70 bg-white/55 backdrop-blur-md p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Journal alimentaire</h2>
          <p className="mt-1 text-[11px] text-[#8A6F6F] leading-relaxed">
            Décris ton repas pour ce créneau, puis ouvre l’analyse : score sur la journée et conseils de l’assistant.
          </p>
        </div>

        {/* Analyse photo — placée juste sous le titre du journal */}
        <div className="mb-4">
          {canUsePhotoScan ? (
            <>
              <p className="text-xs font-semibold text-[#6B2E2E] mb-2">Analyse photo</p>
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loadingScan}
                className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-[#D44A4A]/70 bg-white/70 text-[#6B2E2E] font-semibold text-sm flex items-center justify-center gap-2"
              >
                {loadingScan ? <>⏳ Analyse en cours...</> : <>📷 Choisir une photo (galerie ou appareil)</>}
              </button>
              <p className="text-[10px] text-[#8A6F6F] mt-2 leading-relaxed">
                Sur téléphone, sans attribut « appareil photo uniquement », le système te laisse ouvrir la galerie ou l’appareil photo selon ton choix.
              </p>
            </>
          ) : (
            <div className="rounded-xl border border-[var(--beige-border)] bg-white/70 p-4 text-center">
              <p className="text-sm font-semibold text-[#6B2E2E] mb-1">Analyse photo : réservée Premium Plus</p>
              <p className="text-xs text-[#726566] mb-3">
                Tu peux déjà tout noter en texte un peu plus bas. Pour <strong>scanner ton assiette</strong> et enrichir
                l’analyse avec la vision, passe à <strong>Premium Plus</strong>.
              </p>
              <Link
                href="/premium"
                className="inline-block text-xs font-semibold text-[#D44A4A] underline underline-offset-2"
              >
                Voir Premium Plus
              </Link>
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="flex gap-2 flex-wrap">
            {(["breakfast", "lunch", "dinner", "snack"] as const).map((meal) => (
              <button
                key={meal}
                type="button"
                onClick={() => setCurrentMeal(meal)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  currentMeal === meal
                    ? "bg-[#D44A4A] text-white"
                    : "bg-white text-[var(--foreground)] border border-[var(--beige-border)]"
                }`}
              >
                {mealTypeLabels[meal]}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={mealInput}
              onChange={(e) => setMealInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAddMeal();
                }
              }}
              placeholder="Ex: Salade de quinoa, poulet..."
              className="flex-1 rounded-xl border border-[var(--beige-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#D44A4A] text-[var(--foreground)]"
              disabled={addingMeal}
            />
            <button
              type="button"
              onClick={() => void handleAddMeal()}
              disabled={addingMeal || !mealInput.trim()}
              className="px-4 py-2 rounded-xl bg-[#D44A4A] text-white font-semibold hover:bg-[#C03A3A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingMeal ? "..." : "Ajouter"}
            </button>
          </div>
          <p className="text-[10px] text-[#8A6F6F] mt-2">
            Une fois enregistré ici, le repas est pris en compte pour la journée et apparaît dans l’onglet « Ma semaine ».
          </p>
        </div>

        <div className="space-y-3 mb-4">
          {(["breakfast", "lunch", "dinner", "snack"] as const).map((mealType) => {
            const mealsOfType = meals.filter((m) => m.meal_type === mealType);
            if (mealsOfType.length === 0) return null;

            return (
              <div key={mealType} className="border border-[#EDDCDC] rounded-xl p-3 bg-white/85">
                <h3 className="text-xs font-semibold mb-2 text-[var(--foreground)]">{mealTypeLabels[mealType]}</h3>
                <div className="space-y-2">
                  {mealsOfType.map((entry) => (
                    <div key={entry.id} className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm text-[var(--foreground)]">{entry.raw_text}</p>
                        {entry.parsed?.items && entry.parsed.items.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.parsed.items.slice(0, 3).map((item: { name?: string }, idx: number) => (
                              <span
                                key={idx}
                                className="text-[8px] px-1.5 py-0.5 rounded-full bg-[var(--beige-rose)] text-[#726566]"
                              >
                                {item.name}
                              </span>
                            ))}
                          </div>
                        )}
                        {entry.confidence < 50 && (
                          <p className="text-[10px] text-orange-600 mt-1">⚠️ Analyse incertaine</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {(!entry.hunger_before || !entry.satiety_after) && (
                          <button
                            type="button"
                            onClick={() => handleAddFeeling(entry.id)}
                            className="text-xs px-2 py-1 rounded bg-[var(--beige-rose)] text-[#726566] hover:bg-[var(--beige-border)] transition-colors"
                            title="Ajouter ressenti"
                          >
                            💭
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDeleteMeal(entry.id)}
                          className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {meals.length === 0 && (
          <div className="text-center py-6 mb-2">
            <p className="text-sm text-[var(--beige-text-light)]">
              Commence par décrire ce que tu manges pour ce créneau.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-[#EEDDDD] bg-[#FFFDFD] p-4 mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-semibold text-[#6B2E2E]">Score du jour</span>
            <span className="text-xl font-bold text-[#6B2E2E]">
              {summary ? `${summary.score}/100` : meals.length > 0 ? "…" : "—"}
            </span>
          </div>
          {summary ? (
            <div className="w-full bg-white/70 rounded-full h-2 overflow-hidden mb-3">
              <div
                className={`h-full rounded-full transition-all ${
                  summary.score >= 70 ? "bg-green-500" : summary.score >= 50 ? "bg-yellow-500" : "bg-orange-500"
                }`}
                style={{ width: `${Math.min(100, summary.score)}%` }}
              />
            </div>
          ) : (
            <p className="text-xs text-[#726566] mb-3">
              Le score s’affiche lorsque ton résumé du jour est prêt (souvent juste après l’ajout d’un repas).
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowFullDietitianAnalysis((v) => !v)}
            className="w-full text-left text-sm font-semibold text-[#D44A4A] underline underline-offset-2 py-1"
          >
            {showFullDietitianAnalysis
              ? "Masquer l’analyse de mon assistant diététicien"
              : "Voir l’analyse de mon assistant diététicien"}
          </button>

          {showFullDietitianAnalysis && (
            <div className="mt-4 space-y-4 border-t border-[#EDDCDC] pt-4">
              <div>
                <h3 className="font-semibold text-[#3E2A2A] mb-1">{dietitianNote.title}</h3>
                <p className="text-sm text-[#6D5B5B] leading-relaxed">{dietitianNote.intro}</p>
              </div>
              <div className="rounded-xl border border-[#DDF1E4] bg-[#F6FFFA] p-3">
                <p className="text-xs font-semibold text-[#2E7A4B] mb-2">Ce qui est bien aujourd&apos;hui</p>
                <ul className="space-y-1.5">
                  {dietitianNote.highlights.map((h, idx) => (
                    <li key={idx} className="text-sm text-[#4F5F55] flex items-start gap-2">
                      <span className="mt-0.5 text-[#2E9F61]">✓</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[#F3E4CF] bg-[#FFFBF5] p-3">
                <p className="text-xs font-semibold text-[#9A6A26] mb-2">Axes d&apos;amélioration</p>
                <ul className="space-y-1.5">
                  {dietitianNote.improvements.map((tip, idx) => (
                    <li key={idx} className="text-sm text-[#6D5B5B] flex items-start gap-2">
                      <span className="mt-0.5 text-[#C28A39]">→</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {summary && summary.strengths.length > 0 && (
                <div className="rounded-xl border border-[#D44A4A]/20 bg-white p-3">
                  <p className="text-xs font-semibold text-[#6B2E2E] mb-2">Synthèse détaillée</p>
                  <ul className="space-y-1">
                    {summary.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-[#726566] flex gap-2">
                        <span className="text-green-600">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                  {summary.priority_tip && (
                    <p className="mt-2 text-sm text-[#6D5B5B]">{summary.priority_tip}</p>
                  )}
                  {summary.tip_options.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {summary.tip_options.map((option, idx) => (
                        <li key={idx} className="text-xs text-[#726566]">
                          • {option}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {subscriptionTier !== "premium_plus" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-3">
                  <p className="text-sm font-semibold text-[#6B2E2E]">Analyse plus poussée et personnalisée</p>
                  <p className="mt-1 text-xs text-[#726566] leading-relaxed">
                    Avec <strong>Premium Plus</strong> : analyse photo de l’assiette, lecture plus fine des repas et suivi
                    avancé. Passe au plan Premium Plus pour une lecture sur-mesure.
                  </p>
                  <Link
                    href="/premium"
                    className="mt-2 inline-block text-xs font-semibold text-[#D44A4A] underline underline-offset-2"
                  >
                    Découvrir Premium Plus
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {defiDuJour && (
          <section className="mb-4 rounded-2xl border border-white/70 bg-white/55 backdrop-blur-md p-4 shadow-sm">
            <h2 className="text-sm font-semibold mb-2 text-[#6B2E2E] flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FFE4E4] text-[#D44A4A]">
                ◎
              </span>
              <span>Défi pour demain</span>
              {defiDuJour.duration_min && defiDuJour.duration_min > 0 && (
                <span className="text-xs text-[#726566] ml-auto">
                  {defiDuJour.duration_min < 1 ? "< 1 min" : `${Math.round(defiDuJour.duration_min)} min`}
                </span>
              )}
            </h2>
            <p className="text-sm font-medium text-[#6B2E2E] mb-1">{defiDuJour.action}</p>
            <p className="text-xs text-[#726566] italic">{defiDuJour.why}</p>
          </section>
        )}

        {summary?.plan_for_tomorrow && (
          <>
            <button
              type="button"
              onClick={() => setShowPlanTomorrow(!showPlanTomorrow)}
              className="w-full mb-3 px-4 py-2.5 rounded-xl border border-[#D44A4A]/40 bg-white text-[#6B2E2E] text-sm font-semibold hover:bg-[#FFF5F5] transition-colors"
            >
              {showPlanTomorrow ? "Masquer" : "Voir"} mes conseils concrets pour demain
            </button>
            {showPlanTomorrow && (
              <div className="mb-4 space-y-3 rounded-xl border border-[var(--beige-border)] bg-white p-3">
                {Object.entries(summary.plan_for_tomorrow).map(([mealType, suggestions]) => (
                  <div key={mealType}>
                    <h3 className="text-xs font-semibold text-[#6B2E2E] mb-1">
                      {mealTypeLabels[mealType as keyof typeof mealTypeLabels]}
                    </h3>
                    <ul className="space-y-0.5">
                      {suggestions.map((suggestion, idx) => (
                        <li key={idx} className="text-xs text-[#726566]">
                          • {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

      </section>

      {/* Modal ressenti */}
      {showFeelingModal && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#FFF0F0] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#6B2E2E] mb-4">Ton ressenti</h3>
            
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-[#6B2E2E] mb-2">
                  Faim avant le repas (1-5)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
              <button
                      key={val}
                      onClick={() => setHungerBefore(val)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        hungerBefore === val
                          ? "bg-[#D44A4A] text-white"
                          : "bg-white border border-[var(--beige-border)] text-[#726566]"
                      }`}
                    >
                      {val}
              </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#6B2E2E] mb-2">
                  Satiété après le repas (1-5)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      onClick={() => setSatietyAfter(val)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        satietyAfter === val
                          ? "bg-[#D44A4A] text-white"
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
              onClick={() => {
                  setShowFeelingModal(false);
                  setPendingMealId(null);
                  setHungerBefore(null);
                  setSatietyAfter(null);
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-white border border-[var(--beige-border)] text-sm text-[#726566] font-semibold hover:border-[var(--beige-accent)] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveFeeling}
                disabled={hungerBefore === null || satietyAfter === null}
                className="flex-1 px-4 py-2 rounded-xl bg-[#D44A4A] text-white text-sm font-semibold hover:bg-[#C03A3A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enregistrer
            </button>
            </div>
          </div>
        </div>
      )}

        </>
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
                  className="px-2.5 py-1 rounded-full bg-[#D44A4A] text-white text-sm flex items-center gap-1"
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
                className="flex-1 rounded-xl border border-[var(--beige-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#D44A4A] text-[var(--foreground)]"
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
                className="px-3 py-2 rounded-xl bg-[#D44A4A] text-white text-sm font-semibold disabled:opacity-50"
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
                className="flex-1 py-2 rounded-xl bg-[#D44A4A] text-white text-sm font-semibold hover:bg-[#C03A3A] disabled:opacity-50"
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

      {activePart === "semaine" && (
        <section className="space-y-6">
          <div className="rounded-2xl border border-white/70 bg-white/60 backdrop-blur-md p-4 shadow-sm">
            <p className="text-sm text-[#6B2E2E] font-medium">
              L’équilibre sur plusieurs jours compte plus qu’un repas parfait.
            </p>
            <p className="text-xs text-[#726566] mt-2">
              Ici tu retrouves les tendances de ta semaine et une action simple pour progresser.
            </p>
          </div>
          {weeklyInsights ? (
            <section className="rounded-2xl border border-white/70 bg-white/60 backdrop-blur-md p-4 shadow-sm">
              <h2 className="text-lg font-bold text-[#6B2E2E] mb-3">Cette semaine</h2>
              <div className="space-y-3">
                {Object.entries(weeklyInsights.patterns).map(([key, value]) => (
                  <div key={key} className="text-sm text-[#726566]">
                    {value}
                  </div>
                ))}
                {weeklyInsights.one_action && (
                  <div className="p-3 bg-[#FFD9D9] rounded-xl border border-[#D44A4A]/30">
                    <p className="text-sm font-semibold text-[#6B2E2E] mb-1">1 mini défi :</p>
                    <p className="text-sm text-[#726566]">{weeklyInsights.one_action}</p>
                  </div>
                )}
              </div>
            </section>
          ) : (
            <div className="rounded-2xl border border-white/70 bg-white/60 backdrop-blur-md p-6 text-center shadow-sm">
              <p className="text-sm text-[var(--beige-text-light)]">
                Ajoute des repas pendant la semaine pour voir tes tendances et ton défi.
              </p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
