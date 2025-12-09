"use client";

import { useState, useEffect } from "react";
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
import { t, setLocale, getLocale, type Locale } from "../src/lib/i18n";
import { useTranslation } from "../components/TranslationProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ALL_DIETARY_PROFILES,
  isDietaryProfileAvailable,
  DIETARY_PROFILE_ICONS,
  type DietaryProfile,
} from "../src/lib/dietaryProfiles";
import { type NutritionGoal, NUTRITION_GOALS } from "../src/lib/nutritionGoals";
import { useSwipeBack } from "../hooks/useSwipeBack";

// Liste des équipements disponibles
const AVAILABLE_EQUIPMENTS = [
  "Four",
  "Micro-ondes",
  "Plaques de cuisson",
  "Casserole",
  "Poêle",
  "Mixeur",
  "Robot mixeur",
  "Mixeur plongeant",
  "Robot cuiseur",
  "Friteuse",
  "Airfryer",
  "Autocuiseur",
  "Blender",
  "Grille-pain",
];

type MenuSection =
  | "profil"
  | "parametres"
  | "abonnement"
  | "confidentialite"
  | "aide"
  | "apropos"
  | "legales"
  | null;

type LegalDocType = "mentions" | "cgu" | "confidentialite" | "cgv" | "cookies" | null;

const FAQ_ITEMS = [
  {
    question: "Comment ajouter une recette en favoris ?",
    answer:
      "Ouvre une recette depuis les résultats de recherche et clique sur l'étoile (☆) pour l'ajouter à tes favoris. Tu peux ensuite la retrouver dans l'onglet Outils.",
  },
  {
    question: "Comment fonctionne la recherche de recettes ?",
    answer:
      "Saisis les ingrédients que tu as chez toi dans le champ de recherche. L'application te proposera des recettes correspondantes. Tu peux aussi filtrer par type (sucré/salé).",
  },
  {
    question: "Puis-je utiliser l'app sans compte ?",
    answer:
      "Oui, tu peux utiliser les fonctionnalités de base sans compte. Cependant, certaines fonctionnalités comme la liste de courses sont réservées aux comptes Premium.",
  },
  {
    question: "Comment passer à Premium ?",
    answer:
      "Dans l'onglet Menu > Espace compte, tu trouveras les options pour souscrire à un plan Premium et accéder à toutes les fonctionnalités avancées.",
  },
  {
    question: "Mes favoris sont-ils sauvegardés ?",
    answer:
      "Oui, tes recettes favorites sont sauvegardées localement sur ton appareil. Elles restent disponibles même après fermeture de l'application.",
  },
  {
    question: "Comment modifier mes informations de compte ?",
    answer:
      "Va dans Menu > Espace compte pour modifier ton email, ton mot de passe et gérer ton abonnement Premium.",
  },
];

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

const OBJECTIFS_USAGE = [
  "Limiter le gaspillage alimentaire",
  "Manger plus équilibré",
  "Diminuer la charge mentale",
  "Faciliter mon organisation",
  "Découvrir des recettes",
  "Manger moins de viande",
  "Manger plus de légumes",
  "Payer moins cher",
  "Cuisiner plus rapidement",
  "Varier les repas",
  "Manger plus sainement",
];

export default function MenuPage() {
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const { setLocale: setLocaleFromContext } = useTranslation();
  const { user, profile, loading: sessionLoading } = useSupabaseSession();
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
    telephone: "",
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
  const [activeTab, setActiveTab] = useState<"compte" | "parametres" | "notifications" | "foyer" | "contact" | "abonnement" | null>(null);
  const [activeSection, setActiveSection] = useState<MenuSection>(null);
  const [showLegalDoc, setShowLegalDoc] = useState<LegalDocType>(null);
  const [allergiesInput, setAllergiesInput] = useState("");

  // Geste de balayage pour revenir en arrière dans les sections
  useSwipeBack(() => {
    if (activeSection) {
      setActiveSection(null);
    } else if (showLegalDoc) {
      setShowLegalDoc(null);
    }
  }, activeSection !== null || showLegalDoc !== null);

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

  function toggleArrayPreference(
    key: "regimesParticuliers" | "aversionsAlimentaires" | "equipements" | "objectifsUsage",
    value: string
  ) {
    setPreferences((prev) => {
      const current = prev[key] as string[];
      const newArray = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [key]: newArray };
    });
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
      telephone: signUpForm.telephone,
    });
    setLoggedIn(true);
    setPreferences((prev) => ({
      ...prev,
      email: signUpForm.email,
      nom: signUpForm.nom,
      prenom: signUpForm.prenom,
      telephone: signUpForm.telephone,
    }));
    setSignUpForm({
      email: "",
      password: "",
      confirmPassword: "",
      nom: "",
      prenom: "",
      telephone: "",
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
        telephone: "",
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
    <main className="max-w-md mx-auto bg-[var(--background)] min-h-screen pb-32">
      {/* Header */}
      <header className="sticky top-0 bg-[var(--background)] border-b border-gray-200 px-4 py-3 z-10">
        <div className="flex items-center gap-3">
          {(activeTab || activeSection) && (
            <button
              onClick={() => {
                if (activeSection) {
                  setActiveSection(null);
                } else {
                  setActiveTab(null);
                }
              }}
              className="p-2 -ml-2"
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
          )}
          <h1 className="text-xl font-bold text-[var(--foreground)]">
            {activeTab === "notifications" ? "Notifications" :
             activeTab === "parametres" ? "Paramètres" :
             activeTab === "foyer" ? "Foyer" :
             activeTab === "contact" ? "Contact" :
             activeTab === "abonnement" ? "Abonnement" :
             ""}
          </h1>
        </div>
      </header>

      {/* Menu principal - affiché seulement si aucune section détaillée n'est active */}
      {!activeTab && !activeSection && (
        <div className="px-4 py-6 space-y-6">
          {/* Section GENERAL */}
          <section>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-4">
              GÉNÉRAL
            </h2>
            <div className="bg-[var(--background)] rounded-lg border border-gray-200 overflow-hidden">
              <MenuItem
                icon={
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path 
                      d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M17.59 20C17.59 16.13 13.74 13 10 13C6.26 13 2.41 16.13 2.41 20" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                }
                label="Compte"
                href="/compte"
              />
              <div className="border-t border-gray-200">
                <MenuItem
                  icon={
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path 
                        d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z" 
                        stroke="currentColor" 
                        strokeWidth="1.5"
                      />
                      <path 
                        d="M10 6V10L13 13" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                      />
                    </svg>
                  }
                  label="Notifications"
                  onClick={() => setActiveTab("notifications")}
                />
              </div>
              <div className="border-t border-gray-200">
                <MenuItem
                  icon={
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path 
                        d="M2 6L10 1L18 6V16C18 16.5304 17.7893 17.0391 17.4142 17.4142C17.0391 17.7893 16.5304 18 16 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V6Z" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                      <path 
                        d="M7 18V10H13V18" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                  label="Foyer"
                  onClick={() => setActiveTab("foyer")}
                />
              </div>
              <div className="border-t border-gray-200">
                <MenuItem
                  icon={
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle 
                        cx="10" 
                        cy="10" 
                        r="3" 
                        stroke="currentColor" 
                        strokeWidth="1.5"
                      />
                      <path 
                        d="M10 2V4M10 16V18M18 10H16M4 10H2M15.6569 4.34315L14.2426 5.75737M5.75737 14.2426L4.34315 15.6569M15.6569 15.6569L14.2426 14.2426M5.75737 5.75737L4.34315 4.34315" 
                        stroke="currentColor" 
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  }
                  label="Paramètres"
                  onClick={() => setActiveTab("parametres")}
                />
              </div>
              <div className="border-t border-gray-200">
                <MenuItem
                  icon={
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path 
                        d="M10 2L12.5 7.5L18.5 8.5L14.5 12.5L15.5 18.5L10 15.5L4.5 18.5L5.5 12.5L1.5 8.5L7.5 7.5L10 2Z" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                  label="Abonnement"
                  onClick={() => {
                    setActiveTab("abonnement");
                  }}
                />
              </div>
              <div className="border-t border-gray-200">
                <MenuItem
                  icon={
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path 
                        d="M10 2C5.58172 2 2 5.58172 2 10C2 10.5523 2.44772 11 3 11C3.55228 11 4 10.5523 4 10C4 6.68629 6.68629 4 10 4C13.3137 4 16 6.68629 16 10C16 13.3137 13.3137 16 10 16C9.44772 16 9 16.4477 9 17C9 17.5523 9.44772 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z" 
                        stroke="currentColor" 
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle 
                        cx="7" 
                        cy="10" 
                        r="1" 
                        fill="currentColor"
                      />
                      <circle 
                        cx="10" 
                        cy="10" 
                        r="1" 
                        fill="currentColor"
                      />
                      <circle 
                        cx="13" 
                        cy="10" 
                        r="1" 
                        fill="currentColor"
                      />
                    </svg>
                  }
                  label="Contact"
                  onClick={() => setActiveTab("contact")}
                />
              </div>
              <div className="border-t border-gray-200">
                <MenuItem
                  icon={
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path 
                        d="M4 4H16V16H4V4Z" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                      <path 
                        d="M4 4L10 10L16 4" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  }
                  label="Déconnexion"
                  onClick={async () => {
                    if (confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
                      await handleLogout();
                    }
                  }}
                  danger
                />
              </div>
              <div className="border-t border-gray-200">
                <MenuItem
                  icon={
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path 
                        d="M4 5H16V15H4V5Z" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                      <path 
                        d="M8 5V3C8 2.46957 8.21071 1.96086 8.58579 1.58579C8.96086 1.21071 9.46957 1 10 1C10.5304 1 11.0391 1.21071 11.4142 1.58579C11.7893 1.96086 12 2.46957 12 3V5" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                      <path 
                        d="M8 9V11M12 9V11" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                      />
                    </svg>
                  }
                  label="Supprimer le compte"
                  onClick={() => {
                    if (confirm("Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.")) {
                      // TODO: Implémenter la suppression du compte
                      alert("Fonctionnalité à venir");
                    }
                  }}
                  danger
                />
              </div>
            </div>
          </section>

        </div>
      )}

      {/* Contenu des sections détaillées */}
      {activeTab === "compte" && (
        <>
          {/* Vue par défaut de l'onglet compte */}
          {!activeSection && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
                Mon compte
              </h2>
              <div className="space-y-3">
                <Link
                  href="/compte"
                  className="w-full text-left px-4 py-3 rounded-xl bg-[var(--beige-card)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#D44A4A] transition-colors flex items-center justify-between"
                >
                  <span className="font-medium">Créer / Modifier mon profil</span>
                  <span>→</span>
                </Link>
                <button
                  onClick={() => setActiveSection("profil")}
                  className="w-full text-left px-4 py-3 rounded-xl bg-[var(--beige-card)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#D44A4A] transition-colors flex items-center justify-between"
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
              onClick={() => setActiveSection(null)}
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
                <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
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
                        className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
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
                        className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full mt-3 px-4 py-2 rounded-xl bg-[#D44A4A] hover:bg-[#7A5F3F] text-white text-xs font-semibold transition-colors"
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
                      className="w-full px-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#D44A4A] transition-colors"
                    >
                      Créer un compte
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
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
                          className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
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
                          className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
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
                        className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--beige-text-muted)] mb-1">
                        Téléphone
                      </label>
                      <input
                        type="tel"
                        value={signUpForm.telephone}
                        onChange={(e) =>
                          setSignUpForm({ ...signUpForm, telephone: e.target.value })
                        }
                        placeholder="06 12 34 56 78"
                        className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
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
                        className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
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
                        className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full mt-3 px-4 py-2 rounded-xl bg-[#D44A4A] hover:bg-[#7A5F3F] text-white text-xs font-semibold transition-colors"
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
                      className="w-full px-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#D44A4A] transition-colors"
                    >
                      Se connecter
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
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
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#D44A4A] hover:bg-[#C03A3A] rounded-lg transition-colors"
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
                      className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
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
                      className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
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
                    className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
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
                    className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full mt-3 px-4 py-2 rounded-xl bg-[#D44A4A] hover:bg-[#7A5F3F] text-white text-xs font-semibold transition-colors"
                >
                  Enregistrer les modifications
                </button>
              </form>
            </div>
          )}

          {preferences.abonnementType === "free" && (
            <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
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
                className="w-full px-4 py-2 rounded-xl bg-[#D44A4A] hover:bg-[#7A5F3F] text-white text-xs font-semibold transition-colors"
              >
                Passer à Premium
              </button>
            </div>
          )}

          {preferences.abonnementType === "premium" && (
            <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
              <h2 className="text-base font-semibold mb-2 text-[var(--foreground)]">
                Abonnement Premium{" "}
                <span className="text-xs text-[#BB8C78] uppercase tracking-wide">
                  Actif
                </span>
              </h2>
              <p className="text-xs text-[var(--beige-text-muted)] mb-3">
                Tu bénéficies de toutes les fonctionnalités Premium.
              </p>
              <button
                onClick={() => {
                  alert("Historique de facturation / lien vers le store (à venir)");
                }}
                className="w-full px-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#D44A4A] transition-colors"
              >
                Historique de facturation / Voir sur le store
              </button>
            </div>
          )}
        </section>
          )}


          {activeTab === "compte" && activeSection === "confidentialite" && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setActiveSection(null)}
              className="text-[var(--beige-text-muted)] hover:text-[var(--foreground)]"
            >
              ← Retour
            </button>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Données & confidentialité
            </h2>
          </div>

          <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
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
                  contact.foodlane@gmail.com
                </p>
              </div>
            </div>
          </div>
        </section>
          )}

          {activeTab === "compte" && activeSection === "apropos" && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setActiveSection(null)}
              className="text-[var(--beige-text-muted)] hover:text-[var(--foreground)]"
            >
              ← Retour
            </button>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              À propos de Foodlane
            </h2>
          </div>

          <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4 space-y-3 text-sm text-[var(--beige-text-light)]">
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

          {activeTab === "compte" && activeSection === "legales" && (
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => {
                setActiveSection(null);
                setShowLegalDoc(null);
              }}
              className="text-[var(--beige-text-muted)] hover:text-[var(--foreground)]"
            >
              ← Retour
            </button>
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              Infos légales
            </h2>
          </div>

          <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
            <div className="space-y-2 text-sm">
              <button
                onClick={() =>
                  setShowLegalDoc(showLegalDoc === "mentions" ? null : "mentions")
                }
                className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#D44A4A] transition-colors flex items-center justify-between"
              >
                <span>Mentions légales</span>
                <span>{showLegalDoc === "mentions" ? "−" : "+"}</span>
              </button>
              <button
                onClick={() =>
                  setShowLegalDoc(showLegalDoc === "cgu" ? null : "cgu")
                }
                className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#D44A4A] transition-colors flex items-center justify-between"
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
                className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#D44A4A] transition-colors flex items-center justify-between"
              >
                <span>Politique de confidentialité</span>
                <span>{showLegalDoc === "confidentialite" ? "−" : "+"}</span>
              </button>
              {preferences.abonnementType === "premium" && (
                <button
                  onClick={() =>
                    setShowLegalDoc(showLegalDoc === "cgv" ? null : "cgv")
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#D44A4A] transition-colors flex items-center justify-between"
                >
                  <span>Conditions de vente (CGV)</span>
                  <span>{showLegalDoc === "cgv" ? "−" : "+"}</span>
                </button>
              )}
            </div>

            {/* Contenu des documents légaux */}
            {showLegalDoc === "mentions" && (
              <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    Éditeur de l&apos;application
                  </h3>
                  <p className="space-y-1">
                    L&apos;application Foodlane est éditée par :
                    <br />
                    <strong>Amandine Fontaine – WayDia</strong>
                    <br />
                    Micro-entreprise – Prestations de services
                    <br />
                    Diététicienne-Nutritionniste diplômée d&apos;État
                    <br />
                    RPPS : 10111242268
                    <br />
                    SIRET : 988 976 163 00010
                    <br />
                    Code APE : 8690F — Activités de santé humaine non classées ailleurs
                    <br />
                    Siège social : 55 rue Grignan, 13006 Marseille, France
                    <br />
                    Email : contact.foodlane@gmail.com
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    Responsable de la publication
                  </h3>
                  <p>Amandine Fontaine</p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    Hébergement et infrastructure
                  </h3>
                  <p className="space-y-1">
                    L&apos;application Foodlane est distribuée via :
                    <br />
                    • Apple App Store — Apple Inc.
                    <br />
                    • Google Play Store — Google LLC
                    <br />
                    <br />
                    Les données utilisateurs sont traitées dans le respect du RGPD.
                    <br />
                    Les serveurs et infrastructures utilisées pour le stockage des données sont situés au sein de l&apos;Union Européenne ou dans des pays reconnus comme assurant un niveau de protection adéquat.
                    <br />
                    Les prestataires techniques (hébergeurs, services d&apos;authentification, etc.) seront mentionnés dans la Politique de confidentialité.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    Propriété intellectuelle
                  </h3>
                  <p>
                    L&apos;ensemble des contenus, éléments graphiques, textes, fonctionnalités, logos et marques présents dans l&apos;application Foodlane sont la propriété exclusive de WayDia / Amandine Fontaine, sauf mentions contraires.
                    <br />
                    Toute reproduction totale ou partielle, modification ou utilisation non autorisée est strictement interdite au titre de la propriété intellectuelle.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    Objet du service
                  </h3>
                  <p className="space-y-1">
                    Foodlane est une application d&apos;aide à l&apos;organisation et l&apos;inspiration alimentaires :
                    <br />
                    • Suggestions de recettes
                    <br />
                    • Personnalisation selon les goûts, objectifs et préférences alimentaires
                    <br />
                    • Gestion de favoris
                    <br />
                    <br />
                    <strong>Foodlane ne constitue pas un dispositif médical et ne dispense pas de soins, diagnostics ou prescriptions médicales.</strong>
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    Limitation de responsabilité
                  </h3>
                  <p>
                    L&apos;éditeur met tout en œuvre pour garantir la fiabilité des informations diffusées.
                    <br />
                    L&apos;utilisateur demeure seul responsable de l&apos;usage de l&apos;application, notamment en matière d&apos;allergies, d&apos;intolérances ou de contraintes médicales.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    Contact
                  </h3>
                  <p>
                    Pour toute demande ou réclamation :
                    <br />
                    📧 contact.foodlane@gmail.com
                  </p>
                </div>
              </div>
            )}

            {showLegalDoc === "cgu" && (
              <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    1. Objet
                  </h3>
                  <p className="space-y-1">
                    Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») ont pour objet de définir les modalités d&apos;accès et d&apos;utilisation de l&apos;application Foodlane, éditée par Amandine Fontaine – WayDia, micro-entreprise dont les informations légales figurent dans les Mentions légales.
                    <br />
                    <br />
                    En utilisant Foodlane, l&apos;utilisateur reconnaît avoir lu, compris et accepté sans réserve les présentes CGU.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    2. Description du service
                  </h3>
                  <p className="space-y-1">
                    Foodlane est une application d&apos;inspiration culinaire et d&apos;équilibre alimentaire, permettant notamment :
                    <br />
                    • Création et gestion d&apos;un compte utilisateur
                    <br />
                    • Suggestions d&apos;idées repas personnalisées
                    <br />
                    • Gestion des recettes favorites
                    <br />
                    • Adaptation du contenu selon les préférences alimentaires
                    <br />
                    <br />
                    <strong>Foodlane ne constitue ni un conseil médical, ni un dispositif médical, ni une prestation de santé personnalisée.</strong>
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    3. Création de compte et sécurité
                  </h3>
                  <p className="space-y-1">
                    L&apos;accès aux fonctionnalités de Foodlane nécessite la création d&apos;un compte utilisateur.
                    <br />
                    L&apos;utilisateur renseigne des informations exactes, complètes et mises à jour.
                    <br />
                    <br />
                    Il s&apos;engage à :
                    <br />
                    • préserver la confidentialité de ses identifiants
                    <br />
                    • signaler toute utilisation non autorisée à l&apos;éditeur
                    <br />
                    • ne pas créer de compte pour un tiers sans autorisation
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    4. Données personnelles
                  </h3>
                  <p className="space-y-1">
                    Foodlane collecte et traite certaines données personnelles, y compris des données liées à l&apos;alimentation.
                    <br />
                    <br />
                    Ce traitement est strictement encadré par :
                    <br />
                    • la Politique de Confidentialité
                    <br />
                    • le RGPD (Règlement (UE) 2016/679)
                    <br />
                    • les directives applicables en France
                    <br />
                    <br />
                    L&apos;utilisateur peut exercer ses droits via contact.foodlane@gmail.com.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    5. Utilisation responsable
                  </h3>
                  <p className="space-y-1">
                    L&apos;utilisateur s&apos;engage à :
                    <br />
                    • ne pas détourner l&apos;application de sa finalité
                    <br />
                    • ne pas porter atteinte au bon fonctionnement ou à la sécurité du service
                    <br />
                    • ne pas diffuser de contenus illicites, injurieux ou discriminatoires
                    <br />
                    <br />
                    L&apos;éditeur pourra suspendre ou supprimer un compte ne respectant pas les présentes CGU.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    6. Disponibilité du service
                  </h3>
                  <p className="space-y-1">
                    Foodlane est accessible en continu sous réserve de maintenance et contraintes techniques.
                    <br />
                    L&apos;éditeur ne peut garantir une disponibilité permanente du service.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    7. Propriété intellectuelle
                  </h3>
                  <p className="space-y-1">
                    Tous les éléments de l&apos;application sont protégés par le droit d&apos;auteur et la propriété intellectuelle.
                    <br />
                    Aucune reproduction non autorisée n&apos;est permise.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    8. Limitation de responsabilité
                  </h3>
                  <p className="space-y-1">
                    Foodlane fournit des suggestions alimentaires généralistes.
                    <br />
                    Il appartient à l&apos;utilisateur de vérifier la compatibilité des recommandations avec :
                    <br />
                    • son état de santé
                    <br />
                    • ses allergies et intolérances
                    <br />
                    • ses besoins personnels
                    <br />
                    <br />
                    L&apos;éditeur ne pourra être tenu responsable d&apos;une mauvaise utilisation de l&apos;application.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    9. Résiliation / Suppression du compte
                  </h3>
                  <p className="space-y-1">
                    L&apos;utilisateur peut supprimer son compte à tout moment depuis l&apos;application ou en envoyant une demande à :
                    <br />
                    📧 contact.foodlane@gmail.com
                    <br />
                    <br />
                    La suppression du compte entraîne l&apos;effacement des données conformément au RGPD.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    10. Modifications des CGU
                  </h3>
                  <p className="space-y-1">
                    WayDia se réserve le droit de modifier les présentes CGU pour tenir compte de l&apos;évolution du service.
                    <br />
                    La version applicable est celle disponible dans l&apos;application au moment de l&apos;utilisation.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    11. Droit applicable / litiges
                  </h3>
                  <p className="space-y-1">
                    Les présentes CGU sont régies par le droit français.
                    <br />
                    En cas de litige, les tribunaux compétents seront ceux du lieu du domicile de l&apos;éditeur.
                  </p>
                </div>
              </div>
            )}

            {showLegalDoc === "confidentialite" && (
              <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    1. Identification de l&apos;éditeur et du responsable du traitement
                  </h3>
                  <p className="space-y-1">
                    Foodlane est éditée par :
                    <br />
                    <strong>Amandine Fontaine – WayDia</strong>
                    <br />
                    Micro-entreprise — Diététicienne-Nutritionniste diplômée d&apos;État
                    <br />
                    SIRET : 988 976 163 00010
                    <br />
                    RPPS : 10111242268
                    <br />
                    Adresse : 55 rue Grignan, 13006 Marseille, France
                    <br />
                    Email : contact.foodlane@gmail.com
                    <br />
                    <br />
                    Amandine Fontaine est Responsable du traitement au sens du RGPD.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    2. Finalités du traitement
                  </h3>
                  <p className="space-y-1">
                    L&apos;application Foodlane a pour objectif d&apos;aider les utilisateurs à trouver des idées de repas personnalisées et équilibrées.
                    <br />
                    <br />
                    Les données sont collectées dans le but de :
                    <br />
                    • Créer et gérer les comptes utilisateurs
                    <br />
                    • Personnaliser les conseils culinaires et idées de repas
                    <br />
                    • Offrir une expérience adaptée aux objectifs et préférences alimentaires
                    <br />
                    • Proposer des fonctionnalités (favoris, navigation, historique…)
                    <br />
                    • Assurer le support utilisateur et la sécurité du service
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    3. Données collectées
                  </h3>
                  <p className="space-y-1">
                    <strong>Données personnelles :</strong>
                    <br />
                    • Nom
                    <br />
                    • Prénom
                    <br />
                    • Adresse e-mail
                    <br />
                    • Numéro de téléphone (optionnel)
                    <br />
                    <br />
                    <strong>Données liées à l&apos;alimentation :</strong>
                    <br />
                    • Recettes favorites
                    <br />
                    • Objectifs alimentaires personnels
                    <br />
                    • Régimes alimentaires / restrictions alimentaires
                    <br />
                    <br />
                    📌 Ces données peuvent constituer des données de santé (RGPD art. 9), traitées uniquement :
                    <br />
                    • sur la base du consentement explicite de l&apos;utilisateur
                    <br />
                    • pour une finalité strictement non médicale
                    <br />
                    • et uniquement pour la personnalisation du contenu
                    <br />
                    <br />
                    <strong>Aucune donnée n&apos;est exploitée à des fins médicales ou de diagnostic.</strong>
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    4. Base légale du traitement
                  </h3>
                  <p className="space-y-1">
                    • Consentement explicite (RGPD art. 6.1.a et 9.2.a)
                    <br />
                    → Lors de la création du compte et lors du paramétrage des préférences alimentaires
                    <br />
                    <br />
                    L&apos;utilisateur peut retirer son consentement à tout moment dans l&apos;application ou par e-mail.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    5. Destinataires des données
                  </h3>
                  <p className="space-y-1">
                    Les données sont destinées exclusivement à :
                    <br />
                    • l&apos;éditeur de Foodlane
                    <br />
                    • les prestataires techniques strictement nécessaires au fonctionnement du service
                    <br />
                    &nbsp;&nbsp;&nbsp;(serveur, authentification, sauvegarde…)
                    <br />
                    <br />
                    Aucun transfert commercial, aucune cession à des tiers non autorisés.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    6. Localisation des données
                  </h3>
                  <p className="space-y-1">
                    Les données utilisateurs sont hébergées dans :
                    <br />
                    • l&apos;Union Européenne
                    <br />
                    ou
                    <br />
                    • dans un pays reconnu comme assurant un niveau de protection équivalent (décision d&apos;adéquation)
                    <br />
                    <br />
                    Les prestataires techniques seront listés dans la présente politique en cas d&apos;évolution.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    7. Durée de conservation
                  </h3>
                  <p className="space-y-1">
                    • Données liées au compte : jusqu&apos;à la suppression du compte
                    <br />
                    • Données de préférences alimentaires : maximum 3 ans d&apos;inactivité, puis suppression automatique
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    8. Sécurité
                  </h3>
                  <p className="space-y-1">
                    L&apos;éditeur met en œuvre des mesures techniques et organisationnelles pour protéger les données :
                    <br />
                    • Authentification sécurisée
                    <br />
                    • Chiffrement lors des communications
                    <br />
                    • Accès restreint aux seules personnes habilitées
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    9. Droits des utilisateurs
                  </h3>
                  <p className="space-y-1">
                    L&apos;utilisateur peut exercer ses droits RGPD à tout moment :
                    <br />
                    • Accès
                    <br />
                    • Rectification
                    <br />
                    • Suppression
                    <br />
                    • Portabilité
                    <br />
                    • Opposition
                    <br />
                    • Retrait du consentement
                    <br />
                    <br />
                    via l&apos;adresse suivante :
                    <br />
                    contact.foodlane@gmail.com
                    <br />
                    <br />
                    En cas de réclamation, il peut contacter :
                    <br />
                    👉 CNIL — www.cnil.fr
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    10. Sous-traitants et transferts hors UE
                  </h3>
                  <p className="space-y-1">
                    En cas d&apos;intégration de prestataires (hébergement, analytics…),
                    <br />
                    la liste sera mise à jour avant mise en production.
                    <br />
                    <br />
                    Aucun transfert hors UE non justifié.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    11. Modification de la politique
                  </h3>
                  <p className="space-y-1">
                    Cette politique peut être mise à jour en fonction de l&apos;évolution de Foodlane.
                    <br />
                    La version applicable est celle disponible dans l&apos;application.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    12. Contact
                  </h3>
                  <p className="space-y-1">
                    Pour toute question ou demande liée aux données personnelles :
                    <br />
                    📧 contact.foodlane@gmail.com
                  </p>
                </div>
              </div>
            )}

            {showLegalDoc === "cgv" && (
              <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    1. Objet
                  </h3>
                  <p className="space-y-1">
                    Les présentes Conditions Générales de Vente (CGV) définissent les modalités d&apos;achat des services numériques proposés via l&apos;application Foodlane, éditée par Amandine Fontaine – WayDia.
                    <br />
                    <br />
                    Elles s&apos;appliquent à tout abonnement ou achat intégré (In-App Purchase).
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    2. Services proposés
                  </h3>
                  <p className="space-y-1">
                    Foodlane peut proposer :
                    <br />
                    • Abonnements mensuels (accès à du contenu et fonctionnalités premium)
                    <br />
                    • Achats ponctuels d&apos;éléments numériques (recettes, packs, fonctionnalités…)
                    <br />
                    <br />
                    Les offres disponibles, leurs tarifs et contenus sont présentés dans l&apos;application.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    3. Commande
                  </h3>
                  <p className="space-y-1">
                    Toute commande effectuée via l&apos;App Store ou Google Play vaut acceptation des CGV et des CGU.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    4. Prix et facturation
                  </h3>
                  <p className="space-y-1">
                    Les prix sont indiqués en euros et toutes taxes comprises.
                    <br />
                    Le paiement est géré directement par les plateformes d&apos;achat :
                    <br />
                    • App Store (Apple)
                    <br />
                    • Google Play (Google)
                    <br />
                    <br />
                    Foodlane ne collecte pas les données bancaires des utilisateurs.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    5. Abonnement — Renouvellement automatique
                  </h3>
                  <p className="space-y-1">
                    Les abonnements sont conclus pour une durée mensuelle, renouvelable tacitement.
                    <br />
                    <br />
                    L&apos;utilisateur peut modifier ou résilier son abonnement à tout moment dans :
                    <br />
                    → Ses paramètres de compte App Store / Google Play
                    <br />
                    → Et avant le prochain renouvellement pour éviter la facturation du mois suivant
                    <br />
                    <br />
                    Aucune résiliation ne peut être effectuée directement auprès de Foodlane.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    6. Droit de rétractation
                  </h3>
                  <p className="space-y-1">
                    Conformément à la loi, le droit de rétractation ne s&apos;applique plus dès que le téléchargement du contenu numérique a commencé, avec accord préalable de l&apos;utilisateur.
                    <br />
                    <br />
                    Les achats effectués via l&apos;App Store / Google Play ne donnent pas lieu à remboursement hors conditions prévues par ces plateformes.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    7. Disponibilité et conformité
                  </h3>
                  <p className="space-y-1">
                    Foodlane met tout en œuvre pour assurer l&apos;accessibilité et la qualité des services premium.
                    <br />
                    Toutefois, des interruptions peuvent survenir pour maintenance ou mise à jour.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    8. Responsabilité
                  </h3>
                  <p className="space-y-1">
                    Foodlane ne peut être tenue responsable en cas :
                    <br />
                    • d&apos;erreurs, retards ou indisponibilités liées aux plateformes d&apos;achat
                    <br />
                    • d&apos;usage inapproprié des services
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    9. Modification des offres
                  </h3>
                  <p className="space-y-1">
                    Les offres et tarifs peuvent être modifiés à tout moment, avec un préavis raisonnable.
                    <br />
                    Les modifications s&apos;appliquent à la prochaine période d&apos;abonnement.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-2">
                    10. Litiges
                  </h3>
                  <p className="space-y-1">
                    Les CGV sont régies par le droit français.
                    <br />
                    En cas de litige, les tribunaux du siège de l&apos;éditeur seront compétents.
                  </p>
                </div>
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
            <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
              <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">Notifications</h2>
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
                        ? "bg-[#D44A4A]"
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
                        ? "bg-[#D44A4A]"
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
                        ? "bg-[#D44A4A]"
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

            <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
              <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">
                Publicités
              </h2>
              <div className="space-y-3 text-sm">
                <div className="rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2">
                  <p className="text-xs text-[var(--beige-text-muted)]">
                    Version gratuite avec publicités
                  </p>
                </div>
                {preferences.abonnementType === "free" && (
                  <button
                    onClick={() => router.push("/premium")}
                    className="w-full px-4 py-2 rounded-xl bg-[#D44A4A] hover:bg-[#7A5F3F] text-white text-xs font-semibold transition-colors"
                  >
                    Passer à Premium sans publicités
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
              <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">
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
            <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
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
                      theme === "dark" ? "bg-[#D44A4A]" : "bg-[#D4C4B8]"
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
                    className="rounded-lg bg-[var(--background)] border border-[var(--beige-border)] px-3 py-1 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
              <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">
                Infos légales
              </h2>
              <div className="space-y-2 text-sm">
                <button
                  onClick={() =>
                    setShowLegalDoc(showLegalDoc === "mentions" ? null : "mentions")
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#D44A4A] transition-colors flex items-center justify-between"
                >
                  <span>Mentions légales</span>
                  <span>{showLegalDoc === "mentions" ? "−" : "+"}</span>
                </button>
                <button
                  onClick={() =>
                    setShowLegalDoc(showLegalDoc === "cgu" ? null : "cgu")
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#D44A4A] transition-colors flex items-center justify-between"
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
                  className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#D44A4A] transition-colors flex items-center justify-between"
                >
                  <span>Politique de confidentialité</span>
                  <span>{showLegalDoc === "confidentialite" ? "−" : "+"}</span>
                </button>
                <button
                  onClick={() =>
                    setShowLegalDoc(showLegalDoc === "cgv" ? null : "cgv")
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#D44A4A] transition-colors flex items-center justify-between"
                >
                  <span>Conditions de vente (CGV)</span>
                  <span>{showLegalDoc === "cgv" ? "−" : "+"}</span>
                </button>
                <button
                  onClick={() =>
                    setShowLegalDoc(showLegalDoc === "cookies" ? null : "cookies")
                  }
                  className="w-full text-left px-3 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] hover:border-[#D44A4A] transition-colors flex items-center justify-between"
                >
                  <span>Politique cookies</span>
                  <span>{showLegalDoc === "cookies" ? "−" : "+"}</span>
                </button>
              </div>

              {/* Contenu des documents légaux */}
              {showLegalDoc === "mentions" && (
                <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      Éditeur de l&apos;application
                    </h3>
                    <p className="space-y-1">
                      L&apos;application Foodlane est éditée par :
                      <br />
                      <strong>Amandine Fontaine – WayDia</strong>
                      <br />
                      Micro-entreprise – Prestations de services
                      <br />
                      Diététicienne-Nutritionniste diplômée d&apos;État
                      <br />
                      RPPS : 10111242268
                      <br />
                      SIRET : 988 976 163 00010
                      <br />
                      Code APE : 8690F — Activités de santé humaine non classées ailleurs
                      <br />
                      Siège social : 55 rue Grignan, 13006 Marseille, France
                      <br />
                      Email : contact.foodlane@gmail.com
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      Responsable de la publication
                    </h3>
                    <p>Amandine Fontaine</p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      Hébergement et infrastructure
                    </h3>
                    <p className="space-y-1">
                      L&apos;application Foodlane est distribuée via :
                      <br />
                      • Apple App Store — Apple Inc.
                      <br />
                      • Google Play Store — Google LLC
                      <br />
                      <br />
                      Les données utilisateurs sont traitées dans le respect du RGPD.
                      <br />
                      Les serveurs et infrastructures utilisées pour le stockage des données sont situés au sein de l&apos;Union Européenne ou dans des pays reconnus comme assurant un niveau de protection adéquat.
                      <br />
                      Les prestataires techniques (hébergeurs, services d&apos;authentification, etc.) seront mentionnés dans la Politique de confidentialité.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      Propriété intellectuelle
                    </h3>
                    <p>
                      L&apos;ensemble des contenus, éléments graphiques, textes, fonctionnalités, logos et marques présents dans l&apos;application Foodlane sont la propriété exclusive de WayDia / Amandine Fontaine, sauf mentions contraires.
                      <br />
                      Toute reproduction totale ou partielle, modification ou utilisation non autorisée est strictement interdite au titre de la propriété intellectuelle.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      Objet du service
                    </h3>
                    <p className="space-y-1">
                      Foodlane est une application d&apos;aide à l&apos;organisation et l&apos;inspiration alimentaires :
                      <br />
                      • Suggestions de recettes
                      <br />
                      • Personnalisation selon les goûts, objectifs et préférences alimentaires
                      <br />
                      • Gestion de favoris
                      <br />
                      <br />
                      <strong>Foodlane ne constitue pas un dispositif médical et ne dispense pas de soins, diagnostics ou prescriptions médicales.</strong>
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      Limitation de responsabilité
                    </h3>
                    <p>
                      L&apos;éditeur met tout en œuvre pour garantir la fiabilité des informations diffusées.
                      <br />
                      L&apos;utilisateur demeure seul responsable de l&apos;usage de l&apos;application, notamment en matière d&apos;allergies, d&apos;intolérances ou de contraintes médicales.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      Contact
                    </h3>
                    <p>
                      Pour toute demande ou réclamation :
                      <br />
                      📧 contact.foodlane@gmail.com
                    </p>
                  </div>
                </div>
              )}

              {showLegalDoc === "cgu" && (
                <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      1. Objet
                    </h3>
                    <p className="space-y-1">
                      Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») ont pour objet de définir les modalités d&apos;accès et d&apos;utilisation de l&apos;application Foodlane, éditée par Amandine Fontaine – WayDia, micro-entreprise dont les informations légales figurent dans les Mentions légales.
                      <br />
                      <br />
                      En utilisant Foodlane, l&apos;utilisateur reconnaît avoir lu, compris et accepté sans réserve les présentes CGU.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      2. Description du service
                    </h3>
                    <p className="space-y-1">
                      Foodlane est une application d&apos;inspiration culinaire et d&apos;équilibre alimentaire, permettant notamment :
                      <br />
                      • Création et gestion d&apos;un compte utilisateur
                      <br />
                      • Suggestions d&apos;idées repas personnalisées
                      <br />
                      • Gestion des recettes favorites
                      <br />
                      • Adaptation du contenu selon les préférences alimentaires
                      <br />
                      <br />
                      <strong>Foodlane ne constitue ni un conseil médical, ni un dispositif médical, ni une prestation de santé personnalisée.</strong>
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      3. Création de compte et sécurité
                    </h3>
                    <p className="space-y-1">
                      L&apos;accès aux fonctionnalités de Foodlane nécessite la création d&apos;un compte utilisateur.
                      <br />
                      L&apos;utilisateur renseigne des informations exactes, complètes et mises à jour.
                      <br />
                      <br />
                      Il s&apos;engage à :
                      <br />
                      • préserver la confidentialité de ses identifiants
                      <br />
                      • signaler toute utilisation non autorisée à l&apos;éditeur
                      <br />
                      • ne pas créer de compte pour un tiers sans autorisation
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      4. Données personnelles
                    </h3>
                    <p className="space-y-1">
                      Foodlane collecte et traite certaines données personnelles, y compris des données liées à l&apos;alimentation.
                      <br />
                      <br />
                      Ce traitement est strictement encadré par :
                      <br />
                      • la Politique de Confidentialité
                      <br />
                      • le RGPD (Règlement (UE) 2016/679)
                      <br />
                      • les directives applicables en France
                      <br />
                      <br />
                      L&apos;utilisateur peut exercer ses droits via contact.foodlane@gmail.com.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      5. Utilisation responsable
                    </h3>
                    <p className="space-y-1">
                      L&apos;utilisateur s&apos;engage à :
                      <br />
                      • ne pas détourner l&apos;application de sa finalité
                      <br />
                      • ne pas porter atteinte au bon fonctionnement ou à la sécurité du service
                      <br />
                      • ne pas diffuser de contenus illicites, injurieux ou discriminatoires
                      <br />
                      <br />
                      L&apos;éditeur pourra suspendre ou supprimer un compte ne respectant pas les présentes CGU.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      6. Disponibilité du service
                    </h3>
                    <p className="space-y-1">
                      Foodlane est accessible en continu sous réserve de maintenance et contraintes techniques.
                      <br />
                      L&apos;éditeur ne peut garantir une disponibilité permanente du service.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      7. Propriété intellectuelle
                    </h3>
                    <p className="space-y-1">
                      Tous les éléments de l&apos;application sont protégés par le droit d&apos;auteur et la propriété intellectuelle.
                      <br />
                      Aucune reproduction non autorisée n&apos;est permise.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      8. Limitation de responsabilité
                    </h3>
                    <p className="space-y-1">
                      Foodlane fournit des suggestions alimentaires généralistes.
                      <br />
                      Il appartient à l&apos;utilisateur de vérifier la compatibilité des recommandations avec :
                      <br />
                      • son état de santé
                      <br />
                      • ses allergies et intolérances
                      <br />
                      • ses besoins personnels
                      <br />
                      <br />
                      L&apos;éditeur ne pourra être tenu responsable d&apos;une mauvaise utilisation de l&apos;application.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      9. Résiliation / Suppression du compte
                    </h3>
                    <p className="space-y-1">
                      L&apos;utilisateur peut supprimer son compte à tout moment depuis l&apos;application ou en envoyant une demande à :
                      <br />
                      📧 contact.foodlane@gmail.com
                      <br />
                      <br />
                      La suppression du compte entraîne l&apos;effacement des données conformément au RGPD.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      10. Modifications des CGU
                    </h3>
                    <p className="space-y-1">
                      WayDia se réserve le droit de modifier les présentes CGU pour tenir compte de l&apos;évolution du service.
                      <br />
                      La version applicable est celle disponible dans l&apos;application au moment de l&apos;utilisation.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      11. Droit applicable / litiges
                    </h3>
                    <p className="space-y-1">
                      Les présentes CGU sont régies par le droit français.
                      <br />
                      En cas de litige, les tribunaux compétents seront ceux du lieu du domicile de l&apos;éditeur.
                    </p>
                  </div>
                </div>
              )}

              {showLegalDoc === "confidentialite" && (
                <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      1. Identification de l&apos;éditeur et du responsable du traitement
                    </h3>
                    <p className="space-y-1">
                      Foodlane est éditée par :
                      <br />
                      <strong>Amandine Fontaine – WayDia</strong>
                      <br />
                      Micro-entreprise — Diététicienne-Nutritionniste diplômée d&apos;État
                      <br />
                      SIRET : 988 976 163 00010
                      <br />
                      RPPS : 10111242268
                      <br />
                      Adresse : 55 rue Grignan, 13006 Marseille, France
                      <br />
                      Email : contact.foodlane@gmail.com
                      <br />
                      <br />
                      Amandine Fontaine est Responsable du traitement au sens du RGPD.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      2. Finalités du traitement
                    </h3>
                    <p className="space-y-1">
                      L&apos;application Foodlane a pour objectif d&apos;aider les utilisateurs à trouver des idées de repas personnalisées et équilibrées.
                      <br />
                      <br />
                      Les données sont collectées dans le but de :
                      <br />
                      • Créer et gérer les comptes utilisateurs
                      <br />
                      • Personnaliser les conseils culinaires et idées de repas
                      <br />
                      • Offrir une expérience adaptée aux objectifs et préférences alimentaires
                      <br />
                      • Proposer des fonctionnalités (favoris, navigation, historique…)
                      <br />
                      • Assurer le support utilisateur et la sécurité du service
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      3. Données collectées
                    </h3>
                    <p className="space-y-1">
                      <strong>Données personnelles :</strong>
                      <br />
                      • Nom
                      <br />
                      • Prénom
                      <br />
                      • Adresse e-mail
                      <br />
                      • Numéro de téléphone (optionnel)
                      <br />
                      <br />
                      <strong>Données liées à l&apos;alimentation :</strong>
                      <br />
                      • Recettes favorites
                      <br />
                      • Objectifs alimentaires personnels
                      <br />
                      • Régimes alimentaires / restrictions alimentaires
                      <br />
                      <br />
                      📌 Ces données peuvent constituer des données de santé (RGPD art. 9), traitées uniquement :
                      <br />
                      • sur la base du consentement explicite de l&apos;utilisateur
                      <br />
                      • pour une finalité strictement non médicale
                      <br />
                      • et uniquement pour la personnalisation du contenu
                      <br />
                      <br />
                      <strong>Aucune donnée n&apos;est exploitée à des fins médicales ou de diagnostic.</strong>
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      4. Base légale du traitement
                    </h3>
                    <p className="space-y-1">
                      • Consentement explicite (RGPD art. 6.1.a et 9.2.a)
                      <br />
                      → Lors de la création du compte et lors du paramétrage des préférences alimentaires
                      <br />
                      <br />
                      L&apos;utilisateur peut retirer son consentement à tout moment dans l&apos;application ou par e-mail.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      5. Destinataires des données
                    </h3>
                    <p className="space-y-1">
                      Les données sont destinées exclusivement à :
                      <br />
                      • l&apos;éditeur de Foodlane
                      <br />
                      • les prestataires techniques strictement nécessaires au fonctionnement du service
                      <br />
                      &nbsp;&nbsp;&nbsp;(serveur, authentification, sauvegarde…)
                      <br />
                      <br />
                      Aucun transfert commercial, aucune cession à des tiers non autorisés.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      6. Localisation des données
                    </h3>
                    <p className="space-y-1">
                      Les données utilisateurs sont hébergées dans :
                      <br />
                      • l&apos;Union Européenne
                      <br />
                      ou
                      <br />
                      • dans un pays reconnu comme assurant un niveau de protection équivalent (décision d&apos;adéquation)
                      <br />
                      <br />
                      Les prestataires techniques seront listés dans la présente politique en cas d&apos;évolution.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      7. Durée de conservation
                    </h3>
                    <p className="space-y-1">
                      • Données liées au compte : jusqu&apos;à la suppression du compte
                      <br />
                      • Données de préférences alimentaires : maximum 3 ans d&apos;inactivité, puis suppression automatique
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      8. Sécurité
                    </h3>
                    <p className="space-y-1">
                      L&apos;éditeur met en œuvre des mesures techniques et organisationnelles pour protéger les données :
                      <br />
                      • Authentification sécurisée
                      <br />
                      • Chiffrement lors des communications
                      <br />
                      • Accès restreint aux seules personnes habilitées
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      9. Droits des utilisateurs
                    </h3>
                    <p className="space-y-1">
                      L&apos;utilisateur peut exercer ses droits RGPD à tout moment :
                      <br />
                      • Accès
                      <br />
                      • Rectification
                      <br />
                      • Suppression
                      <br />
                      • Portabilité
                      <br />
                      • Opposition
                      <br />
                      • Retrait du consentement
                      <br />
                      <br />
                      via l&apos;adresse suivante :
                      <br />
                      contact.foodlane@gmail.com
                      <br />
                      <br />
                      En cas de réclamation, il peut contacter :
                      <br />
                      👉 CNIL — www.cnil.fr
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      10. Sous-traitants et transferts hors UE
                    </h3>
                    <p className="space-y-1">
                      En cas d&apos;intégration de prestataires (hébergement, analytics…),
                      <br />
                      la liste sera mise à jour avant mise en production.
                      <br />
                      <br />
                      Aucun transfert hors UE non justifié.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      11. Modification de la politique
                    </h3>
                    <p className="space-y-1">
                      Cette politique peut être mise à jour en fonction de l&apos;évolution de Foodlane.
                      <br />
                      La version applicable est celle disponible dans l&apos;application.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      12. Contact
                    </h3>
                    <p className="space-y-1">
                      Pour toute question ou demande liée aux données personnelles :
                      <br />
                      📧 contact.foodlane@gmail.com
                    </p>
                  </div>
                </div>
              )}

              {showLegalDoc === "cgv" && (
                <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      1. Objet
                    </h3>
                    <p className="space-y-1">
                      Les présentes Conditions Générales de Vente (CGV) définissent les modalités d&apos;achat des services numériques proposés via l&apos;application Foodlane, éditée par Amandine Fontaine – WayDia.
                      <br />
                      <br />
                      Elles s&apos;appliquent à tout abonnement ou achat intégré (In-App Purchase).
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      2. Services proposés
                    </h3>
                    <p className="space-y-1">
                      Foodlane peut proposer :
                      <br />
                      • Abonnements mensuels (accès à du contenu et fonctionnalités premium)
                      <br />
                      • Achats ponctuels d&apos;éléments numériques (recettes, packs, fonctionnalités…)
                      <br />
                      <br />
                      Les offres disponibles, leurs tarifs et contenus sont présentés dans l&apos;application.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      3. Commande
                    </h3>
                    <p className="space-y-1">
                      Toute commande effectuée via l&apos;App Store ou Google Play vaut acceptation des CGV et des CGU.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      4. Prix et facturation
                    </h3>
                    <p className="space-y-1">
                      Les prix sont indiqués en euros et toutes taxes comprises.
                      <br />
                      Le paiement est géré directement par les plateformes d&apos;achat :
                      <br />
                      • App Store (Apple)
                      <br />
                      • Google Play (Google)
                      <br />
                      <br />
                      Foodlane ne collecte pas les données bancaires des utilisateurs.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      5. Abonnement — Renouvellement automatique
                    </h3>
                    <p className="space-y-1">
                      Les abonnements sont conclus pour une durée mensuelle, renouvelable tacitement.
                      <br />
                      <br />
                      L&apos;utilisateur peut modifier ou résilier son abonnement à tout moment dans :
                      <br />
                      → Ses paramètres de compte App Store / Google Play
                      <br />
                      → Et avant le prochain renouvellement pour éviter la facturation du mois suivant
                      <br />
                      <br />
                      Aucune résiliation ne peut être effectuée directement auprès de Foodlane.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      6. Droit de rétractation
                    </h3>
                    <p className="space-y-1">
                      Conformément à la loi, le droit de rétractation ne s&apos;applique plus dès que le téléchargement du contenu numérique a commencé, avec accord préalable de l&apos;utilisateur.
                      <br />
                      <br />
                      Les achats effectués via l&apos;App Store / Google Play ne donnent pas lieu à remboursement hors conditions prévues par ces plateformes.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      7. Disponibilité et conformité
                    </h3>
                    <p className="space-y-1">
                      Foodlane met tout en œuvre pour assurer l&apos;accessibilité et la qualité des services premium.
                      <br />
                      Toutefois, des interruptions peuvent survenir pour maintenance ou mise à jour.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      8. Responsabilité
                    </h3>
                    <p className="space-y-1">
                      Foodlane ne peut être tenue responsable en cas :
                      <br />
                      • d&apos;erreurs, retards ou indisponibilités liées aux plateformes d&apos;achat
                      <br />
                      • d&apos;usage inapproprié des services
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      9. Modification des offres
                    </h3>
                    <p className="space-y-1">
                      Les offres et tarifs peuvent être modifiés à tout moment, avec un préavis raisonnable.
                      <br />
                      Les modifications s&apos;appliquent à la prochaine période d&apos;abonnement.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      10. Litiges
                    </h3>
                    <p className="space-y-1">
                      Les CGV sont régies par le droit français.
                      <br />
                      En cas de litige, les tribunaux du siège de l&apos;éditeur seront compétents.
                    </p>
                  </div>
                </div>
              )}

              {showLegalDoc === "cookies" && (
                <div className="mt-4 pt-4 border-t border-[var(--beige-border)] space-y-4 text-xs text-[var(--beige-text-light)] max-h-96 overflow-y-auto">
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-2">
                      POLITIQUE DE COOKIES — Foodlane
                    </h3>
                    <p className="space-y-1">
                      Foodlane n&apos;utilise pas de cookies à l&apos;intérieur de l&apos;application mobile,
                      mais peut en utiliser sur son futur site web pour :
                      <br />
                      <br />
                      • Mesure d&apos;audience
                      <br />
                      • Fonctionnement technique du site
                      <br />
                      • Amélioration de l&apos;expérience utilisateur
                      <br />
                      <br />
                      Aucun cookie ne sera déposé sans le consentement explicite de l&apos;utilisateur,
                      conformément à la directive ePrivacy et aux recommandations de la CNIL.
                      <br />
                      <br />
                      L&apos;utilisateur pourra accepter, refuser ou personnaliser ses choix via une bannière de gestion des cookies.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === "foyer" && (
        <section className="px-4 py-6 space-y-4">
          {/* Foyer */}
          <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">
              Foyer
            </h2>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                Nombre de personnes dans le foyer *
              </label>
              <input
                type="number"
                min="1"
                value={preferences.nombrePersonnes}
                onChange={(e) =>
                  updatePreference("nombrePersonnes", parseInt(e.target.value) || 1)
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--beige-border)] bg-white text-[var(--foreground)]"
              />
            </div>
          </div>

          {/* Alimentation particulière */}
          <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">
              Alimentation particulière
            </h2>
            <div className="space-y-2">
              {ALL_DIETARY_PROFILES.map((profile) => {
                const isAvailable = isDietaryProfileAvailable(
                  profile,
                  preferences.abonnementType
                );
                const isSelected = (
                  preferences.regimesParticuliers as DietaryProfile[]
                ).includes(profile);

                return (
                  <label
                    key={profile}
                    className={`flex items-center gap-2 p-3 rounded-lg border ${
                      isSelected
                        ? "border-[var(--beige-accent)] bg-[var(--beige-rose-light)]"
                        : "border-[var(--beige-border)] bg-white"
                    } ${
                      !isAvailable
                        ? "opacity-60 cursor-not-allowed"
                        : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        if (!isAvailable) {
                          alert(
                            "👑 Ce régime est réservé aux utilisateurs premium. Passe à premium pour y accéder."
                          );
                          router.push("/premium");
                          return;
                        }
                        toggleArrayPreference("regimesParticuliers", profile);
                      }}
                      disabled={!isAvailable}
                      className="w-4 h-4 text-[var(--beige-accent)] rounded disabled:opacity-50"
                    />
                    <span className="text-lg">
                      {DIETARY_PROFILE_ICONS[profile]}
                    </span>
                    <span className={`flex-1 font-medium ${
                      !isAvailable ? "text-[#726566]" : "text-[#2A2523]"
                    }`}>
                      {profile}
                    </span>
                    {!isAvailable && (
                      <span className="flex items-center gap-1 text-xs text-[#D44A4A] font-semibold">
                        <span>👑</span>
                        <span>Réservé aux premium</span>
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Allergies/Aversions */}
          <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">
              Allergies / Aversions alimentaires
            </h2>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={allergiesInput}
                onChange={(e) => setAllergiesInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = allergiesInput.trim();
                    if (trimmed && !preferences.aversionsAlimentaires.includes(trimmed)) {
                      toggleArrayPreference("aversionsAlimentaires", trimmed);
                      setAllergiesInput("");
                    }
                  }
                }}
                placeholder="Ex: arachides, fruits de mer..."
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--beige-border)] bg-white text-[var(--foreground)]"
              />
              <button
                onClick={() => {
                  const trimmed = allergiesInput.trim();
                  if (trimmed && !preferences.aversionsAlimentaires.includes(trimmed)) {
                    toggleArrayPreference("aversionsAlimentaires", trimmed);
                    setAllergiesInput("");
                  }
                }}
                className="px-4 py-2 bg-[var(--beige-accent)] text-white rounded-lg hover:bg-[var(--beige-accent-hover)] transition-colors"
              >
                Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {preferences.aversionsAlimentaires.map((allergy) => (
                <span
                  key={allergy}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-[var(--beige-rose-light)] text-[var(--foreground)] rounded-full text-sm"
                >
                  {allergy}
                  <button
                    onClick={() => toggleArrayPreference("aversionsAlimentaires", allergy)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Équipements disponibles */}
          <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">
              Équipements disponibles
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_EQUIPMENTS.map((equipment) => {
                const isSelected = preferences.equipements.includes(equipment);
                return (
                  <label
                    key={equipment}
                    className={`flex items-center gap-2 p-2 rounded-lg border ${
                      isSelected
                        ? "border-[var(--beige-accent)] bg-[var(--beige-rose-light)]"
                        : "border-[var(--beige-border)] bg-white"
                    } cursor-pointer`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        toggleArrayPreference("equipements", equipment);
                      }}
                      className="w-4 h-4 text-[var(--beige-accent)] rounded"
                    />
                    <span className="text-sm text-[#2A2523] font-medium">
                      {equipment}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Objectifs d'utilisation */}
          <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">
              Objectifs d'utilisation de l'app
            </h2>
            <div className="space-y-2">
              {Object.values(NUTRITION_GOALS).map((goal) => {
                const isSelected = (
                  preferences.objectifsUsage as NutritionGoal[]
                ).includes(goal.id);

                return (
                  <label
                    key={goal.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border ${
                      isSelected
                        ? "border-[var(--beige-accent)] bg-[var(--beige-rose-light)]"
                        : "border-[var(--beige-border)] bg-white"
                    } cursor-pointer`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        toggleArrayPreference("objectifsUsage", goal.id);
                      }}
                      className="w-4 h-4 text-[var(--beige-accent)] rounded"
                    />
                    <span className="text-lg">{goal.icon}</span>
                    <span className="flex-1 text-[#2A2523] font-medium">
                      {goal.title}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {activeTab === "abonnement" && (
        <section className="px-4 py-6 space-y-4">
          <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
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
                    {preferences.abonnementType === "premium" ? "Premium" : "Gratuit"}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      preferences.abonnementType === "premium"
                        ? "bg-[#D44A4A] text-white"
                        : "bg-[var(--beige-card-alt)] text-[var(--beige-text-muted)]"
                    }`}
                  >
                    {preferences.abonnementType === "premium" ? "Premium" : "Gratuit"}
                  </span>
                </div>
              </div>

              {preferences.abonnementType === "free" && (
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
                    className="w-full mt-3 px-4 py-3 rounded-xl bg-[#D44A4A] hover:bg-[#7A5F3F] text-white text-sm font-semibold transition-colors"
                  >
                    Passer à Premium
                  </button>
                </>
              )}

              {preferences.abonnementType === "premium" && (
                <div className="pt-2 border-t border-[var(--beige-border)]">
                  <p className="text-xs text-[var(--beige-text-muted)] mb-2">
                    Gestion de l&apos;abonnement
                  </p>
                  <button
                    onClick={() => {
                      alert("Historique de facturation / lien vers le store (à venir)");
                    }}
                    className="w-full px-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#D44A4A] transition-colors"
                  >
                    Historique de facturation / Voir sur le store
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === "contact" && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
            Contact & Support
          </h2>

          {/* FAQ */}
          <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
            <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">
              Questions fréquentes (FAQ)
            </h2>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item, index) => (
                <details
                  key={index}
                  className="border-b border-[var(--beige-border)] pb-2 last:border-0"
                >
                  <summary className="text-sm font-medium text-[var(--foreground)] cursor-pointer list-none flex items-center justify-between">
                    <span>{item.question}</span>
                    <span className="text-[var(--beige-text-muted)]">+</span>
                  </summary>
                  <p className="text-xs text-[var(--beige-text-light)] mt-2 pl-2">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>

          {/* Formulaire de contact */}
          {!showContactForm ? (
            <div className="space-y-3">
              {/* Formulaire de retour utilisateur */}
              <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4 text-center">
                <p className="text-sm text-[var(--foreground)] mb-2 font-semibold">
                  💬 Retour utilisateur
                </p>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                  Aide-nous à améliorer l'application en partageant ton expérience
                </p>
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLScGB2x-Bkk_GObFgDEeiSdhIle7od7XL1r8R86fV0m_sXqswQ/viewform?usp=dialog"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full px-4 py-2 rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white text-xs font-semibold transition-colors"
                >
                  Donner mon avis
                </a>
              </div>
              
              {/* Formulaire de contact classique */}
              <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4 text-center">
                <p className="text-sm text-[var(--foreground)] mb-3">
                  Tu n&apos;as pas trouvé de réponse dans la FAQ ?
                </p>
                <button
                  onClick={() => setShowContactForm(true)}
                  className="w-full px-4 py-2 rounded-xl bg-[#D44A4A] hover:bg-[#C03A3A] text-white text-xs font-semibold transition-colors"
                >
                  Nous contacter
                </button>
              </div>
            </div>
          ) : (
                <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
                  <h2 className="text-base font-semibold mb-3 text-[var(--foreground)]">Nous contacter</h2>
                  {contactSubmitted ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-[#D44A4A] font-semibold">
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
                            className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
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
                            className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
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
                          className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
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
                          className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
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
                          className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A]"
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
                          className="w-full rounded-xl bg-[var(--background)] border border-[var(--beige-border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#D44A4A] resize-none"
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
                          className="flex-1 px-4 py-2 rounded-xl bg-[var(--beige-card)] border border-[var(--beige-border)] text-[var(--foreground)] text-xs font-semibold hover:border-[#D44A4A] transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="flex-1 px-4 py-2 rounded-xl bg-[#D44A4A] hover:bg-[#7A5F3F] text-white text-xs font-semibold transition-colors"
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
