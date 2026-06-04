"use client";

import { useEffect, useState } from "react";

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

type LandingContactModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function LandingContactModal({ open, onClose }: LandingContactModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setSubmitted(false);
      setError("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

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

  const inputClass =
    "w-full rounded-xl border border-[#F0E6E8] bg-white px-3 py-2.5 text-sm text-[#3D2525] outline-none transition focus:border-[#E94E77] focus:ring-2 focus:ring-[#E94E77]/15";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#FFE4E0] px-6 py-4">
          <h2 id="contact-modal-title" className="text-lg font-bold text-[#3D2525]">
            Nous contacter
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-[#7A5C5C] hover:bg-[#FFF0EE]"
            aria-label="Fermer"
          >
            Fermer
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          {submitted ? (
            <div className="py-6 text-center">
              <p className="text-sm font-semibold text-[#2D7A4E]">Message envoyé avec succès.</p>
              <p className="mt-2 text-sm text-[#7A5C5C]">
                Nous te répondrons à l&apos;adresse indiquée dans les plus brefs délais.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 rounded-full bg-[#E94E77] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#D63D56]"
              >
                Fermer
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-[#7A5C5C]">
                Une question, un bug ou une suggestion ? Écris-nous via ce formulaire.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#7A5C5C]">Prénom</label>
                  <input
                    type="text"
                    required
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    className={inputClass}
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[#7A5C5C]">Nom</label>
                  <input
                    type="text"
                    required
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    className={inputClass}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#7A5C5C]">E-mail</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                  placeholder="ton@email.fr"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#7A5C5C]">
                  Téléphone <span className="font-normal">(optionnel)</span>
                </label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className={inputClass}
                  placeholder="06 12 34 56 78"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[#7A5C5C]">Objet</label>
                <select
                  required
                  value={form.objet}
                  onChange={(e) => setForm({ ...form, objet: e.target.value })}
                  className={inputClass}
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
                <label className="mb-1 block text-xs font-medium text-[#7A5C5C]">Message</label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className={`${inputClass} resize-none`}
                  placeholder="Décris ta question ou ton besoin…"
                />
              </div>

              {error ? (
                <p className="text-sm text-[#B42318]" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#E94E77] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#E94E77]/20 transition hover:bg-[#D63D56] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Envoi en cours…" : "Envoyer le message"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
