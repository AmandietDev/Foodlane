"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "../components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok && j.error) {
        setError(j.error);
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Erreur réseau. Réessaie plus tard.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#FFF0F0] to-[#FFD9D9] px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Logo />
          <h1 className="text-2xl font-bold text-[#6B2E2E] mt-4">Mot de passe oublié</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-[#E8A0A0]">
          {done ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-gray-700">
                Si cette adresse est associée à un compte, tu recevras un e-mail avec un lien pour réinitialiser
                ton mot de passe. Le lien est valable <strong>1 heure</strong>.
              </p>
              <p className="text-xs text-gray-500">
                Pense à vérifier les courriers indésirables. Si tu n’as rien demandé, ignore cet e-mail.
              </p>
              <Link
                href="/login"
                className="inline-block w-full py-3 px-4 bg-[#D44A4A] hover:bg-[#C03A3A] text-white rounded-xl font-semibold text-center"
              >
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
              )}
              <p className="text-sm text-gray-600">
                Saisis l’e-mail de ton compte. Nous t’enverrons un lien sécurisé (même message affiché que l’e-mail
                existe ou non).
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D44A4A]"
                  placeholder="ton@email.com"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#D44A4A] hover:bg-[#C03A3A] text-white rounded-xl font-semibold disabled:opacity-50"
              >
                {loading ? "Envoi…" : "Envoyer le lien"}
              </button>
              <div className="text-center">
                <Link href="/login" className="text-sm text-[#D44A4A] hover:underline">
                  ← Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
