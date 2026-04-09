"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "../components/Logo";
import { isValidResetPassword, resetPasswordRuleHint } from "../src/lib/passwordPolicy";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";

  const [validating, setValidating] = useState(true);
  const [tokenOk, setTokenOk] = useState(false);
  const [tokenReason, setTokenReason] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setTokenOk(false);
        setTokenReason("missing");
        setValidating(false);
        return;
      }
      const res = await fetch(`/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`);
      const j = await res.json().catch(() => ({}));
      if (cancelled) return;
      setTokenOk(Boolean(j.valid));
      setTokenReason(j.valid ? null : (j.reason as string) || "invalid");
      setValidating(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (!isValidResetPassword(password)) {
      setError(resetPasswordRuleHint());
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || "Échec de la réinitialisation.");
        setLoading(false);
        return;
      }
      router.push("/login?reset=success");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <div className="text-center py-8 text-gray-600 text-sm">Vérification du lien…</div>
    );
  }

  if (!tokenOk) {
    const msg =
      tokenReason === "expired"
        ? "Ce lien a expiré (1 h). Demande un nouvel e-mail."
        : tokenReason === "already_used"
          ? "Ce lien a déjà été utilisé."
          : "Lien invalide ou incomplet.";
    return (
      <div className="space-y-4 text-center">
        <p className="text-red-700 text-sm">{msg}</p>
        <Link href="/forgot-password" className="inline-block text-[#D44A4A] font-semibold underline text-sm">
          Demander un nouvel e-mail
        </Link>
        <div>
          <Link href="/login" className="text-sm text-gray-600 hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
      <p className="text-sm text-gray-600">Choisis un nouveau mot de passe. {resetPasswordRuleHint()}</p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D44A4A]"
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D44A4A]"
          autoComplete="new-password"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 px-4 bg-[#D44A4A] hover:bg-[#C03A3A] text-white rounded-xl font-semibold disabled:opacity-50"
      >
        {loading ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF0F0] to-[#FFD9D9] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo />
          <h1 className="text-2xl font-bold text-[#6B2E2E] mt-4">Nouveau mot de passe</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-[#E8A0A0]">
          <Suspense fallback={<div className="text-center py-8 text-gray-600 text-sm">Chargement…</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
