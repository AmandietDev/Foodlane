"use client";

import Link from "next/link";
import SubscriptionPlanCards from "./SubscriptionPlanCards";

type Props = {
  open: boolean;
  onClose: () => void;
  variant?: "signup" | "weekly";
};

export default function SubscriptionUpsellModal({ open, onClose, variant = "weekly" }: Props) {
  if (!open) return null;

  const title =
    variant === "signup"
      ? "Bienvenue sur Foodlane"
      : "Passe à l’expérience complète";
  const subtitle =
    variant === "signup"
      ? "Avant de configurer ton profil, découvre ce que Premium et Premium Plus débloquent pour toi."
      : "Menus illimités, assistant diététicien sans limite, courses avancées et plus encore.";

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55">
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-[#FFF8F6] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upsell-title"
      >
        <div className="shrink-0 border-b border-[#E8D5D5] px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full px-2 py-1 text-sm text-[#7a5a5a] hover:bg-[#f0e0e0]"
            aria-label="Fermer"
          >
            ✕
          </button>
          <h2 id="upsell-title" className="text-xl font-bold text-[#4a2c2c] pr-8">
            {title}
          </h2>
          <p className="mt-1 text-sm text-[#7a5a5a]">{subtitle}</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <SubscriptionPlanCards compact />
        </div>
        <div className="shrink-0 flex flex-col gap-2 border-t border-[#E8D5D5] px-4 py-3 sm:flex-row sm:justify-between sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-[#E8A0A0] bg-white px-4 py-2.5 text-sm font-semibold text-[#6B2E2E]"
          >
            {variant === "signup" ? "Continuer avec le gratuit" : "Plus tard"}
          </button>
          <Link
            href="/premium"
            onClick={onClose}
            className="w-full sm:w-auto text-center rounded-xl px-4 py-2.5 text-sm font-semibold text-[#D44A4A] underline-offset-2 hover:underline"
          >
            Voir tous les détails
          </Link>
        </div>
      </div>
    </div>
  );
}
