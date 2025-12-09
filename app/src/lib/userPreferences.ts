// Gestion des préférences utilisateur
import { supabase } from "./supabaseClient";

export interface UserPreferences {
  // Profil
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  
  // Paramètres
  langue: "fr" | "en" | "es" | "de";
  afficherCalories: boolean;
  
  // Notifications
  notificationsNewRecipes: boolean;
  notificationsMenuIdeas: boolean;
  notificationsReminders: boolean;
  
  // Abonnement
  abonnementType: "free" | "premium";
  premiumStartDate?: string; // Date de début de l'abonnement premium (ISO string)
  premiumExpirationDate?: string; // Date d'expiration de l'abonnement premium (ISO string)
  
  // Données du foyer
  nombrePersonnes: number;
  regimesParticuliers: string[];
  aversionsAlimentaires: string[];
  equipements: string[];
  objectifsUsage: string[];
  
  // Acceptation des CGU
  cguAccepted: boolean;
  cguAcceptedDate?: string; // Date d'acceptation au format ISO
}

export interface UserAccount {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone: string;
}

const ACCOUNT_STORAGE_KEY = "foodlane_user_account";
const IS_LOGGED_IN_KEY = "foodlane_is_logged_in";

export async function isLoggedIn(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    // Vérifier d'abord la session Supabase
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      return true;
    }
    // Fallback sur l'ancien système si Supabase n'est pas utilisé
    return localStorage.getItem(IS_LOGGED_IN_KEY) === "true";
  } catch {
    return false;
  }
}

// Fonction synchrone pour compatibilité (vérifie seulement localStorage)
export function isLoggedInSync(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return localStorage.getItem(IS_LOGGED_IN_KEY) === "true";
  } catch {
    return false;
  }
}

export function login(email: string, password: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const stored = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (stored) {
      const account = JSON.parse(stored) as UserAccount;
      if (account.email === email && account.password === password) {
        localStorage.setItem(IS_LOGGED_IN_KEY, "true");
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function createAccount(account: UserAccount): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
    localStorage.setItem(IS_LOGGED_IN_KEY, "true");
  } catch (err) {
    console.error("Impossible de créer le compte :", err);
  }
}

export async function logout(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  try {
    // Déconnexion de Supabase
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Erreur lors de la déconnexion Supabase:", error);
    }
    
    // Nettoyer le localStorage
    localStorage.setItem(IS_LOGGED_IN_KEY, "false");
    
    // Optionnel : nettoyer les données de session Supabase du localStorage
    // Supabase stocke ses propres clés, mais on peut aussi les nettoyer explicitement
    const supabaseKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') || key.includes('supabase')
    );
    supabaseKeys.forEach(key => localStorage.removeItem(key));
  } catch (err) {
    console.error("Impossible de se déconnecter :", err);
  }
}

export function getCurrentAccount(): UserAccount | null {
  if (typeof window === "undefined" || !isLoggedInSync()) {
    return null;
  }
  try {
    const stored = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as UserAccount) : null;
  } catch {
    return null;
  }
}

export function updateAccount(account: Partial<UserAccount>): void {
  if (typeof window === "undefined" || !isLoggedInSync()) {
    return;
  }
  try {
    const current = getCurrentAccount();
    if (current) {
      const updated = { ...current, ...account };
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.error("Impossible de mettre à jour le compte :", err);
  }
}

const DEFAULT_PREFERENCES: UserPreferences = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  langue: "fr",
  afficherCalories: true,
  notificationsNewRecipes: true,
  notificationsMenuIdeas: true,
  notificationsReminders: true,
  abonnementType: "free",
  nombrePersonnes: 1,
  regimesParticuliers: [],
  aversionsAlimentaires: [],
  equipements: [],
  objectifsUsage: [],
  cguAccepted: false,
};

const STORAGE_KEY = "foodlane_user_preferences";

export function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<UserPreferences>;
      const preferences = { ...DEFAULT_PREFERENCES, ...parsed };
      
      // Vérifier si l'abonnement premium a expiré
      if (preferences.abonnementType === "premium" && preferences.premiumExpirationDate) {
        const expirationDate = new Date(preferences.premiumExpirationDate);
        const now = new Date();
        
        if (now > expirationDate) {
          // L'abonnement a expiré, revenir à "free"
          console.log("[UserPreferences] Abonnement premium expiré, retour à 'free'");
          preferences.abonnementType = "free";
          delete preferences.premiumStartDate;
          delete preferences.premiumExpirationDate;
          savePreferences(preferences);
        }
      }
      
      return preferences;
    }
  } catch (err) {
    console.error("Impossible de charger les préférences :", err);
  }
  return DEFAULT_PREFERENCES;
}

export function savePreferences(preferences: UserPreferences): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (err) {
    console.error("Impossible d'enregistrer les préférences :", err);
  }
}

/**
 * Réinitialise l'abonnement à "free" (utile pour les tests)
 */
export function resetToFreePlan(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const current = loadPreferences();
    const updated: UserPreferences = {
      ...current,
      abonnementType: "free",
    };
    savePreferences(updated);
    console.log("Abonnement réinitialisé à 'free'");
  } catch (err) {
    console.error("Impossible de réinitialiser l'abonnement :", err);
  }
}

