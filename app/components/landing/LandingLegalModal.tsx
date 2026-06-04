"use client";

import {
  CGUContent,
  ConfidentialiteContent,
  MentionsLegalesContent,
} from "../LegalDocuments";

export type LegalDocKey = "mentions" | "cgu" | "confidentialite" | null;

type LandingLegalModalProps = {
  doc: LegalDocKey;
  onClose: () => void;
};

const TITLES: Record<Exclude<LegalDocKey, null>, string> = {
  mentions: "Mentions légales",
  cgu: "Conditions générales d'utilisation",
  confidentialite: "Politique de confidentialité",
};

export default function LandingLegalModal({ doc, onClose }: LandingLegalModalProps) {
  if (!doc) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-white sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#FFE4E0] px-6 py-4">
          <h2 className="text-lg font-bold text-[#3D2525]">{TITLES[doc]}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-[#7A5C5C] hover:bg-[#FFF0EE]"
            aria-label="Fermer"
          >
            Fermer
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-4 text-sm text-[#3D2525]">
          {doc === "mentions" && <MentionsLegalesContent />}
          {doc === "cgu" && <CGUContent />}
          {doc === "confidentialite" && <ConfidentialiteContent />}
        </div>
      </div>
    </div>
  );
}
