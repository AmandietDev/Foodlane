"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadPreferences } from "../src/lib/userPreferences";
import UserFeedback from "../components/UserFeedback";
import {
  loadNutritionAdvices,
  analyzeMealContext,
  findRelevantAdvices,
  selectBestAdvices,
  type NutritionAdvice,
} from "../src/lib/nutritionAdvices";

interface JournalEntry {
  id: string;
  date: string;
  meals: {
    petitDejeuner?: string[];
    dejeuner?: string[];
    diner?: string[];
    collation?: string[];
  };
}

export default function EquilibrePage() {
  const [isPremium, setIsPremium] = useState(false);
  const [todayEntries, setTodayEntries] = useState<string[]>([]);
  const [currentMeal, setCurrentMeal] = useState<"petitDejeuner" | "dejeuner" | "diner" | "collation">("petitDejeuner");
  const [mealInput, setMealInput] = useState("");
  const [objectifsUsage, setObjectifsUsage] = useState<string[]>([]);
  const [conseilDuJour, setConseilDuJour] = useState<string>("");
  const [showConseilModal, setShowConseilModal] = useState(false);
  const [conseilPersonnalise, setConseilPersonnalise] = useState<string>("");
  const [objectifsConcrets, setObjectifsConcrets] = useState<string[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [expertAdvices, setExpertAdvices] = useState<NutritionAdvice[]>([]);
  const [selectedAdvice, setSelectedAdvice] = useState<NutritionAdvice | null>(null);

  useEffect(() => {
    const preferences = loadPreferences();
    setIsPremium(preferences.abonnementType === "premium");
    setObjectifsUsage(preferences.objectifsUsage || []);

    // Vérifier les permissions de notification
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
      const enabled = localStorage.getItem("foodlane_objectifs_notifications") === "true";
      setNotificationsEnabled(enabled);
    }

    // Charger les entrées du jour depuis localStorage
    const today = new Date().toISOString().split("T")[0];
    const stored = localStorage.getItem(`foodlane_journal_${today}`);
    if (stored) {
      try {
        const entries = JSON.parse(stored) as JournalEntry;
        const allMeals = [
          ...(entries.meals.petitDejeuner || []),
          ...(entries.meals.dejeuner || []),
          ...(entries.meals.diner || []),
          ...(entries.meals.collation || []),
        ];
        setTodayEntries(allMeals);
      } catch (e) {
        console.error("Erreur lors du chargement du journal:", e);
      }
    }

    // Générer un conseil du jour basé sur les objectifs
    generateConseilDuJour(preferences.objectifsUsage || []);

    // Vérifier et programmer les notifications
    checkAndScheduleNotifications();

    // Charger les conseils nutritionnels experts
    loadNutritionAdvices().then((advices) => {
      setExpertAdvices(advices);
    });
  }, []);

  function checkAndScheduleNotifications() {
    if (!("Notification" in window)) return;
    
    const enabled = localStorage.getItem("foodlane_objectifs_notifications") === "true";
    if (!enabled || Notification.permission !== "granted") return;

    const today = new Date().toISOString().split("T")[0];
    const stored = localStorage.getItem(`foodlane_objectifs_${today}`);
    if (!stored) return;

    try {
      const objectifs = JSON.parse(stored) as string[];
      scheduleNotificationsForObjectives(objectifs);
    } catch (e) {
      console.error("Erreur lors du chargement des objectifs:", e);
    }
  }

  function scheduleNotificationsForObjectives(objectifs: string[]) {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    // Sauvegarder les objectifs et l'heure de programmation
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9h du matin

    const notificationData = {
      objectifs: objectifs,
      scheduledTime: tomorrow.getTime(),
      createdAt: Date.now(),
    };

    localStorage.setItem("foodlane_notifications_scheduled", JSON.stringify(notificationData));

    // Programmer des notifications pour demain (fonctionne si l'app est ouverte)
    const time1 = tomorrow.getTime() - Date.now();
    if (time1 > 0 && time1 < 24 * 60 * 60 * 1000) { // Seulement si < 24h
      setTimeout(() => {
        if (Notification.permission === "granted") {
          new Notification("🎯 Tes objectifs du jour", {
            body: objectifs[0] || "Pense à tes objectifs alimentaires aujourd'hui !",
            icon: "/logo.png",
            tag: "objectif-1",
          });
        }
      }, time1);
    }

    // Notification 2 : Rappel après-midi (si plusieurs objectifs)
    if (objectifs.length > 1) {
      const time2 = tomorrow.getTime() - Date.now() + (6 * 60 * 60 * 1000); // +6h = 15h
      if (time2 > 0 && time2 < 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          if (Notification.permission === "granted") {
            new Notification("💡 Rappel objectif", {
              body: objectifs[1] || "N'oublie pas tes objectifs alimentaires !",
              icon: "/logo.png",
              tag: "objectif-2",
            });
          }
        }, time2);
      }
    }
  }

  // Vérifier les notifications programmées au chargement
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const stored = localStorage.getItem("foodlane_notifications_scheduled");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const now = Date.now();
        const scheduledTime = data.scheduledTime;

        // Si la notification est prévue pour aujourd'hui et qu'on est dans la journée
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduledDate = new Date(scheduledTime);
        scheduledDate.setHours(0, 0, 0, 0);

        if (scheduledDate.getTime() === today.getTime() && now >= scheduledTime - (60 * 60 * 1000)) {
          // Envoyer une notification si on est proche de l'heure
          if (now >= scheduledTime - (5 * 60 * 1000) && now <= scheduledTime + (60 * 60 * 1000)) {
            new Notification("🎯 Tes objectifs du jour", {
              body: data.objectifs[0] || "Pense à tes objectifs alimentaires aujourd'hui !",
              icon: "/logo.png",
              tag: "objectif-reminder",
            });
          }
        }
      } catch (e) {
        console.error("Erreur lors de la vérification des notifications:", e);
      }
    }
  }, []);

  async function requestNotificationPermission() {
    if (!("Notification" in window)) {
      alert("Votre navigateur ne supporte pas les notifications.");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    
    if (permission === "granted") {
      return true;
    } else {
      alert("Les notifications sont nécessaires pour te rappeler tes objectifs. Active-les dans les paramètres de ton navigateur.");
      return false;
    }
  }

  function enableNotificationsForObjectives() {
    if (objectifsConcrets.length === 0) {
      alert("Aucun objectif à programmer. Demande d'abord un conseil à ton diététicien.");
      return;
    }

    requestNotificationPermission().then((granted) => {
      if (granted) {
        const today = new Date().toISOString().split("T")[0];
        localStorage.setItem(`foodlane_objectifs_${today}`, JSON.stringify(objectifsConcrets));
        localStorage.setItem("foodlane_objectifs_notifications", "true");
        setNotificationsEnabled(true);
        scheduleNotificationsForObjectives(objectifsConcrets);
        alert("✅ Notifications activées ! Tu recevras des rappels pour tes objectifs demain.");
      }
    });
  }

  function generateConseilDuJour(objectifs: string[]) {
    const conseils: Record<string, string> = {
      "Perte de poids": "Pense à inclure des légumes dans chaque repas pour te rassasier naturellement.",
      "Prise de masse": "N'oublie pas de varier tes sources de protéines tout au long de la journée.",
      "Maintien": "Continue à équilibrer tes repas avec des légumes, des protéines et des féculents.",
      "Performance sportive": "Assure-toi de bien t'hydrater et de manger des glucides avant l'effort.",
      "Santé générale": "Varie les couleurs dans ton assiette pour bénéficier de tous les nutriments.",
    };

    if (objectifs.length > 0) {
      const premierObjectif = objectifs[0];
      setConseilDuJour(conseils[premierObjectif] || conseils["Santé générale"]);
    } else {
      setConseilDuJour(conseils["Santé générale"]);
    }
  }

  function handleAddMeal() {
    if (!mealInput.trim()) return;

    const today = new Date().toISOString().split("T")[0];
    const stored = localStorage.getItem(`foodlane_journal_${today}`);
    let entries: JournalEntry = stored
      ? JSON.parse(stored)
      : { id: today, date: today, meals: {} };

    if (!entries.meals[currentMeal]) {
      entries.meals[currentMeal] = [];
    }

    entries.meals[currentMeal]!.push(mealInput.trim());
    localStorage.setItem(`foodlane_journal_${today}`, JSON.stringify(entries));

    // Mettre à jour l'affichage
    const allMeals = [
      ...(entries.meals.petitDejeuner || []),
      ...(entries.meals.dejeuner || []),
      ...(entries.meals.diner || []),
      ...(entries.meals.collation || []),
    ];
    setTodayEntries(allMeals);
    setMealInput("");
  }

  function handleRemoveMeal(index: number, mealType: string) {
    const today = new Date().toISOString().split("T")[0];
    const stored = localStorage.getItem(`foodlane_journal_${today}`);
    if (!stored) return;

    const entries = JSON.parse(stored) as JournalEntry;
    const mealKey = mealType as keyof typeof entries.meals;
    if (entries.meals[mealKey]) {
      entries.meals[mealKey] = entries.meals[mealKey]!.filter((_, i) => i !== index);
      localStorage.setItem(`foodlane_journal_${today}`, JSON.stringify(entries));

      const allMeals = [
        ...(entries.meals.petitDejeuner || []),
        ...(entries.meals.dejeuner || []),
        ...(entries.meals.diner || []),
        ...(entries.meals.collation || []),
      ];
      setTodayEntries(allMeals);
    }
  }

  function getEquilibreMessage(): string {
    const nbRepas = todayEntries.length;
    if (nbRepas === 0) {
      return "Commence ta journée en ajoutant ce que tu manges !";
    }

    // Analyser la qualité des repas
    const allMealsText = todayEntries.join(" ").toLowerCase();
    const hasLegumes = /salade|tomate|carotte|courgette|poivron|épinard|brocoli|chou|haricot|légume|avocat|concombre/i.test(allMealsText);
    const hasProteines = /poulet|viande|poisson|thon|saumon|œuf|oeuf|fromage|yaourt|protéine|jambon|dinde/i.test(allMealsText);
    const hasFeculents = /pâtes|riz|pain|quinoa|pomme de terre|patate|patate douce|féculent|pomme de terre|pommes de terre|pâtes|pasta/i.test(allMealsText);
    const hasFastFood = /macdo|mcdonald|burger|frite|pizza|kebab|fast.food|restaurant|resto/i.test(allMealsText);
    const hasSucres = /nutella|chocolat|gâteau|gateau|biscuit|bonbon|sucre|sucré|dessert|glace/i.test(allMealsText);
    
    const points = [];
    if (hasLegumes) points.push("légumes");
    if (hasProteines) points.push("protéines");
    if (hasFeculents) points.push("féculents");
    
    // Messages plus réalistes selon la qualité
    if (hasFastFood && points.length < 2) {
      return "Tes repas contiennent du fast-food et manquent de variété. Pour un meilleur équilibre, pense à inclure des légumes et des protéines.";
    }
    if (hasSucres && !hasLegumes && points.length < 2) {
      return "Je remarque des produits sucrés mais peu de variété. Pour un meilleur équilibre, ajoute des légumes et des protéines.";
    }
    if (points.length < 2) {
      return "Tes repas manquent de variété. Pour un meilleur équilibre, pense à inclure des légumes, des protéines et des féculents.";
    }
    if (points.length === 2 && !hasFastFood) {
      return "Tu as bien varié tes repas. Pour un équilibre optimal, pense à ajouter " + (hasLegumes ? "" : "des légumes") + (hasProteines ? "" : "des protéines") + (hasFeculents ? "" : "des féculents") + ".";
    }
    if (points.length >= 3 && !hasFastFood && !hasSucres) {
      return "Excellent équilibre ! Tu as bien varié tes repas aujourd'hui.";
    }
    if (points.length >= 3 && (hasFastFood || hasSucres)) {
      return "Tu as varié tes repas, c'est bien. Pense à limiter le fast-food et les produits sucrés pour un équilibre optimal.";
    }
    
    if (nbRepas < 3) {
      return "Continue, tu es sur la bonne voie !";
    }
    
    return "Tu as noté plusieurs repas aujourd'hui. Analyse-les pour voir comment améliorer ton équilibre.";
  }

  function getObjectifLendemain(): string {
    if (todayEntries.length === 0) {
      return "Ajouter des légumes dans au moins un repas";
    }
    if (todayEntries.length < 3) {
      return "Penser à varier les sources de protéines";
    }
    return "Continuer à équilibrer tes repas comme aujourd'hui";
  }

  function generateConseilPersonnalise(): string {
    const nbRepas = todayEntries.length;
    const allMealsText = todayEntries.join(" ").toLowerCase();
    
    // Analyser les repas pour détecter certains éléments
    const hasLegumes = /salade|tomate|carotte|courgette|poivron|épinard|brocoli|chou|haricot|légume|avocat|concombre/i.test(allMealsText);
    const hasProteines = /poulet|viande|poisson|thon|saumon|œuf|oeuf|fromage|yaourt|protéine|jambon|dinde/i.test(allMealsText);
    const hasFeculents = /pâtes|riz|pain|quinoa|pomme de terre|patate|patate douce|féculent|pomme de terre|pommes de terre|pâtes|pasta/i.test(allMealsText);
    const hasFruits = /fruit|banane|pomme|orange|fraise|raisin|fruit|kiwi|mangue/i.test(allMealsText);
    
    // Détecter les aliments transformés / fast food
    const hasFastFood = /macdo|mcdonald|burger|frite|pizza|kebab|fast.food|restaurant|resto/i.test(allMealsText);
    const hasSucres = /nutella|chocolat|gâteau|gateau|biscuit|bonbon|sucre|sucré|dessert|glace/i.test(allMealsText);
    
    // Analyser la variété et la qualité (déclaré en dehors des blocs pour être accessible partout)
    const points = [];
    if (hasLegumes) points.push("légumes");
    if (hasProteines) points.push("protéines");
    if (hasFeculents) points.push("féculents");
    if (hasFruits) points.push("fruits");
    
    // Conseils basés sur les objectifs
    const objectif = objectifsUsage.length > 0 ? objectifsUsage[0] : "";
    
    let conseil = "";
    
    // Analyse critique mais bienveillante
    if (nbRepas === 0) {
      conseil = "Je remarque que tu n'as pas encore enregistré de repas aujourd'hui. Pour t'aider à mieux comprendre ton équilibre, commence par noter ce que tu manges. C'est la base pour progresser.";
    } else if (nbRepas < 2) {
      conseil = "Tu as noté peu de repas aujourd'hui. Pour un équilibre optimal, il est important de manger régulièrement : petit-déjeuner, déjeuner et dîner. Sauter des repas peut créer des déséquilibres et des fringales plus tard.";
    } else if (nbRepas === 2) {
      conseil = "Tu as noté 2 repas aujourd'hui. Pour maintenir un bon équilibre et éviter les coups de fatigue, essaie d'inclure un troisième repas (ou une collation si nécessaire).";
    } else {
      // Évaluation plus réaliste - vérifier d'abord les problèmes majeurs
      
      // Évaluation plus réaliste - vérifier d'abord les problèmes majeurs
      if (hasFastFood && points.length < 3) {
        conseil = "Je remarque que tu as mangé au fast-food aujourd'hui et que tes repas manquent de variété. Pour un meilleur équilibre, essaie d'inclure des légumes, des protéines et des féculents dans tes repas faits maison.";
      } else if (hasFastFood && hasSucres && !hasLegumes) {
        conseil = "Tes repas d'aujourd'hui contiennent du fast-food et des produits sucrés, mais peu de légumes. Ce n'est pas un équilibre optimal. Pour ta santé, il est important d'inclure des légumes et de limiter les repas transformés.";
      } else if (hasSucres && !hasLegumes && points.length < 2) {
        conseil = "Je remarque beaucoup de produits sucrés et peu de variété dans tes repas. Pour un meilleur équilibre, pense à inclure des légumes et des protéines. Les produits sucrés sont à consommer avec modération.";
      } else if (points.length >= 3 && !hasFastFood && !hasSucres) {
        conseil = "Bien ! Tu as varié tes repas avec des " + points.join(", ") + ". C'est un bon équilibre. Continue dans cette direction.";
      } else if (points.length >= 3 && (hasFastFood || hasSucres)) {
        conseil = "Tu as varié tes repas avec des " + points.join(", ") + ", c'est bien. Cependant, j'observe aussi du fast-food ou des produits sucrés. Pour un équilibre optimal, essaie de limiter ces aliments et de privilégier les repas faits maison avec des légumes.";
      } else if (points.length === 2) {
        const manquants = [];
        if (!hasLegumes) manquants.push("légumes");
        if (!hasProteines) manquants.push("protéines");
        if (!hasFeculents) manquants.push("féculents");
        if (!hasFruits && objectif !== "Perte de poids") manquants.push("fruits");
        
        conseil = "Tu as inclus " + points.join(" et ") + " dans tes repas, c'est un début. Pour un meilleur équilibre, il manque des " + manquants.join(", ") + ". Essaie d'en ajouter au prochain repas.";
      } else if (points.length === 1) {
        conseil = "Je remarque que tes repas manquent de variété. Tu as principalement des " + points[0] + ". Pour un équilibre optimal, il faudrait aussi inclure des légumes, des protéines et des féculents. C'est important pour couvrir tous tes besoins nutritionnels.";
      } else {
        conseil = "Tes repas manquent clairement de variété aujourd'hui. Pour un bon équilibre, il est essentiel d'inclure des légumes, des protéines et des féculents à chaque repas. C'est la base d'une alimentation équilibrée.";
      }
      
      // Commentaires sur la qualité
      if (hasFastFood) {
        conseil += " Je remarque aussi que tu as mangé au fast-food aujourd'hui. Ce n'est pas grave occasionnellement, mais si c'est récurrent, cela peut déséquilibrer ton alimentation. Essaie de limiter à 1-2 fois par semaine maximum.";
      }
      
      if (hasSucres && hasSucres && !hasLegumes) {
        conseil += " Attention aussi à l'équilibre : j'observe plus de produits sucrés que de légumes aujourd'hui. Les légumes sont essentiels pour ta santé et ton équilibre. Pense à en ajouter au prochain repas.";
      }
    }
    
    // Conseils spécifiques selon les objectifs - plus directs
    if (objectif === "Perte de poids") {
      if (!hasLegumes) {
        conseil += " Pour ton objectif de perte de poids, les légumes sont tes alliés : ils sont rassasiants, peu caloriques et riches en fibres. Essaie d'en inclure à chaque repas, c'est vraiment important pour réussir.";
      } else if (hasFastFood) {
        conseil += " Pour ta perte de poids, les repas fast-food sont à limiter car ils sont souvent très caloriques. Privilégie les repas faits maison avec des légumes et des protéines maigres.";
      } else {
        conseil += " Tes légumes t'aident dans ton objectif, c'est bien. Continue à en inclure régulièrement.";
      }
    } else if (objectif === "Prise de masse") {
      if (!hasProteines) {
        conseil += " Pour ta prise de masse, les protéines sont essentielles à chaque repas (viande, poisson, œufs, légumineuses). Sans elles, tu ne pourras pas construire de muscle efficacement. C'est vraiment la base.";
      } else if (nbRepas < 3) {
        conseil += " Pour ta prise de masse, il faut aussi manger suffisamment souvent. 3 repas par jour minimum sont nécessaires pour apporter assez de calories et de nutriments.";
      } else {
        conseil += " Tes apports en protéines sont corrects pour ta prise de masse, continue comme ça.";
      }
    } else if (objectif === "Performance sportive") {
      if (!hasFeculents) {
        conseil += " Pour ta performance sportive, les féculents sont cruciaux : ils te donnent l'énergie nécessaire. Sans eux, tu risques la fatigue et une baisse de performance. Inclus-en à chaque repas principal.";
      } else {
        conseil += " Tes féculents te fournissent l'énergie dont tu as besoin, c'est bien pour tes performances.";
      }
    } else if (objectif === "Maintien") {
      if (points.length < 3) {
        conseil += " Pour maintenir ton équilibre, la variété est clé. Essaie d'inclure légumes, protéines et féculents à chaque repas. C'est ce qui permet de maintenir un bon équilibre sur le long terme.";
      }
    } else if (objectif === "Santé générale" || objectif === "Rebalancing") {
      if (!hasFruits && !hasLegumes) {
        conseil += " Pour ta santé, les fruits et légumes sont essentiels. Ils apportent vitamines, minéraux et antioxydants. Sans eux, tu risques des carences. Essaie d'en inclure au moins une portion à chaque repas.";
      } else if (!hasFruits) {
        conseil += " Pour ta santé, pense aussi aux fruits. Ils complètent bien les légumes et apportent des vitamines différentes. Idéalement, 2-3 portions par jour.";
      } else if (!hasLegumes) {
        conseil += " Pour ta santé, les légumes sont vraiment importants. Ils apportent des fibres, des vitamines et des minéraux essentiels. Essaie d'en inclure à chaque repas principal.";
      }
    }
    
    return conseil;
  }

  function generateObjectifsConcrets(): string[] {
    const nbRepas = todayEntries.length;
    const allMealsText = todayEntries.join(" ").toLowerCase();
    
    const hasLegumes = /salade|tomate|carotte|courgette|poivron|épinard|brocoli|chou|haricot|légume|avocat|concombre/i.test(allMealsText);
    const hasProteines = /poulet|viande|poisson|thon|saumon|œuf|oeuf|fromage|yaourt|protéine|jambon|dinde/i.test(allMealsText);
    const hasFeculents = /pâtes|riz|pain|quinoa|pomme de terre|patate|patate douce|féculent|pomme de terre|pommes de terre|pâtes|pasta/i.test(allMealsText);
    const hasFruits = /fruit|banane|pomme|orange|fraise|raisin|fruit|kiwi|mangue/i.test(allMealsText);
    const hasFastFood = /macdo|mcdonald|burger|frite|pizza|kebab|fast.food|restaurant|resto/i.test(allMealsText);
    const hasSucres = /nutella|chocolat|gâteau|gateau|biscuit|bonbon|sucre|sucré|dessert|glace/i.test(allMealsText);
    
    const objectif = objectifsUsage.length > 0 ? objectifsUsage[0] : "";
    const objectifs: string[] = [];
    
    // Objectif 1 : Nombre de repas
    if (nbRepas < 3) {
      objectifs.push(`Manger ${3 - nbRepas} repas supplémentaire${3 - nbRepas > 1 ? "s" : ""} demain (petit-déjeuner, déjeuner, dîner)`);
    }
    
    // Objectif 2 : Variété alimentaire
    if (!hasLegumes) {
      objectifs.push("Inclure des légumes dans au moins 2 repas demain");
    } else if (!hasProteines) {
      objectifs.push("Ajouter des protéines (viande, poisson, œufs) à chaque repas principal demain");
    } else if (!hasFeculents) {
      objectifs.push("Inclure des féculents (riz, pâtes, pain) dans tes repas principaux demain");
    } else if (!hasFruits && objectif !== "Perte de poids") {
      objectifs.push("Manger 1 à 2 fruits demain (en collation ou au petit-déjeuner)");
    }
    
    // Objectif 3 : Spécifique selon l'objectif
    if (objectif === "Perte de poids") {
      if (!hasLegumes) {
        objectifs.push("Ajouter des légumes à chaque repas demain pour te rassasier naturellement");
      } else if (hasFastFood) {
        objectifs.push("Limiter les repas fast-food à maximum 1 fois cette semaine");
      } else if (hasSucres && !hasLegumes) {
        objectifs.push("Remplacer un produit sucré par des légumes au prochain repas");
      }
    } else if (objectif === "Prise de masse") {
      if (!hasProteines) {
        objectifs.push("Inclure des protéines à chaque repas demain (minimum 20g par repas)");
      } else if (nbRepas < 3) {
        objectifs.push("Manger 3 repas complets demain avec protéines + féculents");
      }
    } else if (objectif === "Performance sportive") {
      if (!hasFeculents) {
        objectifs.push("Inclure des féculents dans tes 2 prochains repas pour l'énergie");
      } else if (!hasProteines) {
        objectifs.push("Ajouter des protéines après ton prochain entraînement");
      }
    } else if (objectif === "Santé générale" || objectif === "Rebalancing") {
      if (!hasLegumes && !hasFruits) {
        objectifs.push("Manger au moins 3 portions de fruits et légumes demain");
      } else if (!hasLegumes) {
        objectifs.push("Inclure des légumes dans tes 2 prochains repas");
      } else if (!hasFruits) {
        objectifs.push("Ajouter 1 à 2 fruits demain");
      }
    }
    
    // Objectif générique si pas assez d'objectifs
    if (objectifs.length < 2) {
      if (hasFastFood && objectifs.length < 3) {
        objectifs.push("Préparer au moins 1 repas maison demain");
      } else if (hasSucres && !hasLegumes && objectifs.length < 3) {
        objectifs.push("Équilibrer tes repas : ajouter des légumes si tu manges des produits sucrés");
      } else if (objectifs.length < 2) {
        objectifs.push("Maintenir cette variété et continuer à équilibrer tes repas");
      }
    }
    
    // Limiter à 3 objectifs maximum
    return objectifs.slice(0, 3);
  }

  if (!isPremium) {
    return (
      <main className="max-w-md mx-auto px-4 pt-6 pb-24">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Équilibre</h1>
          <p className="text-sm text-[var(--beige-text-light)] mt-2">
            Ton assistant diététicien personnel
          </p>
        </header>

        <section className="mb-6 rounded-2xl border border-[var(--beige-border)] bg-[var(--beige-card)] p-6 text-center">
          <div className="mb-4">
            <span className="text-4xl">🔒</span>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-[var(--foreground)]">
            Débloquer l'assistant diététicien
          </h2>
          <p className="text-sm text-[var(--beige-text-light)] mb-4">
            Accède à ton journal alimentaire, reçois des conseils personnalisés basés sur tes objectifs et un suivi bienveillant de ton équilibre alimentaire.
          </p>
          <Link
            href="/premium"
            className="inline-block px-6 py-3 rounded-xl bg-[#D44A4A] text-white font-semibold hover:bg-[#C03A3A] transition-colors"
          >
            Passer à Premium
          </Link>
        </section>
      </main>
    );
  }

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
          <h2 className="text-sm font-semibold mb-2 text-[#6B2E2E]">💡 Conseil du jour</h2>
          <p className="text-sm text-[#726566]">{conseilDuJour}</p>
        </section>
      )}

      {/* Retour sur l'équilibre */}
      <section className="mb-6 rounded-2xl border border-[var(--beige-border)] bg-[var(--beige-card)] p-4">
        <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">Aujourd'hui</h2>
        <div className="mb-3">
          <p className="text-sm text-[var(--beige-text-light)] mb-2">
            {getEquilibreMessage()}
          </p>
          {todayEntries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {todayEntries.map((entry, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full bg-[var(--beige-rose)] border border-[var(--beige-border)] text-xs text-[var(--foreground)]"
                >
                  {entry}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Journal alimentaire */}
      <section className="mb-6 rounded-2xl border border-[var(--beige-border)] bg-[var(--beige-card)] p-4">
        <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">Journal alimentaire</h2>
        
        {/* Sélection du repas */}
        <div className="mb-4">
          <div className="flex gap-2 flex-wrap">
            {(["petitDejeuner", "dejeuner", "diner", "collation"] as const).map((meal) => (
              <button
                key={meal}
                onClick={() => setCurrentMeal(meal)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  currentMeal === meal
                    ? "bg-[#D44A4A] text-white"
                    : "bg-white text-[var(--foreground)] border border-[var(--beige-border)]"
                }`}
              >
                {meal === "petitDejeuner" && "Petit-déjeuner"}
                {meal === "dejeuner" && "Déjeuner"}
                {meal === "diner" && "Dîner"}
                {meal === "collation" && "Collation"}
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
            />
            <button
              onClick={handleAddMeal}
              className="px-4 py-2 rounded-xl bg-[#D44A4A] text-white font-semibold hover:bg-[#C03A3A] transition-colors"
            >
              Ajouter
            </button>
          </div>
        </div>

        {/* Liste des repas du jour par type */}
        <div className="space-y-3">
          {(["petitDejeuner", "dejeuner", "diner", "collation"] as const).map((meal) => {
            const today = new Date().toISOString().split("T")[0];
            const stored = localStorage.getItem(`foodlane_journal_${today}`);
            const entries = stored ? (JSON.parse(stored) as JournalEntry) : null;
            const meals = entries?.meals[meal] || [];

            if (meals.length === 0) return null;

            return (
              <div key={meal} className="border border-[var(--beige-border)] rounded-xl p-3 bg-white">
                <h3 className="text-xs font-semibold mb-2 text-[var(--foreground)]">
                  {meal === "petitDejeuner" && "Petit-déjeuner"}
                  {meal === "dejeuner" && "Déjeuner"}
                  {meal === "diner" && "Dîner"}
                  {meal === "collation" && "Collation"}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {meals.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--beige-rose)] border border-[var(--beige-border)] text-xs"
                    >
                      <span className="text-[var(--foreground)]">{item}</span>
                      <button
                        onClick={() => handleRemoveMeal(index, meal)}
                        className="text-[var(--beige-text-muted)] hover:text-[var(--foreground)]"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bouton demander conseil */}
        {todayEntries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--beige-border)]">
            <button
              onClick={async () => {
                const conseil = generateConseilPersonnalise();
                const objectifs = generateObjectifsConcrets();
                setConseilPersonnalise(conseil);
                setObjectifsConcrets(objectifs);
                
                // Trouver les conseils experts pertinents
                if (expertAdvices.length > 0) {
                  const userObjective = objectifsUsage.length > 0 ? objectifsUsage[0] : "";
                  const context = analyzeMealContext(todayEntries);
                  const relevant = findRelevantAdvices(expertAdvices, userObjective, context);
                  const best = selectBestAdvices(relevant, 1);
                  if (best.length > 0) {
                    setSelectedAdvice(best[0]);
                  }
                }
                
                setShowConseilModal(true);
              }}
              className="w-full px-4 py-3 rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>💬</span>
              <span>Demander conseil à mon diététicien</span>
            </button>
            <p className="text-xs text-[var(--beige-text-light)] text-center mt-2">
              Reçois un conseil personnalisé basé sur tes repas d&apos;aujourd&apos;hui
            </p>
          </div>
        )}
      </section>

      {/* Objectif pour demain */}
      <section className="mb-6 rounded-2xl border border-[#D44A4A] bg-[#FFD9D9] p-4">
        <h2 className="text-sm font-semibold mb-2 text-[#6B2E2E]">🎯 Objectif pour demain</h2>
        <p className="text-sm text-[#726566]">{getObjectifLendemain()}</p>
      </section>

      {/* Modal conseil personnalisé */}
      {showConseilModal && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFF0F0] rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-[#6B2E2E]">
                💬 Conseil de ton diététicien
              </h3>
              <button
                onClick={() => {
                  setShowConseilModal(false);
                  setConseilPersonnalise("");
                  setSelectedAdvice(null);
                }}
                className="text-[#9A6A6A] hover:text-[#6B2E2E] text-xl"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <div className="bg-white rounded-xl p-3 mb-4 border border-[var(--beige-border)]">
                <p className="text-xs font-semibold text-[#6B2E2E] mb-2">Tes repas d&apos;aujourd&apos;hui :</p>
                <div className="flex flex-wrap gap-2">
                  {todayEntries.length > 0 ? (
                    todayEntries.map((entry, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 rounded-full bg-[var(--beige-rose)] border border-[var(--beige-border)] text-xs text-[var(--foreground)]"
                      >
                        {entry}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--beige-text-light)]">Aucun repas enregistré</span>
                  )}
                </div>
              </div>

              {objectifsUsage.length > 0 && (
                <div className="bg-[#FFD9D9] rounded-xl p-3 mb-4 border border-[#D44A4A]">
                  <p className="text-xs font-semibold text-[#6B2E2E] mb-1">Ton objectif :</p>
                  <p className="text-sm text-[#726566]">{objectifsUsage[0]}</p>
                </div>
              )}

              <div className="bg-[#FFD9D9] rounded-xl p-4 border border-[#D44A4A] mb-4">
                <h4 className="font-semibold text-sm mb-2 text-[#6B2E2E] flex items-center gap-2">
                  <span>💡</span>
                  <span>Mon conseil personnalisé</span>
                </h4>
                <p className="text-sm text-[#726566] leading-relaxed whitespace-pre-line mb-3">
                  {conseilPersonnalise || "Analyse en cours..."}
                </p>
                
                {/* Conseil expert de la base de données */}
                {selectedAdvice && (
                  <div className="mt-3 pt-3 border-t border-[#D44A4A]/30">
                    <p className="text-sm font-semibold text-[#6B2E2E] mb-2">
                      {selectedAdvice.text}
                    </p>
                    {selectedAdvice.cta && (
                      <p className="text-xs text-[#726566] italic">
                        💡 {selectedAdvice.cta}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Section Objectifs */}
              {objectifsConcrets.length > 0 && (
                <div className="bg-white rounded-xl p-4 border border-[var(--beige-border)] mb-4">
                  <h4 className="font-semibold text-sm mb-3 text-[#6B2E2E] flex items-center gap-2">
                    <span>🎯</span>
                    <span>Mes objectifs pour demain</span>
                  </h4>
                  <ul className="space-y-2 mb-4">
                    {objectifsConcrets.map((objectif, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-[#D44A4A] font-bold mt-0.5">•</span>
                        <span className="text-sm text-[#726566] flex-1">{objectif}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {/* Bouton notifications */}
                  {notificationPermission === "granted" && notificationsEnabled ? (
                    <div className="bg-[#FFD9D9] rounded-xl p-3 border border-[#D44A4A]">
                      <p className="text-xs text-[#726566] mb-2 flex items-center gap-2">
                        <span>🔔</span>
                        <span>Notifications activées - Tu recevras des rappels demain</span>
                      </p>
                      <button
                        onClick={() => {
                          localStorage.setItem("foodlane_objectifs_notifications", "false");
                          setNotificationsEnabled(false);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[var(--beige-border)] text-xs text-[var(--foreground)] hover:border-[#D44A4A] transition-colors"
                      >
                        Désactiver les notifications
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={enableNotificationsForObjectives}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <span>🔔</span>
                      <span>Activer les rappels pour ces objectifs</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setShowConseilModal(false);
                setConseilPersonnalise("");
              }}
              className="w-full px-4 py-2 rounded-xl bg-[#D44A4A] text-white text-sm font-semibold hover:bg-[#C03A3A] transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Section Retour utilisateur */}
      <UserFeedback />
    </main>
  );
}

