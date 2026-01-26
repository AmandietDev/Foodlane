"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePremium } from "../contexts/PremiumContext";
import { supabase } from "../src/lib/supabaseClient";
import LoadingSpinner from "../components/LoadingSpinner";
import { loadPreferences } from "../src/lib/userPreferences";
import { selectDailyTip, selectDailyChallenge, type Tip, type Challenge, type ObjectiveTag, type ContextTag } from "../src/lib/dailyTips";
import { getTodayTips, getRecentIds, addToHistory } from "../src/lib/dailyTipsHistory";
import PremiumGate from "../components/PremiumGate";

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

export default function EquilibrePage() {
  const { isPremium, loading: premiumLoading } = usePremium();
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
    const todayStr = new Date().toISOString().split("T")[0];
    setToday(todayStr);
    loadTodayData(todayStr);
    loadWeeklyInsights();
    generateDailyTips().catch(error => {
      console.error("[Equilibre] Erreur génération conseils/défis:", error);
    });
  }, []);

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
        console.error("[Equilibre] Erreur chargement repas:", mealsError);
      } else {
        setMeals(mealsData || []);
      }

      // Charger le résumé du jour
      const summaryRes = await fetch(`/api/foodlog/summary?date=${date}`);
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
        const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Lundi de la semaine
      const monday = new Date(today.setDate(diff));
      const weekStart = monday.toISOString().split("T")[0];

      const res = await fetch(`/api/foodlog/weekly?week_start=${weekStart}`);
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
          raw_text: mealInput.trim(),
          hunger_before: hungerBefore || undefined,
          satiety_after: satietyAfter || undefined,
          userId: session.user.id, // Passer aussi dans le body pour compatibilité
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erreur lors de l'ajout");
      }

      const data = await res.json();
      
      // Mettre à jour les repas et le résumé
      await loadTodayData(today);
      
      // Réinitialiser le formulaire
      setMealInput("");
      setHungerBefore(null);
      setSatietyAfter(null);
      setShowFeelingModal(false);
      setPendingMealId(null);
    } catch (error) {
      console.error("[Equilibre] Erreur ajout repas:", error);
      alert(error instanceof Error ? error.message : "Erreur lors de l'ajout du repas");
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

  // Protéger la page avec PremiumGate
  return (
    <PremiumGate mode="page" featureName="L'assistant diététicien">
      {premiumLoading || loading ? (
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
          handleAddMeal={handleAddMeal}
          handleDeleteMeal={handleDeleteMeal}
          handleAddFeeling={handleAddFeeling}
          handleSaveFeeling={handleSaveFeeling}
          setCurrentMeal={setCurrentMeal}
        />
      )}
    </PremiumGate>
  );
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
  handleAddMeal: () => Promise<void>;
  handleDeleteMeal: (id: string) => Promise<void>;
  handleAddFeeling: (id: string) => void;
  handleSaveFeeling: () => Promise<void>;
  setCurrentMeal: (meal: "breakfast" | "lunch" | "dinner" | "snack") => void;
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
  handleDeleteMeal,
  handleAddFeeling,
  handleSaveFeeling,
  setCurrentMeal,
}: EquilibrePageContentProps) {
  const mealTypeLabels = {
    breakfast: "Petit-déjeuner",
    lunch: "Déjeuner",
    dinner: "Dîner",
    snack: "Collation",
  };

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Équilibre</h1>
        <p className="text-sm text-[var(--beige-text-light)] mt-2">
          Ton assistant diététicien personnel
        </p>
      </header>

      {/* Conseil du jour */}
      {conseilDuJour && (
        <section className="mb-6 rounded-2xl border border-[#D44A4A] bg-[#FFD9D9] p-4">
          <h2 className="text-sm font-semibold mb-2 text-[#6B2E2E] flex items-center gap-2">
            <span>💡</span>
            <span>Conseil du jour</span>
          </h2>
          <p className="text-sm text-[#726566]">{conseilDuJour.text}</p>
        </section>
      )}

      {/* Défi du jour */}
      {defiDuJour && (
        <section className="mb-6 rounded-2xl border border-[#D44A4A] bg-[#FFD9D9] p-4">
          <h2 className="text-sm font-semibold mb-2 text-[#6B2E2E] flex items-center gap-2">
            <span>🎯</span>
            <span>Défi du jour</span>
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

      {/* Bloc Analyse du jour */}
      {summary && (
        <section className="mb-6 rounded-2xl border border-[var(--beige-border)] bg-gradient-to-br from-[#FFD9D9] to-[#FFC4C4] p-6">
          <h2 className="text-lg font-bold text-[#6B2E2E] mb-4">Analyse du jour</h2>
          
          {/* Score */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-[#6B2E2E]">Score qualité</span>
              <span className="text-2xl font-bold text-[#6B2E2E]">{summary.score}/100</span>
            </div>
            <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  summary.score >= 70 ? "bg-green-500" :
                  summary.score >= 50 ? "bg-yellow-500" :
                  "bg-orange-500"
                }`}
                style={{ width: `${summary.score}%` }}
              />
            </div>
          </div>

          {/* Points forts */}
          {summary.strengths.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[#6B2E2E] mb-2">Ce que tu fais déjà bien :</h3>
              <ul className="space-y-1">
                {summary.strengths.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-[#726566]">
                    <span className="text-green-600 font-bold mt-0.5">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action prioritaire */}
          {summary.priority_tip && (
            <div className="mb-4 p-3 bg-white/60 rounded-xl border border-[#D44A4A]/30">
              <h3 className="text-sm font-semibold text-[#6B2E2E] mb-2">La prochaine action simple :</h3>
              <p className="text-sm text-[#726566] leading-relaxed">{summary.priority_tip}</p>
            </div>
          )}

          {/* Alternatives */}
          {summary.tip_options.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-[#6B2E2E] mb-2">Options :</h3>
              <ul className="space-y-1">
                {summary.tip_options.map((option, idx) => (
                  <li key={idx} className="text-xs text-[#726566]">• {option}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Bouton plan demain */}
          <button
            onClick={() => setShowPlanTomorrow(!showPlanTomorrow)}
            className="w-full px-4 py-2 rounded-xl bg-[#D44A4A] text-white text-sm font-semibold hover:bg-[#C03A3A] transition-colors"
          >
            {showPlanTomorrow ? "Masquer" : "Voir"} mon plan de demain
          </button>
        </section>
      )}

      {/* Bloc Plan de demain */}
      {showPlanTomorrow && summary?.plan_for_tomorrow && (
        <section className="mb-6 rounded-2xl border border-[var(--beige-border)] bg-[var(--beige-card)] p-4">
          <h2 className="text-lg font-bold text-[#6B2E2E] mb-4">Plan de demain</h2>
          <div className="space-y-4">
            {Object.entries(summary.plan_for_tomorrow).map(([mealType, suggestions]) => (
              <div key={mealType} className="border border-[var(--beige-border)] rounded-xl p-3 bg-white">
                <h3 className="text-sm font-semibold text-[#6B2E2E] mb-2">
                  {mealTypeLabels[mealType as keyof typeof mealTypeLabels]}
                </h3>
                <ul className="space-y-1">
                  {suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-xs text-[#726566]">• {suggestion}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Bloc Patterns hebdomadaires */}
      {weeklyInsights && (
      <section className="mb-6 rounded-2xl border border-[var(--beige-border)] bg-[var(--beige-card)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-[#6B2E2E]">Cette semaine</h2>
            <button
              onClick={() => setShowWeeklyInsights(!showWeeklyInsights)}
              className="text-xs text-[#D44A4A] hover:underline"
            >
              {showWeeklyInsights ? "Masquer" : "Voir"}
            </button>
          </div>
          {showWeeklyInsights && (
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
          )}
      </section>
      )}

      {/* Journal alimentaire */}
      <section className="mb-6 rounded-2xl border border-[var(--beige-border)] bg-[var(--beige-card)] p-4">
        <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">Journal alimentaire</h2>
        
        {/* Sélection du repas */}
        <div className="mb-4">
          <div className="flex gap-2 flex-wrap">
            {(["breakfast", "lunch", "dinner", "snack"] as const).map((meal) => (
              <button
                key={meal}
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

        {/* Saisie rapide */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={mealInput}
              onChange={(e) => setMealInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddMeal();
                }
              }}
              placeholder="Ex: Salade de quinoa, poulet..."
              className="flex-1 rounded-xl border border-[var(--beige-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#D44A4A] text-[var(--foreground)]"
              disabled={addingMeal}
            />
            <button
              onClick={handleAddMeal}
              disabled={addingMeal || !mealInput.trim()}
              className="px-4 py-2 rounded-xl bg-[#D44A4A] text-white font-semibold hover:bg-[#C03A3A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingMeal ? "..." : "Ajouter"}
            </button>
          </div>
        </div>

        {/* Liste des repas du jour par type */}
        <div className="space-y-3">
          {(["breakfast", "lunch", "dinner", "snack"] as const).map((mealType) => {
            const mealsOfType = meals.filter(m => m.meal_type === mealType);
            if (mealsOfType.length === 0) return null;

            return (
              <div key={mealType} className="border border-[var(--beige-border)] rounded-xl p-3 bg-white">
                <h3 className="text-xs font-semibold mb-2 text-[var(--foreground)]">
                  {mealTypeLabels[mealType]}
                </h3>
                <div className="space-y-2">
                  {mealsOfType.map((entry) => (
                    <div key={entry.id} className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm text-[var(--foreground)]">{entry.raw_text}</p>
                        {entry.parsed?.items && entry.parsed.items.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.parsed.items.slice(0, 3).map((item: any, idx: number) => (
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
                          <p className="text-[10px] text-orange-600 mt-1">
                            ⚠️ Analyse incertaine
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {(!entry.hunger_before || !entry.satiety_after) && (
                          <button
                            onClick={() => handleAddFeeling(entry.id)}
                            className="text-xs px-2 py-1 rounded bg-[var(--beige-rose)] text-[#726566] hover:bg-[var(--beige-border)] transition-colors"
                            title="Ajouter ressenti"
                          >
                            💭
                          </button>
                        )}
                      <button
                          onClick={() => handleDeleteMeal(entry.id)}
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

        {/* Message si aucun repas */}
        {meals.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-[var(--beige-text-light)]">
              Commence ta journée en ajoutant ce que tu manges !
            </p>
          </div>
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
    </main>
  );
}
