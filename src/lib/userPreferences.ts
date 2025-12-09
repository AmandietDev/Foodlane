// app/src/lib/userPreferences.ts

export type UserPreferences = {
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    langue: "fr" | "en" | string;
    afficherCalories: boolean;
    notificationsNewRecipes: boolean;
    notificationsMenuIdeas: boolean;
    notificationsReminders: boolean;
    abonnementType: "premium" | "gratuit" | string;
    premiumStartDate: string;
    premiumExpirationDate: string;
    nombrePersonnes: number;
    regimesParticuliers: string[];
    aversionsAlimentaires: string[];
    equipements: string[];
    objectifsUsage: string[];
    cguAccepted: boolean;
    cguAcceptedDate: string;
  };
  
  // Sauvegarde très simple des préférences en localStorage
  export function savePreferences(preferences: UserPreferences) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("foodlane_user_preferences", JSON.stringify(preferences));
    } catch (e) {
      console.error("Erreur lors de la sauvegarde des préférences", e);
    }
  }
  