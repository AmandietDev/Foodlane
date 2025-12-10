"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "../components/Logo";

// On garde les préférences locales pour l’instant
import {
  savePreferences,
  type UserPreferences,
} from "../src/lib/userPreferences";

// ✅ Client Supabase
import { supabase, isSupabaseConfigured } from "../src/lib/supabaseClient";
import ErrorMessage from "../components/ErrorMessage";
import LoadingSpinner from "../components/LoadingSpinner";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const [checkingSession, setCheckingSession] = useState(true);

  // ✅ Rediriger si déjà connecté via Supabase
  useEffect(() => {
    let ignore = false;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Erreur getSession:", error.message);
      }
      if (!ignore && data.session) {
        router.push("/");
      } else if (!ignore) {
        setCheckingSession(false);
      }
    }

    checkSession();

    return () => {
      ignore = true;
    };
  }, [router]);

  if (checkingSession) {
    // On attend de savoir si l'utilisateur est déjà connecté
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <LoadingSpinner message="Vérification de la session..." />
      </div>
    );
  }

  // Petit helper pour nettoyer l’email
  const cleanEmail = (raw: string) => raw.trim().toLowerCase();

  // ✅ Connexion avec Supabase (email + mot de passe)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const emailValue = cleanEmail(email);

    if (!emailValue || !password) {
      setError("Veuillez remplir tous les champs");
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setError(
        "Configuration Supabase manquante. Veuillez configurer NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans les variables d'environnement."
      );
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailValue,
        password,
      });

      if (error) {
        console.error("Supabase signIn error:", error);
        setError(error.message || "Email ou mot de passe incorrect");
        setLoading(false);
        return;
      }

      // Succès : redirection vers l'accueil
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Une erreur est survenue pendant la connexion");
      setLoading(false);
    }
  };

  // ✅ Inscription avec Supabase + création du profil dans `profiles`
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailValue = cleanEmail(email);

    if (!emailValue || !password || !nom || !prenom) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    // Validation simple côté client
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setError("L'email n'est pas valide");
      return;
    }

    setLoading(true);

    if (!isSupabaseConfigured) {
      const isProduction = typeof window !== "undefined" && !window.location.hostname.includes("localhost");
      setError(
        isProduction
          ? "Configuration Supabase manquante sur Vercel. Configurez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans Vercel → Settings → Environment Variables, puis redéployez. Consultez CONFIGURATION_VARIABLES_ENV.md pour plus de détails."
          : "Configuration Supabase manquante. Créez un fichier .env.local avec NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY. Consultez CONFIGURATION_VARIABLES_ENV.md pour plus de détails."
      );
      setLoading(false);
      return;
    }

    try {
      // 1) Création de compte dans Supabase (auth.users)
      const { data, error } = await supabase.auth.signUp({
        email: emailValue,
        password,
        options: {
          data: {
            nom,
            prenom,
            telephone,
          },
        },
      });

      if (error) {
        console.error("Supabase signUp error:", error);
        setError(error.message || "Impossible de créer le compte");
        setLoading(false);
        return;
      }

      // 2) Création / mise à jour du profil dans la table `profiles`
      if (data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: data.user.id,              // même id que dans auth.users
            full_name: `${prenom} ${nom}`, // nom complet
            email: emailValue,             // 👈 on enregistre bien l'email ici
            avatar_url: null,
            premium_active: false,         // 👈 Nouveau compte = free par défaut
            premium_start_date: null,      // Pas de date de début premium
            premium_end_date: null,        // Pas de date de fin premium
          });

        if (profileError) {
          console.error("Erreur création profil:", profileError.message);
        }
      }

      // 3) Optionnel : enregistrer des préférences locales par défaut
      const now = new Date();

      const defaultPreferences: UserPreferences = {
        nom,
        prenom,
        email: emailValue,
        telephone,
        langue: "fr",
        afficherCalories: true,
        notificationsNewRecipes: true,
        notificationsMenuIdeas: true,
        notificationsReminders: true,
        abonnementType: "free",            // 👈 Nouveau compte = free par défaut
        nombrePersonnes: 1,
        regimesParticuliers: [],
        aversionsAlimentaires: [],
        equipements: [],
        objectifsUsage: [],
        cguAccepted: true,
        cguAcceptedDate: now.toISOString(),
      };

      savePreferences(defaultPreferences);

      // Si Supabase demande confirmation par email, data.session peut être null
      if (!data.session) {
        alert(
          "Compte créé. Si la confirmation email est activée dans Supabase, vérifie ta boîte mail."
        );
      }

      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Une erreur est survenue pendant la création du compte");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Mot de passe oublié via Supabase
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailValue = cleanEmail(resetEmail);

    if (!emailValue) {
      setError("Veuillez entrer votre email");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setError("L'email n'est pas valide");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailValue, {
        redirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : undefined,
      });

      if (error) {
        console.error("Supabase resetPassword error:", error);
        setError(
          error.message || "Impossible d'envoyer le lien de réinitialisation"
        );
        setLoading(false);
        return;
      }

      setResetSent(true);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Une erreur est survenue pendant l'envoi de l'email");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF0F0] to-[#FFD9D9] px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo />
          <h1 className="text-2xl font-bold text-[#6B2E2E] mt-4">
            {mode === "login" && "Connexion"}
            {mode === "signup" && "Créer un compte"}
            {mode === "forgot" && "Mot de passe oublié"}
          </h1>
        </div>

        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-[#E8A0A0]">
          {/* Formulaire de connexion */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <ErrorMessage message={error} onDismiss={() => setError("")} />
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D44A4A] focus:border-transparent"
                  placeholder="ton@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D44A4A] focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                    setEmail("");
                    setPassword("");
                  }}
                  className="text-sm text-[#D44A4A] hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#D44A4A] hover:bg-[#C03A3A] text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>

              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Pas encore de compte ?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                      setEmail("");
                      setPassword("");
                    }}
                    className="text-[#D44A4A] font-semibold hover:underline"
                  >
                    Créer un compte
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Formulaire d'inscription */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              {error && (
                <ErrorMessage message={error} onDismiss={() => setError("")} />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D44A4A] focus:border-transparent"
                    placeholder="Prénom"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D44A4A] focus:border-transparent"
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D44A4A] focus:border-transparent"
                  placeholder="ton@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D44A4A] focus:border-transparent"
                  placeholder="06 12 34 56 78"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D44A4A] focus:border-transparent"
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum 6 caractères
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D44A4A] focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#D44A4A] hover:bg-[#C03A3A] text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Création..." : "Créer mon compte"}
              </button>

              <div className="text-center mt-4">
                <p className="text-sm text-gray-600">
                  Déjà un compte ?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError("");
                      setEmail("");
                      setPassword("");
                      setNom("");
                      setPrenom("");
                      setTelephone("");
                      setConfirmPassword("");
                    }}
                    className="text-[#D44A4A] font-semibold hover:underline"
                  >
                    Se connecter
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Formulaire mot de passe oublié */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {resetSent ? (
                <div className="text-center space-y-4">
                  <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                    <p className="text-green-700 text-sm">
                      ✅ Un email de réinitialisation a été envoyé à{" "}
                      <strong>{resetEmail}</strong>
                    </p>
                    <p className="text-green-600 text-xs mt-2">
                      Vérifie ta boîte de réception et suis les instructions
                      pour réinitialiser ton mot de passe.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setResetSent(false);
                      setResetEmail("");
                      setError("");
                    }}
                    className="w-full py-3 px-4 bg-[#D44A4A] hover:bg-[#C03A3A] text-white rounded-xl font-semibold transition-colors"
                  >
                    Retour à la connexion
                  </button>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <p className="text-sm text-gray-600 mb-4">
                    Entre ton adresse email et nous t’enverrons un lien pour
                    réinitialiser ton mot de passe.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D44A4A] focus:border-transparent"
                      placeholder="ton@email.com"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-[#D44A4A] hover:bg-[#C03A3A] text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Envoi..." : "Envoyer le lien de réinitialisation"}
                  </button>

                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("login");
                        setResetEmail("");
                        setError("");
                      }}
                      className="text-sm text-[#D44A4A] hover:underline"
                    >
                      ← Retour à la connexion
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>

        {/* Lien vers la page d'accueil */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-[#D44A4A] transition-colors"
          >
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
