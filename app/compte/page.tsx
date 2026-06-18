"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  type UserPreferences,
  savePreferences,
  loadPreferences,
  isLoggedIn,
  logout,
} from "../src/lib/userPreferences";
import { onSubscriptionStateChanged } from "../src/lib/subscriptionSyncEvents";
import { supabase, isSupabaseConfigured } from "../src/lib/supabaseClient";
import { useSupabaseSession } from "../hooks/useSupabaseSession";
import { usePremium } from "../contexts/PremiumContext";
import { getSubscriptionAccountMessage } from "../src/lib/subscriptionDisplay";
import { refgrowTrackSignup } from "../src/lib/refgrowClient";
import ErrorMessage from "../components/ErrorMessage";
import { CGUContent } from "../components/LegalDocuments";
import { MobileAppScreen } from "../components/app/MobileAppScreen";

export default function AccountPage() {
  const router = useRouter();
  const { user } = useSupabaseSession();
  const { isPremium, refreshProfile, profile } = usePremium();
  const [isEditing, setIsEditing] = useState(false);
  const [isNewAccount, setIsNewAccount] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [cancelSubscriptionLoading, setCancelSubscriptionLoading] = useState(false);
  const portalReturnHandledRef = useRef(false);
  const [formData, setFormData] = useState<UserPreferences>(() => {
    if (typeof window !== "undefined") {
      return loadPreferences();
    }
    // Valeur par défaut pour le rendu serveur
    return {
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
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cguAccepted, setCguAccepted] = useState(false);
  const [showCguModal, setShowCguModal] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      setIsNewAccount(true);
      setIsEditing(true);
      setCguAccepted(false);
    } else {
      const preferences = loadPreferences();
      setFormData(preferences);
      setCguAccepted(preferences.cguAccepted || false);
      setIsEditing(false);
    }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    return onSubscriptionStateChanged(() => {
      const p = loadPreferences();
      setFormData((prev) => ({
        ...prev,
        abonnementType: p.abonnementType,
        premiumStartDate: p.premiumStartDate,
        premiumExpirationDate: p.premiumExpirationDate,
      }));
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("stripe_portal_return") !== "1") {
      portalReturnHandledRef.current = false;
      return;
    }
    if (portalReturnHandledRef.current) return;
    portalReturnHandledRef.current = true;
    void (async () => {
      await refreshProfile();
      const p = loadPreferences();
      setFormData((prev) => ({
        ...prev,
        abonnementType: p.abonnementType,
        premiumStartDate: p.premiumStartDate,
        premiumExpirationDate: p.premiumExpirationDate,
      }));
    })();
    window.history.replaceState({}, "", window.location.pathname);
  }, [refreshProfile]);

  const handleInputChange = (
    field: keyof UserPreferences,
    value: any
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Effacer l'erreur pour ce champ
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };


  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.trim()) {
      newErrors.nom = "Le nom est requis";
    }
    if (!formData.prenom.trim()) {
      newErrors.prenom = "Le prénom est requis";
    }
    if (!formData.email.trim()) {
      newErrors.email = "L'email est requis";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "L'email n'est pas valide";
    }

    if (isNewAccount) {
      if (!password) {
        newErrors.password = "Le mot de passe est requis";
      } else if (password.length < 6) {
        newErrors.password = "Le mot de passe doit contenir au moins 6 caractères";
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
      }
      if (!cguAccepted) {
        newErrors.cgu = "Vous devez accepter les Conditions Générales d'Utilisation";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setLoginError("");
    if (!loginEmail || !loginPassword) {
      setLoginError("Veuillez remplir tous les champs");
      return;
    }

    // Vérifier que Supabase est configuré
    if (!isSupabaseConfigured) {
      const isProduction = typeof window !== "undefined" && !window.location.hostname.includes("localhost");
      setLoginError(
        isProduction
          ? "Configuration Supabase manquante sur Vercel. Configurez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans Vercel → Settings → Environment Variables, puis redéployez."
          : "Configuration Supabase manquante. Créez un fichier .env.local avec NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY."
      );
      return;
    }

    const emailValue = loginEmail.trim().toLowerCase();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailValue,
        password: loginPassword,
      });

      if (error) {
        console.error("Supabase signIn error:", error);
        setLoginError(error.message || "Email ou mot de passe incorrect");
        setIsSubmitting(false);
        return;
      }

      // Récupérer le profil depuis Supabase
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .single();

        if (profile) {
          const [prenom, ...nomParts] = (profile.full_name || "").split(" ");
          const nom = nomParts.join(" ");

          const preferences = loadPreferences();
          setFormData({
            ...preferences,
            email: profile.email || emailValue,
            nom: nom || preferences.nom,
            prenom: prenom || preferences.prenom,
            telephone: preferences.telephone,
            cguAccepted: preferences.cguAccepted ?? false,
          });
        }
      }

      setShowLoginForm(false);
      setIsNewAccount(false);
      setIsEditing(false);
      router.push("/");
    } catch (err) {
      console.error(err);
      setLoginError("Une erreur est survenue pendant la connexion");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    try {
      if (isNewAccount) {
        // Vérifier que Supabase est configuré
        if (!isSupabaseConfigured) {
          const isProduction = typeof window !== "undefined" && !window.location.hostname.includes("localhost");
          setSubmitError(
            isProduction
              ? "Configuration Supabase manquante sur Vercel. Configurez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans Vercel → Settings → Environment Variables, puis redéployez. Consultez CONFIGURATION_VARIABLES_ENV.md pour plus de détails."
              : "Configuration Supabase manquante. Créez un fichier .env.local avec NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY. Consultez CONFIGURATION_VARIABLES_ENV.md pour plus de détails."
          );
          setIsSubmitting(false);
          return;
        }

        // Créer le compte avec Supabase
        const emailValue = formData.email.trim().toLowerCase();

        // Validation de l'email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
          setSubmitError("L'email n'est pas valide");
          setIsSubmitting(false);
          return;
        }

        // 1) Création de compte dans Supabase (auth.users)
        const { data, error } = await supabase.auth.signUp({
          email: emailValue,
          password: password,
          options: {
            data: {
              nom: formData.nom,
              prenom: formData.prenom,
              telephone: formData.telephone,
            },
          },
        });

        if (error) {
          console.error("Supabase signUp error:", error);
          setSubmitError(error.message || "Impossible de créer le compte");
          setIsSubmitting(false);
          return;
        }

        // 2) Création / mise à jour du profil dans la table `profiles`
        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              id: data.user.id,
              full_name: `${formData.prenom} ${formData.nom}`,
              email: emailValue,
              avatar_url: null,
              premium_active: false,
              premium_start_date: null,
              premium_end_date: null,
            });

          if (profileError) {
            console.error("Erreur création profil:", profileError.message);
            // On continue quand même, l'utilisateur est créé dans auth
          }
        }

        // 3) Sauvegarder les préférences locales
        const preferencesWithCgu = {
          ...formData,
          email: emailValue,
          abonnementType: "free" as const,
          cguAccepted: true,
          cguAcceptedDate: new Date().toISOString(),
        };
        savePreferences(preferencesWithCgu);

        refgrowTrackSignup(emailValue);

        // Si Supabase demande confirmation par email, data.session peut être null
        if (!data.session) {
          alert(
            "Compte créé. Si la confirmation email est activée dans Supabase, vérifie ta boîte mail."
          );
        } else {
          alert("Compte créé avec succès !");
        }
      } else {
        // Sauvegarder les préférences
        savePreferences(formData);
        alert("Profil mis à jour avec succès !");
      }

      setIsEditing(false);
      setIsNewAccount(false);
      router.push("/");
    } catch (err) {
      console.error(err);
      setSubmitError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileAppScreen
      title={
        isNewAccount && !showLoginForm
          ? "Créer mon compte"
          : showLoginForm
          ? "Se connecter"
          : "Mon profil"
      }
      backHref="/menu"
      contentClassName="px-4 pt-2 pb-8"
    >
      <div className="rounded-[1.5rem] border border-[#F5DDE5] bg-[#FFF0F3] p-5 shadow-[0_4px_20px_rgba(233,78,119,0.08)]">
        {/* Boutons pour basculer entre connexion et création de compte */}
        {isNewAccount && !isEditing && (
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => {
                setShowLoginForm(true);
                setLoginError("");
              }}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                showLoginForm
                  ? "bg-[var(--beige-accent)] text-white"
                  : "bg-[var(--beige-border)] text-[var(--foreground)] hover:bg-[var(--beige-border-dark)]"
              }`}
            >
              Se connecter
            </button>
            <button
              onClick={() => {
                setShowLoginForm(false);
                setIsEditing(true);
                setLoginError("");
              }}
              className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
                !showLoginForm
                  ? "bg-[var(--beige-accent)] text-white"
                  : "bg-[var(--beige-border)] text-[var(--foreground)] hover:bg-[var(--beige-border-dark)]"
              }`}
            >
              Créer un compte
            </button>
          </div>
        )}

        {/* Formulaire de connexion */}
        {showLoginForm && isNewAccount && (
          <div className="mb-6 space-y-4">
            {loginError && (
              <div className="p-3 rounded-lg bg-red-100 border border-red-300 text-red-700 text-sm">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Email
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-[var(--beige-border)] bg-white text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--beige-accent)]"
                placeholder="ton@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                Mot de passe
              </label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-[var(--beige-border)] bg-white text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--beige-accent)]"
                placeholder="••••••••"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-[var(--beige-accent)] text-white rounded-lg hover:bg-[var(--beige-accent-hover)] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Connexion..." : "Se connecter"}
            </button>
          </div>
        )}
        
        {/* Mention phase de test pour les nouveaux comptes */}
        {isNewAccount && !showLoginForm && (
          <div className="mb-6 p-3 rounded-xl bg-[#FFD9D9] border border-[var(--beige-border)]">
            <p className="text-xs text-center text-[#6B2E2E]">
              <strong>Version de test :</strong> La version de test vous donne accès gratuitement à toutes les fonctionnalités Premium, afin d'améliorer l'application grâce à vos retours.
            </p>
          </div>
        )}

        {!isEditing && !isNewAccount && (
          <div className="mb-4 space-y-3">
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-2 px-4 bg-[var(--beige-accent)] text-white rounded-lg hover:bg-[var(--beige-accent-hover)] transition-colors"
            >
              Modifier mon profil
            </button>
            
            {/* Abonnement : statut (tous les comptes) + actions Stripe si Premium payant */}
            {user && !isNewAccount && (
              <div className="pt-3 border-t border-[var(--beige-border)]">
                <p className="text-xs text-[var(--beige-text-muted)] mb-2 text-center">
                  {getSubscriptionAccountMessage(profile).statusLine}
                </p>
                {isPremium && (
                  <>
                <button
                  onClick={async () => {
                    if (!user) return;
                    setLoadingPortal(true);
                    try {
                      const response = await fetch("/api/billing/portal", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: user.id }),
                      });
                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || "Erreur lors de l'ouverture du portail");
                      }
                      const { url } = await response.json();
                      if (url) window.open(url, "_blank");
                      else throw new Error("URL du portail non reçue");
                    } catch (error) {
                      console.error("[Account] Erreur portal:", error);
                      alert(error instanceof Error ? error.message : "Erreur lors de l'ouverture du portail de gestion");
                    } finally {
                      setLoadingPortal(false);
                    }
                  }}
                  disabled={loadingPortal || cancelSubscriptionLoading}
                  className="w-full py-2 px-4 text-sm font-medium text-white bg-[#E94E77] hover:bg-[#D63D56] rounded-xl transition-colors disabled:opacity-50"
                >
                  {loadingPortal ? "Chargement..." : "Gérer mon abonnement (Stripe)"}
                </button>
                {profile?.cancel_at_period_end ? (
                  <p className="mt-2 rounded-lg border border-amber-400 bg-amber-100/90 p-3 text-center text-xs font-medium text-amber-950 dark:border-amber-600 dark:bg-amber-900/50 dark:text-amber-50">
                    {getSubscriptionAccountMessage(profile).detailTu}{" "}
                    Pour annuler la résiliation, utilise le portail Stripe (bouton ci-dessus).
                  </p>
                ) : (
                <button
                  onClick={async () => {
                    if (!user) return;
                    if (
                      !confirm(
                        "Tu vas être redirigé vers Stripe pour confirmer la résiliation. Tu reviendras ensuite sur cette page."
                      )
                    )
                      return;
                    setCancelSubscriptionLoading(true);
                    try {
                      const response = await fetch("/api/billing/portal", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userId: user.id,
                          intent: "cancel_subscription",
                          returnTo: "compte",
                        }),
                      });
                      const data = (await response.json().catch(() => ({}))) as {
                        error?: string;
                        details?: string;
                        url?: string;
                      };
                      if (!response.ok) {
                        throw new Error(
                          [data.error, data.details].filter(Boolean).join("\n\n") ||
                            "Impossible d’ouvrir Stripe."
                        );
                      }
                      if (!data.url) throw new Error("URL Stripe non reçue.");
                      window.location.assign(data.url);
                    } catch (e) {
                      console.error("[Account] résiliation (portail):", e);
                      alert(e instanceof Error ? e.message : "Erreur lors de l’ouverture de Stripe.");
                    } finally {
                      setCancelSubscriptionLoading(false);
                    }
                  }}
                  disabled={loadingPortal || cancelSubscriptionLoading}
                  className="w-full py-2 px-4 text-xs text-[var(--beige-text-muted)] hover:text-red-600 transition-colors underline disabled:opacity-50"
                >
                  {cancelSubscriptionLoading ? "Redirection…" : "Résilier mon abonnement"}
                </button>
                )}
                  </>
                )}
              </div>
            )}
            
            <button
              onClick={async () => {
                if (confirm("Êtes-vous sûr de vouloir vous déconnecter ?")) {
                  try {
                    await logout();
                    router.push("/login");
                  } catch (error) {
                    console.error("Erreur lors de la déconnexion:", error);
                    // Rediriger quand même vers la page de connexion
                  router.push("/login");
                  }
                }
              }}
              className="w-full py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        )}

        {/* Formulaire de création de compte ou modification de profil */}
        {!showLoginForm && (
          <div className="space-y-6">
            {submitError && (
              <ErrorMessage message={submitError} onDismiss={() => setSubmitError("")} />
            )}
          {/* Informations personnelles */}
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">
              Informations personnelles
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Nom *
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => handleInputChange("nom", e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.nom
                      ? "border-red-500"
                      : "border-[var(--beige-border)]"
                  } bg-white text-[#2A2523] disabled:bg-[var(--beige-light)] disabled:cursor-not-allowed`}
                />
                {errors.nom && (
                  <p className="text-red-500 text-xs mt-1">{errors.nom}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Prénom *
                </label>
                <input
                  type="text"
                  value={formData.prenom}
                  onChange={(e) => handleInputChange("prenom", e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.prenom
                      ? "border-red-500"
                      : "border-[var(--beige-border)]"
                  } bg-white text-[#2A2523] disabled:bg-[var(--beige-light)] disabled:cursor-not-allowed`}
                />
                {errors.prenom && (
                  <p className="text-red-500 text-xs mt-1">{errors.prenom}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    errors.email
                      ? "border-red-500"
                      : "border-[var(--beige-border)]"
                  } bg-white text-[#2A2523] disabled:bg-[var(--beige-light)] disabled:cursor-not-allowed`}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) =>
                    handleInputChange("telephone", e.target.value)
                  }
                  disabled={!isEditing}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--beige-border)] bg-white text-[var(--foreground)] disabled:bg-[var(--beige-light)] disabled:cursor-not-allowed"
                />
              </div>

              {isNewAccount && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Mot de passe *
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        errors.password
                          ? "border-red-500"
                          : "border-[var(--beige-border)]"
                      } bg-white text-[#2A2523]`}
                    />
                    {errors.password && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                      Confirmer le mot de passe *
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border ${
                        errors.confirmPassword
                          ? "border-red-500"
                          : "border-[var(--beige-border)]"
                      } bg-white text-[#2A2523]`}
                    />
                    {errors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Acceptation des CGU (uniquement pour nouveau compte) */}
          {isNewAccount && isEditing && (
            <div className="pt-4 border-t border-[var(--beige-border)]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cguAccepted}
                  onChange={(e) => setCguAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 text-[var(--beige-accent)] rounded border-[var(--beige-border)] focus:ring-[var(--beige-accent)]"
                />
                <div className="flex-1">
                  <span className="text-sm text-[var(--foreground)]">
                    J&apos;accepte les{" "}
                    <button
                      type="button"
                      onClick={() => setShowCguModal(true)}
                      className="text-[var(--beige-accent)] hover:underline font-semibold"
                    >
                      Conditions Générales d&apos;Utilisation
                    </button>
                    {" "}*
                  </span>
                  {errors.cgu && (
                    <p className="text-red-500 text-xs mt-1">{errors.cgu}</p>
                  )}
                </div>
              </label>
            </div>
          )}

          {/* Boutons d'action */}
          {isEditing && (
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-[var(--beige-accent)] text-white rounded-lg hover:bg-[var(--beige-accent-hover)] transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? isNewAccount
                    ? "Création..."
                    : "Enregistrement..."
                  : isNewAccount
                  ? "Créer mon compte"
                  : "Enregistrer"}
              </button>
              {!isNewAccount && (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    const preferences = loadPreferences();
                    setFormData(preferences);
                    setErrors({});
                  }}
                  className="flex-1 py-3 px-4 bg-[var(--beige-border)] text-[var(--foreground)] rounded-lg hover:bg-[var(--beige-border-dark)] transition-colors"
                >
                  Annuler
                </button>
              )}
            </div>
          )}
          </div>
        )}
      </div>

      {/* Modal CGU */}
      {showCguModal && (
        <div className="fixed inset-0 bg-[#6B2E2E]/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFF0F0] rounded-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg text-[#6B2E2E]">
                Conditions Générales d&apos;Utilisation
              </h3>
              <button
                onClick={() => setShowCguModal(false)}
                className="text-[#9A6A6A] hover:text-[#6B2E2E]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#726566] max-h-[60vh] overflow-y-auto">
              <CGUContent variant="modal" />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowCguModal(false);
                  setCguAccepted(true);
                }}
                className="flex-1 px-4 py-2 rounded-xl bg-[#E94E77] text-white text-sm font-semibold hover:bg-[#D63D56]"
              >
                J&apos;accepte
              </button>
              <button
                onClick={() => setShowCguModal(false)}
                className="flex-1 px-4 py-2 rounded-xl bg-[#FFD9D9] border border-[var(--beige-border)] text-sm text-[#6B2E2E] hover:border-[#E94E77]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </MobileAppScreen>
  );
}

