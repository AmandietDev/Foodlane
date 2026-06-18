"use client";

import { useState } from "react";

import { FOODLANE_LEGAL_INFO } from "../components/LegalDocuments";
import { LegalPageShell } from "../components/legal/LegalPageShell";

const CONTACT_SUBJECTS = [
  "Question générale",
  "Problème technique",
  "Suggestion d'amélioration",
  "Demande de partenariat",
  "Question Premium",
  "Autre",
] as const;

const emptyForm = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  objet: "",
  message: "",
};

export default function ContactPageClient() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi du message");
      }
      setSubmitted(true);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi du message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LegalPageShell title="Contact">
      <p>
        Une question sur Foodlane ? Écris-nous via le formulaire ci-dessous ou
        directement à{" "}
        <a
          href={`mailto:${FOODLANE_LEGAL_INFO.email}`}
          className="font-semibold text-[#E94E77] underline underline-offset-2 hover:text-[#D63D56]"
        >
          {FOODLANE_LEGAL_INFO.email}
        </a>
        .
      </p>
      <p className="text-sm text-[#7A5C5C]">
        {FOODLANE_LEGAL_INFO.editorDisplayName} — {FOODLANE_LEGAL_INFO.address}
      </p>

      {submitted ? (
        <div className="rounded-2xl border border-[#C8E6C9] bg-[#F1F8E9] px-4 py-3 text-sm text-[#2E7D32]">
          Merci ! Ton message a bien été envoyé. Nous te répondrons dès que possible.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-[#3D2525]">Prénom</span>
              <input
                required
                value={form.prenom}
                onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                className="w-full rounded-xl border border-[#E8D5D5] bg-white px-3 py-2 text-[#3D2525] outline-none focus:border-[#E94E77]"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-[#3D2525]">Nom</span>
              <input
                required
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                className="w-full rounded-xl border border-[#E8D5D5] bg-white px-3 py-2 text-[#3D2525] outline-none focus:border-[#E94E77]"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[#3D2525]">Email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-xl border border-[#E8D5D5] bg-white px-3 py-2 text-[#3D2525] outline-none focus:border-[#E94E77]"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[#3D2525]">Téléphone (optionnel)</span>
            <input
              type="tel"
              value={form.telephone}
              onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
              className="w-full rounded-xl border border-[#E8D5D5] bg-white px-3 py-2 text-[#3D2525] outline-none focus:border-[#E94E77]"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[#3D2525]">Objet</span>
            <select
              required
              value={form.objet}
              onChange={(e) => setForm((f) => ({ ...f, objet: e.target.value }))}
              className="w-full rounded-xl border border-[#E8D5D5] bg-white px-3 py-2 text-[#3D2525] outline-none focus:border-[#E94E77]"
            >
              <option value="">Choisir un objet</option>
              {CONTACT_SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-[#3D2525]">Message</span>
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              className="w-full rounded-xl border border-[#E8D5D5] bg-white px-3 py-2 text-[#3D2525] outline-none focus:border-[#E94E77]"
            />
          </label>

          {error ? (
            <p className="text-sm text-[#C62828]" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-[#E94E77] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D63D56] transition-colors disabled:opacity-60"
          >
            {loading ? "Envoi en cours…" : "Envoyer le message"}
          </button>
        </form>
      )}
    </LegalPageShell>
  );
}
