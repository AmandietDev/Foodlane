"use client";

export default function UserFeedback() {
  return (
    <section className="mb-6 mt-8">
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
    </section>
  );
}

