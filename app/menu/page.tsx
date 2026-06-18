"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../src/lib/supabaseClient";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  loadPreferences,
  savePreferences,
  type UserPreferences,
  isLoggedIn,
  login,
  createAccount,
  logout,
  getCurrentAccount,
  updateAccount,
  type UserAccount,
} from "../src/lib/userPreferences";
import { onSubscriptionStateChanged } from "../src/lib/subscriptionSyncEvents";
import { setLocale, getLocale, type Locale } from "../src/lib/i18n";
import { plannerFetch } from "../src/lib/plannerClient";
import { mergeUserPreferencesFromPlanner } from "../src/lib/foyerPreferencesSync";
import { useTranslation } from "../components/TranslationProvider";
import UserFeedback from "../components/UserFeedback";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSwipeBack } from "../hooks/useSwipeBack";
import { useMenuNavigation, type MenuSectionId } from "../hooks/useMenuNavigation";
import { usePremium } from "../contexts/PremiumContext";
import { formatDateFrDMY } from "../src/lib/subscriptionDisplay";
import PlannerProfileForm from "../components/PlannerProfileForm";
import { DEFAULT_PLANNER_PREFERENCES } from "../src/lib/weeklyPlanner";
import type { PlannerPreferences } from "../src/lib/weeklyPlanner";
import {
  MentionsLegalesContent,
  CGUContent,
  ConfidentialiteContent,
  CGVContent,
  CookiesContent,
} from "../components/LegalDocuments";
import { SettingsHub } from "../components/settings/SettingsHub";
import { appLayoutTheme } from "../components/app/appLayoutTheme";

type MenuSection = MenuSectionId | "aide" | "parametres" | "abonnement" | null;

type LegalDocType = "mentions" | "cgu" | "confidentialite" | "cgv" | "cookies" | null;

const FAQ_COUNT = 8;

// Les régimes sont maintenant gérés dans dietaryProfiles.ts

const EQUIPEMENTS = [
  "Four",
  "Micro-ondes",
  "Plaque de cuisson",
  "Cocotte-minute",
  "Robot mixeur",
  "Mixeur plongeant",
  "Grille-pain",
  "Lave-vaisselle",
];

export default function MenuPage() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const {
    activeTab,
    activeSection,
    isHub,
    openTab,
    openSection,
    openProfilSection,
    backToHub,
    backOneLevel,
  } = useMenuNavigation();
  const { setLocale: setLocaleFromContext, t } = useTranslation();
  const { user, profile, loading: sessionLoading } = useSupabaseSession();
  const { isPremium, profile: billingProfile, refreshProfile, subscriptionTier } = usePremium();
  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences());
  const [loggedIn, setLoggedIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signUpForm, setSignUpForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    nom: "",
    prenom: "",
  });
  const [loginError, setLoginError] = useState("");
  const [contactForm, setContactForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    telephone: "",
    objet: "",
    message: "",
  });
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [showLegalDoc, setShowLegalDoc] = useState<LegalDocType>(null);
  const [recipeScalingPortionsMenu, setRecipeScalingPortionsMenu] = useState<number | null>(null);
  const [foyerPlannerPrefs, setFoyerPlannerPrefs] = useState<PlannerPreferences>(DEFAULT_PLANNER_PREFERENCES);
  const [foyerPlannerLoaded, setFoyerPlannerLoaded] = useState(false);
  const [upgradeToPlusLoading, setUpgradeToPlusLoading] = useState(false);
  const [cancelSubscriptionLoading, setCancelSubscriptionLoading] = useState(false);
  // Flag interne anti-boucle : true pendant qu'on hydrate l'UI depuis Supabase
  // (sinon le useEffect de sauvegarde se déclencherait juste après la lecture).
  const foyerSyncSkipRef = useRef(true);

  const portalReturnHandledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("stripe_portal_return") !== "1") {
      portalReturnHandledRef.current = false;
      return;
    }
    if (portalReturnHandledRef.current) return;
    portalReturnHandledRef.current = true;
    if (sp.get("tab") === "abonnement") {
      router.replace("/menu?tab=abonnement", { scroll: false });
    } else {
      window.history.replaceState({}, "", window.location.pathname);
    }
    void (async () => {
      await refreshProfile();
      setPreferences(loadPreferences());
    })();
  }, [refreshProfile, router]);

  useEffect(() => {
    if (activeTab !== "abonnement" || !user?.id) return;
    void (async () => {
      await refreshProfile();
      setPreferences(loadPreferences());
    })();
  }, [activeTab, user?.id, refreshProfile]);

  useEffect(() => {
    return onSubscriptionStateChanged(() => {
      setPreferences(loadPreferences());
    });
  }, []);

  const handleUpgradeToPremiumPlus = useCallback(async () => {
    if (!user?.id) {
      alert("Tu dois être connecté.");
      return;
    }
    setUpgradeToPlusLoading(true);
    try {
      const response = await fetch("/api/billing/upgrade-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: string;
      };
      if (!response.ok) {
        throw new Error(
          [data.error, data.details].filter(Boolean).join("\n\n") || "Mise à niveau impossible."
        );
      }
      await refreshProfile();
      setPreferences(loadPreferences());
    } catch (e) {
      console.error("[Menu] upgrade Premium Plus:", e);
      alert(e instanceof Error ? e.message : "Erreur lors du passage à Premium Plus.");
    } finally {
      setUpgradeToPlusLoading(false);
    }
  }, [user?.id, refreshProfile]);

  const handleCancelSubscription = useCallback(async () => {
    if (!user?.id) {
      alert("Tu dois être connecté.");
      return;
    }
    if (
      !confirm(
        "Tu vas être redirigé vers Stripe pour confirmer la résiliation (en général en fin de période). Ensuite tu reviendras automatiquement sur Foodlane."
      )
    ) {
      return;
    }
    setCancelSubscriptionLoading(true);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          intent: "cancel_subscription",
          returnTo: "menu",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        details?: string;
        url?: string;
      };
      if (!response.ok) {
        throw new Error(
          [data.error, data.details].filter(Boolean).join("\n\n") || "Impossible d’ouvrir Stripe."
        );
      }
      if (!data.url) {
        throw new Error("URL Stripe non reçue.");
      }
      window.location.assign(data.url);
    } catch (e) {
      console.error("[Menu] résiliation (portail Stripe):", e);
      alert(e instanceof Error ? e.message : "Erreur lors de l’ouverture de Stripe.");
    } finally {
      setCancelSubscriptionLoading(false);
    }
  }, [user?.id]);

  // ── Hydratation initiale (une fois par session) : aligne foyer / préférences sans ouvrir l'onglet Foyer ────
  const foyerInitialHydrateRef = useRef(false);
  useEffect(() => {
    if (!user?.id) {
      foyerInitialHydrateRef.current = false;
      return;
    }
    if (foyerInitialHydrateRef.current) return;
    let cancelled = false;
    foyerSyncSkipRef.current = true;
    (async () => {
      const res = await plannerFetch("/preferences");
      const j = await res.json().catch(() => ({}));
      if (cancelled || !res.ok || !j.preferences) {
        foyerSyncSkipRef.current = false;
        foyerInitialHydrateRef.current = true;
        return;
      }
      const full = j.preferences as PlannerPreferences;
      const h = Math.max(1, Number(full.household_size) || 1);
      setRecipeScalingPortionsMenu(h === 5 ? (full.recipe_scaling_portions ?? null) : null);
      setPreferences((prev) => mergeUserPreferencesFromPlanner(prev, full));
      foyerInitialHydrateRef.current = true;
      window.setTimeout(() => {
        foyerSyncSkipRef.current = false;
      }, 450);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  /** Onglet Foyer : même formulaire que /preferences, rechargé depuis le serveur. */
  useEffect(() => {
    if (!user?.id || activeTab !== "foyer") return;
    let cancelled = false;
    foyerSyncSkipRef.current = true;
    setFoyerPlannerLoaded(false);
    (async () => {
      const res = await plannerFetch("/preferences");
      const j = await res.json().catch(() => ({}));
      if (cancelled || !res.ok || !j.preferences) {
        foyerSyncSkipRef.current = false;
        setFoyerPlannerLoaded(true);
        return;
      }
      const full = j.preferences as PlannerPreferences;
      setFoyerPlannerPrefs(full);
      const h = Math.max(1, Number(full.household_size) || 1);
      setRecipeScalingPortionsMenu(h === 5 ? (full.recipe_scaling_portions ?? null) : null);
      setPreferences((prev) => mergeUserPreferencesFromPlanner(prev, full));
      setFoyerPlannerLoaded(true);
      window.setTimeout(() => {
        foyerSyncSkipRef.current = false;
      }, 300);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, activeTab]);

  // Geste de balayage pour revenir en arrière dans les sections
  useSwipeBack(() => {
    if (showLegalDoc) {
      setShowLegalDoc(null);
    } else if (activeSection || activeTab) {
      backOneLevel();
    }
  }, showLegalDoc !== null || !isHub);

  const CONTACT_SUBJECTS = [
    "Question générale",
    "Problème technique",
    "Suggestion d'amélioration",
    "Demande de partenariat",
    "Question Premium",
    "Autre",
  ];

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Vérifier la session Supabase et protéger la page
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }
        setIsCheckingAuth(false);
        
        // Vérifier aussi avec l'ancien système pour compatibilité
        const loggedIn = await isLoggedIn();
        setLoggedIn(loggedIn);
        if (loggedIn) {
          const account = getCurrentAccount();
          if (account) {
            setPreferences((prev) => ({
              ...prev,
              email: account.email,
              nom: account.nom,
              prenom: account.prenom,
              telephone: account.telephone,
            }));
          }
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de la session:", error);
        router.push("/login");
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    // Initialiser la langue
    setLocale(preferences.langue);
  }, [preferences.langue]);

  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  function updatePreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    if (login(loginForm.email, loginForm.password)) {
      setLoggedIn(true);
      const account = getCurrentAccount();
      if (account) {
        setPreferences((prev) => ({
          ...prev,
          email: account.email,
          nom: account.nom,
          prenom: account.prenom,
          telephone: account.telephone,
        }));
      }
      setLoginForm({ email: "", password: "" });
    } else {
      setLoginError("Email ou mot de passe incorrect");
    }
  }

  function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    if (signUpForm.password !== signUpForm.confirmPassword) {
      setLoginError("Les mots de passe ne correspondent pas");
      return;
    }
    if (signUpForm.password.length < 6) {
      setLoginError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    createAccount({
      email: signUpForm.email,
      password: signUpForm.password,
      nom: signUpForm.nom,
      prenom: signUpForm.prenom,
      telephone: "", // Champ non requis, conservé pour compatibilité
    });
    setLoggedIn(true);
    setPreferences((prev) => ({
      ...prev,
      email: signUpForm.email,
      nom: signUpForm.nom,
      prenom: signUpForm.prenom,
      telephone: "", // Champ non requis, conservé pour compatibilité
    }));
    setSignUpForm({
      email: "",
      password: "",
      confirmPassword: "",
      nom: "",
      prenom: "",
    });
    setShowSignUp(false);
  }

  async function handleLogout() {
    try {
      // Déconnexion Supabase
      await supabase.auth.signOut();
      setLoggedIn(false);
      setPreferences((prev) => ({
        ...prev,
        email: "",
        nom: "",
        prenom: "",
      }));
      // Rediriger vers la page de connexion
      router.push("/login");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      // Rediriger quand même vers la page de connexion
      router.push("/login");
    }
  }

  function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    updateAccount({
      email: preferences.email,
      nom: preferences.nom,
      prenom: preferences.prenom,
      telephone: preferences.telephone,
    });
    // Message de confirmation (tu peux ajouter un toast ici)
    alert("Profil mis à jour avec succès !");
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      // Envoi du formulaire via l'API
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nom: contactForm.nom,
          prenom: contactForm.prenom,
          email: contactForm.email,
          telephone: contactForm.telephone,
          objet: contactForm.objet,
          message: contactForm.message,
        }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de l'envoi du message");
      }

      setContactSubmitted(true);
      setContactForm({
        nom: "",
        prenom: "",
        email: "",
        telephone: "",
        objet: "",
        message: "",
      });
      setTimeout(() => {
        setContactSubmitted(false);
        setShowContactForm(false);
      }, 3000);
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de l'envoi du message. Veuillez réessayer.");
    }
  }

  // Composant MenuItem réutilisable
  const MenuItem = ({ 
    icon, 
    label, 
    onClick, 
    href,
    danger = false 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    onClick?: () => void;
    href?: string;
    danger?: boolean;
  }) => {
    const content = (
      <div className={`flex items-center gap-3 px-4 py-3 ${danger ? 'text-red-600' : 'text-[var(--foreground)]'} hover:bg-[var(--beige-card)] transition-colors`}>
        <div className="w-6 h-6 flex items-center justify-center">
          {icon}
        </div>
        <span className="flex-1 text-sm font-medium">{label}</span>
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 20 20" 
          fill="none" 
          className={danger ? 'text-red-600' : 'text-gray-400'}
        >
          <path 
            d="M7.5 15L12.5 10L7.5 5" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );

    if (href) {
      return (
        <Link href={href} className="block">
          {content}
        </Link>
      );
    }

    return (
      <button onClick={onClick} className="w-full text-left block">
        {content}
      </button>
    );
  };

  // Afficher un écran de chargement pendant la vérification d'authentification
  if (sessionLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner message="Vérification de la connexion..." />
      </div>
    );
  }

  return (
    <main
      className="mx-auto min-h-screen max-w-md"
      style={{ backgroundColor: appLayoutTheme.pageBg }}
    >
      {/* Header */}
      {!isHub && (
      <header
        className="sticky top-0 z-10 border-b px-4 py-3"
        style={{ backgroundColor: appLayoutTheme.pageBg, borderColor: appLayoutTheme.cardPinkBorder }}
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (showLegalDoc) {
                setShowLegalDoc(null);
              } else {
                backOneLevel();
              }
            }}
            className="p-2 -ml-2"
            aria-label="Retour aux réglages"
          >
              <svg 
                width="24" 
                height="24" 
                viewBox="0 0 24 24" 
                fill="none"
                className="text-[var(--foreground)]"
              >
                <path 
                  d="M15 18L9 12L15 6" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          <h1 className="text-xl font-bold text-[#4A2C2A]">
            {activeTab === "notifications"
              ? "Notifications"
              : activeTab === "parametres"
              ? "Paramètres"
              : activeTab === "foyer"
              ? "Foyer"
              : activeTab === "contact"
              ? "Aide et support"
              : activeTab === "abonnement"
              ? "Abonnement"
              : activeSection === "confidentialite"
              ? "Sécurité et confidentialité"
              : activeSection === "apropos"
              ? "À propos de Foodlane"
              : activeSection === "legales"
              ? "Mentions légales"
              : ""}
          </h1>
        </div>
      </header>
      )}

      {/* Menu principal - affiché seulement si aucune section détaillée n'est active */}
      {isHub && (
        <div className="px-4 pt-4">
          <SettingsHub
            displayName={`${preferences.prenom || profile?.prenom || "Utilisateur"}${preferences.prenom || profile?.prenom ? " 🍓" : ""}`}
            email={user.email || preferences.email || ""}
            isPremium={isPremium}
            subscriptionLabel={isPremium ? "Abonnement actif" : "Découvrir Premium"}
            notificationsEnabled={Boolean(
              preferences.notificationsNewRecipes ||
                preferences.notificationsMenuIdeas ||
                preferences.notificationsReminders
            )}
            themeLabel={theme === "dark" ? "Sombre" : "Clair"}
            languageLabel={preferences.langue === "en" ? "English" : "Français"}
            onOpenNotifications={() => openTab("notifications")}
            onOpenFoyer={() => openTab("foyer")}
            onOpenParametres={() => openTab("parametres")}
            onOpenAbonnement={() => openTab("abonnement")}
            onOpenAide={() => openTab("contact")}
            onOpenApropos={() => openSection("apropos")}
            onOpenConfidentialite={() => openSection("confidentialite")}
            onToggleNotifications={(enabled) => {
              setPreferences((prev) => ({
                ...prev,
                notificationsNewRecipes: enabled,
                notificationsMenuIdeas: enabled,
                notificationsReminders: enabled,
              }));
              savePreferences({
                ...preferences,
                notificationsNewRecipes: enabled,
                notificationsMenuIdeas: enabled,
                notificationsReminders: enabled,
              });
            }}
            onLogout={() => {
              if (confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
                void handleLogout();
              }
            }}
            onDeleteAccount={() => {
              void (async () => {
                if (!confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
                  return;
                }
                try {
                  const {
                    data: { session },
                  } = await supabase.auth.getSession();
                  if (!session?.access_token) {
                    alert("Session expirée. Reconnecte-toi puis réessaie.");
                    return;
                  }
                  const res = await fetch("/api/account/delete", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${session.access_token}` },
                  });
                  const j = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    alert(
                      typeof j.error === "string" && j.error.trim()
                        ? j.error
                        : "La suppression du compte a échoué. Réessaie plus tard."
                    );
                    return;
                  }
                  await logout();
                  window.location.href = "/login?deleted=1";
                } catch (e) {
                  console.error("[Menu] delete account", e);
                  alert("Erreur réseau lors de la suppression du compte.");
                }
              })();
            }}
          />
        </div>
      )}

      {/* Contenu des sections détaillées */}
      {(activeTab === "compte" ||
        activeSection === "confidentialite" ||
        activeSection === "apropos" ||
        activeSection === "legales") && (
        <>
          {/* Vue par défaut de l'onglet compte */}
          {activeTab === "compte" && !activeSection && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
                Mon compte
              </h2>
              <div className="space-y-3">
                <Link
                  href="/compte"
                  className="w-full text-left px-4 py-3 rounded-xl bg-[var(--beige-card)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#E94E77] transition-colors flex items-center justify-between"
                >
                  <span className="font-medium">Créer / Modifier mon profil</span>
                  <span>→</span>
                </Link>
                <button
                  onClick={() => openProfilSection()}
                  className="w-full text-left px-4 py-3 rounded-xl bg-[var(--beige-card)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#E94E77] transition-colors flex items-center justify-between"
                >
                  <span className="font-medium">Mon profil</span>
                  <span>→</span>
                </button>
              </div>
            </section>
          )}
          {/* Contenu des sections */}
          {activeSection === "profil" && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => backOneLevel()}
              className="text-[var(--beige-text-muted)] hover:text-[var(--foreground)]"
            >
              ← Retour
            </button>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Mon profil
            </h2>
          </div>
          {!loggedIn ? (
            <>
              {!showSignUp ? (
                <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] shadow-[0_4px_20px_rgba(233,78,119,0.08)] px-4 py-4">
                  <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">
                    Connexion
                  </h2>
                  <form onSubmit={handleLogin} className="space-y-3 text-sm">
                    {loginError && (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {loginError}
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                        Adresse email
                      </label>
                      <input
                        type="email"
                        required
                        value={loginForm.email}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, email: e.target.value })
                        }
                        placeholder="ton@email.com"
                        className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                        Mot de passe
                      </label>
                      <input
                        type="password"
                        required
                        value={loginForm.password}
                        onChange={(e) =>
                          setLoginForm({ ...loginForm, password: e.target.value })
                        }
                        placeholder="••••••••"
                        className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full mt-3 px-4 py-2 rounded-xl bg-[#E94E77] hover:bg-[#D63D66] text-white text-xs font-semibold transition-colors"
                    >
                      Se connecter
                    </button>
                  </form>
                  <div className="mt-4 pt-4 border-t border-[var(--beige-border)]">
                    <p className="text-xs text-[var(--beige-text-muted)] text-center mb-2">
                      Tu n&apos;as pas encore de compte ?
                    </p>
                    <button
                      onClick={() => setShowSignUp(true)}
                      className="w-full px-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#E94E77] transition-colors"
                    >
                      Créer un compte
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] shadow-[0_4px_20px_rgba(233,78,119,0.08)] px-4 py-4">
                  <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">
                    Créer un compte
                  </h2>
                  <form onSubmit={handleSignUp} className="space-y-3 text-sm">
                    {loginError && (
                      <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                        {loginError}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                          Prénom
                        </label>
                        <input
                          type="text"
                          required
                          value={signUpForm.prenom}
                          onChange={(e) =>
                            setSignUpForm({ ...signUpForm, prenom: e.target.value })
                          }
                          placeholder="Prénom"
                          className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                          Nom
                        </label>
                        <input
                          type="text"
                          required
                          value={signUpForm.nom}
                          onChange={(e) =>
                            setSignUpForm({ ...signUpForm, nom: e.target.value })
                          }
                          placeholder="Nom"
                          className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                        Adresse email
                      </label>
                      <input
                        type="email"
                        required
                        value={signUpForm.email}
                        onChange={(e) =>
                          setSignUpForm({ ...signUpForm, email: e.target.value })
                        }
                        placeholder="ton@email.com"
                        className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                        Mot de passe
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={signUpForm.password}
                        onChange={(e) =>
                          setSignUpForm({ ...signUpForm, password: e.target.value })
                        }
                        placeholder="Au moins 6 caractères"
                        className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                        Confirmer le mot de passe
                      </label>
                      <input
                        type="password"
                        required
                        value={signUpForm.confirmPassword}
                        onChange={(e) =>
                          setSignUpForm({
                            ...signUpForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Répète ton mot de passe"
                        className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full mt-3 px-4 py-2 rounded-xl bg-[#E94E77] hover:bg-[#D63D66] text-white text-xs font-semibold transition-colors"
                    >
                      Créer mon compte
                    </button>
                  </form>
                  <div className="mt-4 pt-4 border-t border-[var(--beige-border)]">
                    <p className="text-xs text-[var(--beige-text-muted)] text-center mb-2">
                      Tu as déjà un compte ?
                    </p>
                    <button
                      onClick={() => {
                        setShowSignUp(false);
                        setLoginError("");
                      }}
                      className="w-full px-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#E94E77] transition-colors"
                    >
                      Se connecter
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] shadow-[0_4px_20px_rgba(233,78,119,0.08)] px-4 py-4">
              {/* Informations de connexion */}
              <div className="mb-4 pb-4 border-b border-[var(--beige-border)]">
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-2">
                  Données de connexion
                </h3>
                <div className="space-y-1 text-xs text-[var(--beige-text-muted)]">
                  {profile?.prenom && (
                    <div>
                      <span className="font-medium">Prénom :</span> {profile.prenom}
                    </div>
                  )}
                  {user?.email && (
                    <div>
                      <span className="font-medium">Email :</span> {user.email}
                    </div>
                  )}
                  {profile?.full_name && (
                    <div>
                      <span className="font-medium">Nom complet :</span> {profile.full_name}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  Modifier mes informations
                </h2>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#E94E77] hover:bg-[#D63D56] rounded-lg transition-colors"
                >
                  Se déconnecter
                </button>
              </div>
              <form onSubmit={handleUpdateProfile} className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                      Prénom
                    </label>
                    <input
                      type="text"
                      value={preferences.prenom}
                      onChange={(e) => updatePreference("prenom", e.target.value)}
                      placeholder="Prénom"
                      className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={preferences.nom}
                      onChange={(e) => updatePreference("nom", e.target.value)}
                      placeholder="Nom"
                      className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                    Adresse email
                  </label>
                  <input
                    type="email"
                    value={preferences.email}
                    onChange={(e) => updatePreference("email", e.target.value)}
                    placeholder="ton@email.com"
                    className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={preferences.telephone}
                    onChange={(e) => updatePreference("telephone", e.target.value)}
                    placeholder="06 12 34 56 78"
                    className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full mt-3 px-4 py-2 rounded-xl bg-[#E94E77] hover:bg-[#D63D66] text-white text-xs font-semibold transition-colors"
                >
                  Enregistrer les modifications
                </button>
              </form>
            </div>
          )}

          {!isPremium && (
            <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] shadow-[0_4px_20px_rgba(233,78,119,0.08)] px-4 py-4">
              <h2 className="text-base font-semibold mb-2 text-[var(--foreground)]">
                Plan Premium{" "}
                <span className="text-xs text-[#BB8C78] uppercase tracking-wide">
                  Premium
                </span>
              </h2>
              <p className="text-xs text-[var(--beige-text-muted)] mb-3">
                Accède à toutes les fonctionnalités avancées : liste de courses
                automatique, recettes illimitées, et bien plus encore.
              </p>
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs text-[var(--beige-text-light)]">
                  <span>✓</span>
                  <span>Scan photo de frigo</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--beige-text-light)]">
                  <span>✓</span>
                  <span>Liste de courses automatique</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--beige-text-light)]">
                  <span>✓</span>
                  <span>Recettes supplémentaires</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--beige-text-light)]">
                  <span>✓</span>
                  <span>Sans publicités</span>
                </div>
              </div>
              <button
                onClick={() => router.push("/premium")}
                className="w-full px-4 py-2 rounded-xl bg-[#E94E77] hover:bg-[#D63D66] text-white text-xs font-semibold transition-colors"
              >
                Passer à Premium
              </button>
            </div>
          )}

          {isPremium && (
            <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] shadow-[0_4px_20px_rgba(233,78,119,0.08)] px-4 py-4">
              <h2 className="text-base font-semibold mb-2 text-[var(--foreground)]">
                {billingProfile?.subscription_tier === "premium_plus"
                  ? "Abonnement Premium Plus"
                  : "Abonnement Premium"}{" "}
                <span className="text-xs text-[#BB8C78] uppercase tracking-wide">
                  Actif
                </span>
              </h2>
              <p className="text-xs text-[var(--beige-text-muted)] mb-3">
                {billingProfile?.subscription_tier === "premium_plus"
                  ? "Tu bénéficies de toutes les fonctionnalités Premium et des options Plus."
                  : "Tu bénéficies de toutes les fonctionnalités Premium."}
              </p>
              {subscriptionTier === "premium" && (
                <button
                  type="button"
                  onClick={() => void handleUpgradeToPremiumPlus()}
                  disabled={upgradeToPlusLoading || cancelSubscriptionLoading}
                  className="w-full mb-2 px-4 py-2 rounded-xl bg-[#E94E77] hover:bg-[#D63D66] disabled:opacity-60 text-white text-xs font-semibold transition-colors"
                >
                  {upgradeToPlusLoading ? "Mise à niveau…" : "Passer à Premium Plus"}
                </button>
              )}
              <button
                onClick={async () => {
                  if (!user) {
                    alert("Tu dois être connecté pour gérer ton abonnement.");
                    return;
                  }
                  
                  try {
                    const response = await fetch("/api/billing/portal", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ userId: user.id }),
                    });

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(errorData.error || "Erreur lors de l'ouverture du portail");
                    }

                    const { url } = await response.json();
                    if (url) {
                      // Ouvrir dans un nouvel onglet pour permettre de revenir facilement à l'app
                      window.open(url, '_blank');
                    } else {
                      throw new Error("URL du portail non reçue");
                    }
                  } catch (error) {
                    console.error("[Menu] Erreur portal:", error);
                    alert(error instanceof Error ? error.message : "Erreur lors de l'ouverture du portail de gestion");
                  }
                }}
                className="w-full px-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#E94E77] transition-colors"
              >
                Historique de facturation / Voir sur le store
              </button>
              {billingProfile?.cancel_at_period_end ? (
                <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-2 text-xs font-medium text-amber-950 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-50">
                  Résiliation enregistrée — accès jusqu&apos;au{" "}
                  <strong>
                    {formatDateFrDMY(
                      billingProfile.current_period_end || billingProfile.premium_end_date
                    ) || "fin de période"}
                  </strong>
                  .
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleCancelSubscription()}
                  disabled={cancelSubscriptionLoading || upgradeToPlusLoading}
                  className="mt-2 w-full px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs font-semibold hover:bg-red-100 disabled:opacity-60 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
                >
                  {cancelSubscriptionLoading ? "Redirection…" : "Résilier l'abonnement"}
                </button>
              )}
            </div>
          )}
        </section>
          )}


          {activeSection === "confidentialite" && (
        <section className="space-y-4 px-4 py-6">
          <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] px-4 py-4 shadow-[0_4px_20px_rgba(233,78,119,0.08)]">
            <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">
              Politique de confidentialité
            </h2>
            <div className="space-y-3 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
              <div>
                <h3 className="font-semibold text-[var(--foreground)] mb-1">
                  Données collectées
                </h3>
                <p className="mb-2">
                  Foodlane collecte les données suivantes :
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    Données de profil : nom, prénom, email, téléphone (si
                    compte créé)
                  </li>
                  <li>
                    Préférences : régimes alimentaires, aversions,
                    équipements, objectifs
                  </li>
                  <li>
                    Données d&apos;usage : recettes favorites, historiques
                  </li>
                  <li>
                    Données techniques : langue, thème, paramètres de
                    notification
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--foreground)] mb-1">
                  Base légale (RGPD)
                </h3>
                <p className="mb-2">
                  Les données sont traitées sur la base de :
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    Consentement de l&apos;utilisateur pour les données de profil
                  </li>
                  <li>
                    Exécution du contrat pour fournir les services de
                    l&apos;application
                  </li>
                  <li>
                    Intérêt légitime pour améliorer les services proposés
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--foreground)] mb-1">
                  Durée de conservation
                </h3>
                <p className="mb-2">
                  Les données sont conservées tant que l&apos;utilisateur
                  maintient un compte actif. En cas de suppression du compte,
                  les données personnelles sont supprimées sous 30 jours.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--foreground)] mb-1">
                  Droits de l&apos;utilisateur
                </h3>
                <p className="mb-2">
                  Conformément au RGPD, vous disposez des droits suivants :
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    Droit d&apos;accès : consulter vos données personnelles
                  </li>
                  <li>
                    Droit de rectification : modifier vos données inexactes
                  </li>
                  <li>
                    Droit à l&apos;effacement : demander la suppression de vos
                    données
                  </li>
                  <li>
                    Droit à la portabilité : récupérer vos données dans un
                    format structuré
                  </li>
                  <li>
                    Droit d&apos;opposition : vous opposer au traitement de vos
                    données
                  </li>
                </ul>
                <p className="mt-2">
                  Pour exercer ces droits, contactez-nous à :
                  contact@foodlane.fr
                </p>
              </div>
            </div>
          </div>
        </section>
          )}

          {activeSection === "apropos" && (
        <section className="space-y-4 px-4 py-6">
          <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] px-4 py-4 space-y-3 text-sm text-[#8A6F6F] shadow-[0_4px_20px_rgba(233,78,119,0.08)]">
            <div>
              <h3 className="font-semibold text-[var(--foreground)] mb-2">
                Foodlane
              </h3>
              <p>
                Foodlane est une application mobile créée par Amandine Fontaine,
                diététicienne nutritionniste diplômée d&apos;État. Elle propose des
                suggestions de recettes basées sur les ingrédients que vous avez
                déjà chez vous, pour limiter le gaspillage alimentaire et
                faciliter l&apos;organisation culinaire.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)] mb-2">
                Notre mission
              </h3>
              <p>
                T&apos;aider à manger intelligemment avec ce que tu as déjà, tout en
                respectant tes préférences alimentaires et tes objectifs
                nutritionnels.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-[var(--foreground)] mb-2">
                Version
              </h3>
              <p>Foodlane v1.0.0</p>
            </div>
          </div>
        </section>
          )}

          {activeSection === "legales" && (
        <section className="space-y-4 px-4 py-6">
          <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] px-4 py-4 shadow-[0_4px_20px_rgba(233,78,119,0.08)]">
            <div className="space-y-2 text-sm">
              <button
                onClick={() =>
                  setShowLegalDoc(showLegalDoc === "mentions" ? null : "mentions")
                }
                className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#E94E77] transition-colors flex items-center justify-between"
              >
                <span>Mentions légales</span>
                <span>{showLegalDoc === "mentions" ? "−" : "+"}</span>
              </button>
              <button
                onClick={() =>
                  setShowLegalDoc(showLegalDoc === "cgu" ? null : "cgu")
                }
                className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#E94E77] transition-colors flex items-center justify-between"
              >
                <span>Conditions Générales d&apos;Utilisation (CGU)</span>
                <span>{showLegalDoc === "cgu" ? "−" : "+"}</span>
              </button>
              <button
                onClick={() =>
                  setShowLegalDoc(
                    showLegalDoc === "confidentialite" ? null : "confidentialite"
                  )
                }
                className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#E94E77] transition-colors flex items-center justify-between"
              >
                <span>Politique de confidentialité</span>
                <span>{showLegalDoc === "confidentialite" ? "−" : "+"}</span>
              </button>
              {isPremium && (
                <button
                  onClick={() =>
                    setShowLegalDoc(showLegalDoc === "cgv" ? null : "cgv")
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#E94E77] transition-colors flex items-center justify-between"
                >
                  <span>Conditions de vente (CGV)</span>
                  <span>{showLegalDoc === "cgv" ? "−" : "+"}</span>
                </button>
              )}
              <button
                onClick={() =>
                  setShowLegalDoc(showLegalDoc === "cookies" ? null : "cookies")
                }
                className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#E94E77] transition-colors flex items-center justify-between"
              >
                <span>Politique cookies</span>
                <span>{showLegalDoc === "cookies" ? "−" : "+"}</span>
              </button>
            </div>

            {/* Contenu des documents légaux — voir app/components/LegalDocuments.tsx */}
            {showLegalDoc === "mentions" && (
              <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                <MentionsLegalesContent />
              </div>
            )}

            {showLegalDoc === "cgu" && (
              <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                <CGUContent />
              </div>
            )}

            {showLegalDoc === "confidentialite" && (
              <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                <ConfidentialiteContent />
              </div>
            )}

            {showLegalDoc === "cgv" && (
              <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                <CGVContent />
              </div>
            )}

            {showLegalDoc === "cookies" && (
              <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                <CookiesContent />
              </div>
            )}
          </div>
        </section>
          )}
        </>
      )}

      {activeTab === "notifications" && (
        <>
          <section className="px-4 py-6 space-y-4">
            <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] px-4 py-4 shadow-[0_4px_20px_rgba(233,78,119,0.08)]">
              <h2 className="text-base font-semibold mb-3 text-[#4A2C2A]">Notifications</h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Nouvelles recettes</p>
                  </div>
                  <button
                    onClick={() =>
                      updatePreference(
                        "notificationsNewRecipes",
                        !preferences.notificationsNewRecipes
                      )
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      preferences.notificationsNewRecipes
                        ? "bg-[#E94E77]"
                        : "bg-[#D4C4B8]"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        preferences.notificationsNewRecipes
                          ? "translate-x-6"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--beige-border)]">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      Idées de menus / newsletters
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      updatePreference(
                        "notificationsMenuIdeas",
                        !preferences.notificationsMenuIdeas
                      )
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      preferences.notificationsMenuIdeas
                        ? "bg-[#E94E77]"
                        : "bg-[#D4C4B8]"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        preferences.notificationsMenuIdeas
                          ? "translate-x-6"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--beige-border)]">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Rappels</p>
                    <p className="text-xs text-[var(--beige-text-muted)] mt-1">
                      Ex: &quot;Pense à utiliser ce que tu as au frigo&quot;
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      updatePreference(
                        "notificationsReminders",
                        !preferences.notificationsReminders
                      )
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      preferences.notificationsReminders
                        ? "bg-[#E94E77]"
                        : "bg-[#D4C4B8]"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        preferences.notificationsReminders
                          ? "translate-x-6"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] px-4 py-4 shadow-[0_4px_20px_rgba(233,78,119,0.08)]">
              <h2 className="text-base font-semibold mb-3 text-[#4A2C2A]">
                Publicités
              </h2>
              <div className="space-y-3 text-sm">
                <div className="rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2">
                  <p className="text-xs text-[var(--beige-text-muted)]">
                    Version gratuite avec publicités
                  </p>
                </div>
                {!isPremium && (
                  <button
                    onClick={() => router.push("/premium")}
                    className="w-full px-4 py-2 rounded-xl bg-[#E94E77] hover:bg-[#D63D66] text-white text-xs font-semibold transition-colors"
                  >
                    Passer à Premium sans publicités
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] px-4 py-4 shadow-[0_4px_20px_rgba(233,78,119,0.08)]">
              <h2 className="text-base font-semibold mb-3 text-[#4A2C2A]">
                Performance / usage
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      Effacer le cache / données locales
                    </p>
                    <p className="text-xs text-[var(--beige-text-muted)] mt-1">
                      Supprime toutes les données locales et le cache de
                      l&apos;application
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          "Êtes-vous sûr de vouloir effacer toutes les données locales ? Cette action est irréversible."
                        )
                      ) {
                        localStorage.clear();
                        alert("Données effacées avec succès. La page va se recharger.");
                        window.location.reload();
                      }
                    }}
                    className="px-3 py-1 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
                  >
                    Effacer
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {activeTab === "parametres" && (
        <>
          <section className="px-4 py-6 space-y-4">
            <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] shadow-[0_4px_20px_rgba(233,78,119,0.08)] px-4 py-4">
              <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">Apparence</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Mode sombre</p>
                    <p className="text-xs text-[var(--beige-text-muted)]">
                      Active le thème sombre pour un confort visuel optimal
                    </p>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      theme === "dark" ? "bg-[#E94E77]" : "bg-[#D4C4B8]"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        theme === "dark" ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[var(--beige-border)]">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">Langue</p>
                    <p className="text-xs text-[var(--beige-text-muted)]">
                      Choisis la langue de l&apos;application
                    </p>
                  </div>
                  <select
                    value={preferences.langue}
                    onChange={(e) => {
                      const newLang = e.target.value as Locale;
                      updatePreference("langue", newLang);
                      setLocale(newLang);
                      setLocaleFromContext(newLang);
                    }}
                    className="rounded-lg bg-[var(--background)] border border-[var(--beige-border)] px-3 py-1 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] shadow-[0_4px_20px_rgba(233,78,119,0.08)] px-4 py-4">
              <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">
                Infos légales
              </h2>
              <div className="space-y-2 text-sm">
                <button
                  onClick={() =>
                    setShowLegalDoc(showLegalDoc === "mentions" ? null : "mentions")
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#E94E77] transition-colors flex items-center justify-between"
                >
                  <span>Mentions légales</span>
                  <span>{showLegalDoc === "mentions" ? "−" : "+"}</span>
                </button>
                <button
                  onClick={() =>
                    setShowLegalDoc(showLegalDoc === "cgu" ? null : "cgu")
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#E94E77] transition-colors flex items-center justify-between"
                >
                  <span>Conditions Générales d&apos;Utilisation (CGU)</span>
                  <span>{showLegalDoc === "cgu" ? "−" : "+"}</span>
                </button>
                <button
                  onClick={() =>
                    setShowLegalDoc(
                      showLegalDoc === "confidentialite" ? null : "confidentialite"
                    )
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#E94E77] transition-colors flex items-center justify-between"
                >
                  <span>Politique de confidentialité</span>
                  <span>{showLegalDoc === "confidentialite" ? "−" : "+"}</span>
                </button>
                <button
                  onClick={() =>
                    setShowLegalDoc(showLegalDoc === "cgv" ? null : "cgv")
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#E94E77] transition-colors flex items-center justify-between"
                >
                  <span>Conditions de vente (CGV)</span>
                  <span>{showLegalDoc === "cgv" ? "−" : "+"}</span>
                </button>
                <button
                  onClick={() =>
                    setShowLegalDoc(showLegalDoc === "cookies" ? null : "cookies")
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#E94E77] transition-colors flex items-center justify-between"
                >
                  <span>Politique cookies</span>
                  <span>{showLegalDoc === "cookies" ? "−" : "+"}</span>
                </button>
              </div>

              {/* Contenu des documents légaux — voir app/components/LegalDocuments.tsx */}
              {showLegalDoc === "mentions" && (
                <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                  <MentionsLegalesContent />
                </div>
              )}

              {showLegalDoc === "cgu" && (
                <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                  <CGUContent />
                </div>
              )}

              {showLegalDoc === "confidentialite" && (
                <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                  <ConfidentialiteContent />
                </div>
              )}

              {showLegalDoc === "cgv" && (
                <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                  <CGVContent />
                </div>
              )}

              {showLegalDoc === "cookies" && (
                <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                  <CookiesContent />
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === "foyer" && (
        <section className="px-4 py-6 space-y-4">
          <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] shadow-[0_4px_20px_rgba(233,78,119,0.08)] px-4 py-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">{t("menu.foyer.title")}</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-3">{t("menu.foyer.intro")}</p>
            <Link
              href="/preferences"
              className="inline-flex text-sm font-semibold text-[#6B2E2E] underline hover:no-underline"
            >
              {t("menu.foyer.link_prefs")}
            </Link>
          </div>
          {!foyerPlannerLoaded ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner message={t("menu.foyer.loading")} />
            </div>
          ) : (
            <PlannerProfileForm
              key={`foyer-plan-${user?.id ?? "anon"}`}
              initial={foyerPlannerPrefs}
              visualVariant="foyer"
              submitLabel={t("preferences.submit.update")}
              onSubmit={async ({
                preferences: plannerPrefs,
                equipment_keys,
                allergy_keys,
                excluded_ingredients,
              }) => {
                const res = await plannerFetch("/preferences", {
                  method: "PUT",
                  body: JSON.stringify({
                    preferences: {
                      ...plannerPrefs,
                      recipe_scaling_portions:
                        Math.max(1, plannerPrefs.household_size) === 5
                          ? plannerPrefs.recipe_scaling_portions
                          : null,
                    },
                    equipment_keys,
                    allergy_keys,
                    excluded_ingredients,
                  }),
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  throw new Error(err.error || "Erreur");
                }
                setFoyerPlannerPrefs(plannerPrefs);
                const h = Math.max(1, plannerPrefs.household_size || 1);
                setRecipeScalingPortionsMenu(
                  h === 5 ? (plannerPrefs.recipe_scaling_portions ?? null) : null
                );
                setPreferences((prev) => mergeUserPreferencesFromPlanner(prev, plannerPrefs));
              }}
            />
          )}
        </section>
      )}

      {activeTab === "abonnement" && (
        <section className="px-4 py-6 space-y-4">
          <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] shadow-[0_4px_20px_rgba(233,78,119,0.08)] px-4 py-4">
            <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">
              Abonnement
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-[var(--beige-text-muted)] mb-2">
                  Type d&apos;abonnement actuel
                </p>
                <div className="rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 flex items-center justify-between">
                  <span className="font-semibold text-[var(--foreground)]">
                    {!isPremium
                      ? "Gratuit"
                      : billingProfile?.subscription_tier === "premium_plus"
                        ? "Premium Plus"
                        : "Premium"}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      isPremium
                        ? billingProfile?.subscription_tier === "premium_plus"
                          ? "bg-[#E94E77] text-white"
                          : "bg-[#E94E77] text-white"
                        : "bg-[var(--beige-card-alt)] text-[var(--beige-text-muted)]"
                    }`}
                  >
                    {!isPremium
                      ? "Gratuit"
                      : billingProfile?.subscription_tier === "premium_plus"
                        ? "Plus"
                        : "Premium"}
                  </span>
                </div>
              </div>

              {!isPremium && (
                <>
                  <div className="pt-2 border-t border-[var(--beige-border)]">
                    <p className="text-xs text-[var(--beige-text-muted)] mb-2">
                      Ce que débloque le Premium
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-[var(--beige-text-light)]">
                        <span>✓</span>
                        <span>Scan photo de frigo</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--beige-text-light)]">
                        <span>✓</span>
                        <span>Liste de courses automatique</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--beige-text-light)]">
                        <span>✓</span>
                        <span>Recettes supplémentaires</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--beige-text-light)]">
                        <span>✓</span>
                        <span>Régimes alimentaires avancés</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--beige-text-light)]">
                        <span>✓</span>
                        <span>Sans publicités</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/premium")}
                    className="w-full mt-3 px-4 py-3 rounded-xl bg-[#E94E77] hover:bg-[#D63D66] text-white text-sm font-semibold transition-colors"
                  >
                    Passer à Premium
                  </button>
                </>
              )}

              {isPremium && subscriptionTier === "premium" && (
                <div className="pt-2 border-t border-[var(--beige-border)]">
                  <p className="text-xs text-[var(--beige-text-muted)] mb-2">
                    Passer au palier supérieur (même facturation, prorata Stripe)
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleUpgradeToPremiumPlus()}
                    disabled={upgradeToPlusLoading || cancelSubscriptionLoading}
                    className="w-full px-4 py-3 rounded-xl bg-[#E94E77] hover:bg-[#D63D66] disabled:opacity-60 text-white text-sm font-semibold transition-colors"
                  >
                    {upgradeToPlusLoading ? "Mise à niveau…" : "Passer à Premium Plus"}
                  </button>
                </div>
              )}

              {isPremium && (
                <div className="pt-2 border-t border-[var(--beige-border)]">
                  <p className="text-xs text-[var(--beige-text-muted)] mb-2">
                    Gestion de l&apos;abonnement
                  </p>
                  <button
                    onClick={async () => {
                      if (!user) {
                        alert("Tu dois être connecté pour gérer ton abonnement.");
                        return;
                      }
                      
                      try {
                        const response = await fetch("/api/billing/portal", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ userId: user.id }),
                        });

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.error || "Erreur lors de l'ouverture du portail");
                        }

                        const { url } = await response.json();
                        if (url) {
                          // Ouvrir dans un nouvel onglet pour permettre de revenir facilement à l'app
                          window.open(url, '_blank');
                        } else {
                          throw new Error("URL du portail non reçue");
                        }
                      } catch (error) {
                        console.error("[Menu] Erreur portal:", error);
                        alert(error instanceof Error ? error.message : "Erreur lors de l'ouverture du portail de gestion");
                      }
                    }}
                    className="w-full px-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#E94E77] transition-colors"
                  >
                    Historique de facturation / Portail Stripe
                  </button>
                  {billingProfile?.cancel_at_period_end ? (
                    <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-2 py-2 text-xs font-medium text-amber-950 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-50">
                      Résiliation enregistrée — accès jusqu&apos;au{" "}
                      <strong>
                        {formatDateFrDMY(
                          billingProfile.current_period_end || billingProfile.premium_end_date
                        ) || "fin de période"}
                      </strong>
                      .
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleCancelSubscription()}
                      disabled={cancelSubscriptionLoading || upgradeToPlusLoading}
                      className="mt-2 w-full px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-900 text-xs font-semibold hover:bg-red-100 disabled:opacity-60 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100"
                    >
                      {cancelSubscriptionLoading ? "Redirection…" : "Résilier l'abonnement"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === "contact" && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
            {t("contact.title")}
          </h2>

          {/* FAQ */}
          <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] shadow-[0_4px_20px_rgba(233,78,119,0.08)] px-4 py-4">
            <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">
              {t("contact.faq.title")}
            </h2>
            <div className="space-y-3">
              {Array.from({ length: FAQ_COUNT }, (_, i) => i + 1).map((num) => (
                <details
                  key={num}
                  className="border-b border-[var(--beige-border)] pb-2 last:border-0"
                >
                  <summary className="text-sm font-medium text-[var(--foreground)] cursor-pointer list-none flex items-center justify-between">
                    <span>{t(`faq.${num}.q`)}</span>
                    <span className="text-[var(--beige-text-muted)]">+</span>
                  </summary>
                  <p className="text-xs text-[var(--beige-text-light)] mt-2 pl-2">
                    {t(`faq.${num}.a`)}
                  </p>
                </details>
              ))}
            </div>
          </div>

          {/* Formulaire de contact */}
          {!showContactForm ? (
            <div className="space-y-3">
              <UserFeedback />

              {/* Formulaire de contact classique */}
              <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] shadow-[0_4px_20px_rgba(233,78,119,0.08)] px-4 py-4 text-center">
                <p className="text-sm text-[var(--foreground)] mb-3">
                  {t("contact.form.not_found")}
                </p>
                <button
                  onClick={() => setShowContactForm(true)}
                  className="w-full px-4 py-2 rounded-xl bg-[#E94E77] hover:bg-[#D63D56] text-white text-xs font-semibold transition-colors"
                >
                  Nous contacter
                </button>
              </div>
            </div>
          ) : (
                <div className="rounded-2xl border border-[#F5DDE5] bg-[#FFF0F3] shadow-[0_4px_20px_rgba(233,78,119,0.08)] px-4 py-4">
                  <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">Nous contacter</h2>
                  {contactSubmitted ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-[#E94E77] font-semibold">
                        ✓ Message envoyé avec succès !
                      </p>
                      <p className="text-xs text-[#9A6A6A] mt-1">
                        Nous te répondrons dans les plus brefs délais.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                            Prénom
                          </label>
                          <input
                            type="text"
                            required
                            value={contactForm.prenom}
                            onChange={(e) =>
                              setContactForm({
                                ...contactForm,
                                prenom: e.target.value,
                              })
                            }
                            placeholder="Prénom"
                            className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                            Nom
                          </label>
                          <input
                            type="text"
                            required
                            value={contactForm.nom}
                            onChange={(e) =>
                              setContactForm({
                                ...contactForm,
                                nom: e.target.value,
                              })
                            }
                            placeholder="Nom"
                            className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                          Adresse email
                        </label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              email: e.target.value,
                            })
                          }
                          placeholder="ton@email.com"
                          className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          value={contactForm.telephone}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              telephone: e.target.value,
                            })
                          }
                          placeholder="06 12 34 56 78"
                          className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                          Objet de la demande
                        </label>
                        <select
                          required
                          value={contactForm.objet}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              objet: e.target.value,
                            })
                          }
                          className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77]"
                        >
                          <option value="">Sélectionner un objet</option>
                          {CONTACT_SUBJECTS.map((subject) => (
                            <option key={subject} value={subject}>
                              {subject}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                          Message
                        </label>
                        <textarea
                          required
                          value={contactForm.message}
                          onChange={(e) =>
                            setContactForm({
                              ...contactForm,
                              message: e.target.value,
                            })
                          }
                          placeholder="Décris ton problème ou ta question..."
                          rows={5}
                          className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#E94E77] resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowContactForm(false);
                            setContactForm({
                              nom: "",
                              prenom: "",
                              email: "",
                              telephone: "",
                              objet: "",
                              message: "",
                            });
                          }}
                          className="flex-1 px-4 py-2 rounded-xl bg-[var(--beige-card)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#E94E77] transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="flex-1 px-4 py-2 rounded-xl bg-[#E94E77] hover:bg-[#D63D66] text-white text-xs font-semibold transition-colors"
                        >
                          Envoyer
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
        </section>
      )}

    </main>
  );
}
