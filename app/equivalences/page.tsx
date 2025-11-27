"use client";

import { useState } from "react";
import { searchEquivalences, type Equivalence, type Alternative } from "../src/lib/equivalences";
import {
  NUTRITION_GOALS,
  searchNutritionEquivalences,
  getCategoriesWithEquivalences,
  type NutritionGoal,
  type EquivalenceCategory,
} from "../src/lib/nutritionGoals";
import { useSwipeBack } from "../hooks/useSwipeBack";
import UserFeedback from "../components/UserFeedback";

type TabType = "recipe" | "nutrition";

const CATEGORY_LABELS: Record<EquivalenceCategory, string> = {
  "féculents": "Féculents",
  "protéines": "Protéines",
  "matières-grasses": "Matières grasses",
  "boissons": "Boissons",
  "snacks": "Snacks",
  "desserts": "Desserts",
  "général": "Conseils généraux",
};

export default function EquivalencesPage() {
  const [activeTab, setActiveTab] = useState<TabType>("recipe");
  const [selectedGoal, setSelectedGoal] = useState<NutritionGoal | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Equivalence[]>([]);

  function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.trim().length > 0) {
      if (activeTab === "recipe") {
        const found = searchEquivalences(query, "recipe");
        setResults(found);
      }
      // Pour nutrition, la recherche se fait dans l'objectif sélectionné
    } else {
      setResults([]);
    }
  }

  function handleTabChange(tab: TabType) {
    setActiveTab(tab);
    setSelectedGoal(null);
    setSearchQuery("");
    setResults([]);
  }

  function handleGoalSelect(goal: NutritionGoal) {
    setSelectedGoal(goal);
    setSearchQuery("");
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-24">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-center">Équivalences</h1>
        <p className="text-sm text-[var(--beige-text-muted)] text-center mt-2">
          Trouve des alternatives pour tes recettes ou ton alimentation quotidienne.
        </p>
      </header>

      {/* Onglets */}
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => handleTabChange("recipe")}
          className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === "recipe"
              ? "bg-[#D44A4A] text-white border border-[#C03A3A]"
              : "bg-[var(--beige-card)] text-[var(--foreground)] border border-[var(--beige-border)] hover:border-[#D44A4A]"
          }`}
        >
          🍳 Pour les recettes
        </button>
        <button
          onClick={() => handleTabChange("nutrition")}
          className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
            activeTab === "nutrition"
              ? "bg-[#D44A4A] text-white border border-[#C03A3A]"
              : "bg-[var(--beige-card)] text-[var(--foreground)] border border-[var(--beige-border)] hover:border-[#D44A4A]"
          }`}
        >
          🥗 Conseils nutritionnels
        </button>
      </div>

      {/* Zone de recherche (uniquement pour recettes) */}
      {activeTab === "recipe" && (
        <section className="mb-5 rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
          <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">
            Rechercher un ingrédient
          </h2>
          <p className="text-xs text-[var(--beige-text-muted)] mb-3">
            Saisis un ingrédient que tu n'as pas ou que tu ne manges pas, et découvre comment le remplacer dans tes recettes.
          </p>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Ex: beurre, œuf, sucre, farine..."
            className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A] placeholder:text-[var(--beige-text-muted)]"
          />
        </section>
      )}

      {/* Résultats pour recettes */}
      {activeTab === "recipe" && searchQuery.trim().length > 0 && (
        <section className="space-y-4">
          {results.length === 0 ? (
            <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
              <p className="text-sm text-[var(--beige-text-muted)] text-center">
                Aucune équivalence trouvée pour &quot;{searchQuery}&quot;.
                <br />
                Essaie avec un autre terme (ex: beurre, œuf, sucre, farine, lait, crème, viande...).
              </p>
            </div>
          ) : (
            results.map((equivalence, idx) => (
              <EquivalenceCard key={idx} equivalence={equivalence} />
            ))
          )}
        </section>
      )}

      {/* Interface conseils nutritionnels */}
      {activeTab === "nutrition" && (
        <>
          {!selectedGoal ? (
            <section className="space-y-4">
              <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
                <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">
                  Choisis ton objectif
                </h2>
                <p className="text-xs text-[var(--beige-text-muted)] mb-4">
                  Sélectionne un objectif pour découvrir des conseils et équivalences adaptés.
                </p>
                <div className="space-y-3">
                  {Object.values(NUTRITION_GOALS).map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => handleGoalSelect(goal.id)}
                      className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-4 py-3 text-left hover:border-[#D44A4A] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{goal.icon}</span>
                        <div>
                          <p className="font-semibold text-sm text-[var(--foreground)]">
                            {goal.title}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <NutritionGoalView
              goal={selectedGoal}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onBack={() => setSelectedGoal(null)}
            />
          )}
        </>
      )}

      {/* Message d'aide si pas de recherche (recettes uniquement) */}
      {activeTab === "recipe" && searchQuery.trim().length === 0 && (
        <section className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
          <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">
            Comment ça marche ?
          </h2>
          <div className="space-y-2 text-sm text-[var(--beige-text-muted)]">
            {activeTab === "recipe" ? (
              <>
                <p>
                  Si tu vois une recette avec un ingrédient que tu n&apos;as pas ou que tu ne manges pas, 
                  utilise cet outil pour trouver des alternatives.
                </p>
                <p className="font-semibold text-[var(--foreground)] mt-3">
                  Exemples d&apos;ingrédients à rechercher :
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Beurre (en pâtisserie ou sur tartines)</li>
                  <li>Œuf (pour pâtisseries)</li>
                  <li>Sucre (alternatives plus saines)</li>
                  <li>Farine blanche (versions complètes)</li>
                  <li>Lait ou crème (alternatives végétales)</li>
                  <li>Viande hachée (alternatives végétales)</li>
                  <li>Sel (réduction et alternatives)</li>
                </ul>
              </>
            ) : (
              <>
                <p>
                  Découvre comment remplacer des aliments du quotidien par des alternatives plus équilibrées 
                  pour améliorer ton alimentation.
                </p>
                <p className="font-semibold text-[var(--foreground)] mt-3">
                  Exemples d&apos;aliments à rechercher :
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Céréales chocolatées (petit déjeuner)</li>
                  <li>Croissant ou brioche (viennoiseries)</li>
                  <li>Soda ou jus de fruits (boissons)</li>
                  <li>Riz blanc ou pâtes blanches (féculents)</li>
                  <li>Mayonnaise (sauces)</li>
                  <li>Glace (desserts)</li>
                  <li>Frites (accompagnements)</li>
                </ul>
              </>
            )}
          </div>
        </section>
      )}

      {/* Section Retour utilisateur */}
      <UserFeedback />
    </main>
  );
}

function EquivalenceCard({ equivalence }: { equivalence: Equivalence }) {
  return (
    <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-[var(--foreground)] capitalize">
          {equivalence.ingredient}
        </h3>
        <p className="text-xs text-[var(--beige-text-muted)] mt-1">
          {equivalence.category}
        </p>
      </div>

      <div className="space-y-4">
        {equivalence.alternatives.map((alt, altIdx) => (
          <AlternativeCard key={altIdx} alternative={alt} />
        ))}
      </div>
    </div>
  );
}

function AlternativeCard({ alternative }: { alternative: Alternative }) {
  return (
    <div className="rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-3">
      <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">
        {alternative.name}
      </h4>
      
      <div className="space-y-2 text-xs">
        <div className="bg-[var(--beige-card-alt)] rounded-lg px-2 py-2">
          <p className="font-medium text-[var(--foreground)]">
            Équivalence :
          </p>
          <p className="text-[var(--beige-text-light)] mt-1">
            {alternative.equivalence}
          </p>
        </div>

        {alternative.interest && (
          <div>
            <p className="font-medium text-[#D44A4A] mb-1">✓ Intérêt :</p>
            <p className="text-[var(--beige-text-light)]">{alternative.interest}</p>
          </div>
        )}

        {alternative.idealFor && (
          <div>
            <p className="font-medium text-[#D44A4A] mb-1">⭐ Idéal pour :</p>
            <p className="text-[var(--beige-text-light)]">{alternative.idealFor}</p>
          </div>
        )}

        {alternative.variant && (
          <div>
            <p className="font-medium text-[#D44A4A] mb-1">🔄 Variante :</p>
            <p className="text-[var(--beige-text-light)]">{alternative.variant}</p>
          </div>
        )}

        {alternative.remarks && (
          <div>
            <p className="font-medium text-[var(--foreground)] mb-1">💡 Remarques :</p>
            <p className="text-[var(--beige-text-light)]">{alternative.remarks}</p>
          </div>
        )}

        {alternative.limits && (
          <div>
            <p className="font-medium text-orange-600 mb-1">⚠️ Limites :</p>
            <p className="text-[var(--beige-text-light)]">{alternative.limits}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NutritionGoalView({
  goal,
  searchQuery,
  onSearchChange,
  onBack,
}: {
  goal: NutritionGoal;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onBack: () => void;
}) {
  const goalData = NUTRITION_GOALS[goal];
  const equivalences = searchQuery.trim().length > 0
    ? searchNutritionEquivalences(goal, searchQuery)
    : goalData.equivalences;
  const categories = getCategoriesWithEquivalences(goal);

  // Activer le geste de balayage pour revenir en arrière
  useSwipeBack(onBack, true);

  return (
    <div className="space-y-4">
      {/* Bouton retour */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--beige-text-muted)] hover:text-[var(--foreground)] flex items-center gap-2"
      >
        ← Retour aux objectifs
      </button>

      {/* En-tête objectif */}
      <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">{goalData.icon}</span>
          <h2 className="text-xl font-bold text-[var(--foreground)]">
            {goalData.title}
          </h2>
        </div>

        {/* Avertissement si présent */}
        {goalData.warning && (
          <div className="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
            <p className="text-xs text-orange-800">{goalData.warning}</p>
          </div>
        )}

        {/* Principes clés */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">
            Principes clés
          </h3>
          <ul className="space-y-2">
            {goalData.keyPrinciples.map((principle, idx) => (
              <li key={idx} className="text-xs text-[var(--beige-text-light)] flex items-start gap-2">
                <span className="text-[#D44A4A] mt-1">•</span>
                <span>{principle}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recherche */}
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une équivalence..."
            className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A] placeholder:text-[var(--beige-text-muted)]"
          />
        </div>
      </div>

      {/* Équivalences par catégorie */}
      {categories.length === 0 ? (
        <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
          <p className="text-sm text-[var(--beige-text-muted)] text-center">
            Aucune équivalence trouvée pour &quot;{searchQuery}&quot;.
          </p>
        </div>
      ) : (
        categories.map((category) => {
          const categoryEquivalences = equivalences[category];
          if (categoryEquivalences.length === 0) return null;

          return (
            <div
              key={category}
              className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4"
            >
              <h3 className="text-base font-semibold text-[var(--foreground)] mb-3">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="space-y-3">
                {categoryEquivalences.map((eq, idx) => (
                  <NutritionEquivalenceCard key={idx} equivalence={eq} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function NutritionEquivalenceCard({
  equivalence,
}: {
  equivalence: {
    baseFood: string;
    substitute: string;
    baseQuantity: string;
    substituteQuantity: string;
    interest: string;
    context?: string;
  };
}) {
  return (
    <div className="rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-[var(--foreground)] flex-1">
          {equivalence.baseFood}
        </h4>
        {equivalence.context && (
          <span className="text-[10px] px-2 py-1 rounded-full bg-[var(--beige-card-alt)] text-[var(--beige-text-muted)]">
            {equivalence.context}
          </span>
        )}
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[var(--beige-text-muted)]">→</span>
          <span className="font-medium text-[var(--foreground)]">
            {equivalence.substitute}
          </span>
        </div>

        <div className="bg-[var(--beige-card-alt)] rounded-lg px-2 py-2">
          <p className="text-[var(--beige-text-light)]">
            <span className="font-medium">{equivalence.baseQuantity}</span>
            {" → "}
            <span className="font-medium">{equivalence.substituteQuantity}</span>
          </p>
        </div>

        <div>
          <p className="font-medium text-[#D44A4A] mb-1">✓ Intérêt :</p>
          <p className="text-[var(--beige-text-light)]">{equivalence.interest}</p>
        </div>
      </div>
    </div>
  );
}

