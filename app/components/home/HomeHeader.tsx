"use client";

import Link from "next/link";
import { homeTheme } from "./homeTheme";

type HomeHeaderProps = {
  firstName: string;
};

export function HomeHeader({ firstName }: HomeHeaderProps) {
  const greeting = firstName ? `Bonjour ${firstName}` : "Bonjour";

  return (
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight" style={{ color: homeTheme.text }}>
          {greeting} <span aria-hidden>🌸</span>
        </h1>
        <p className="mt-1 text-sm font-medium" style={{ color: homeTheme.textMuted }}>
          Qu&apos;est-ce qu&apos;on mange cette semaine ?
        </p>
      </div>
      <Link
        href="/menu"
        aria-label="Réglages et profil"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-white shadow-sm transition hover:bg-[#FFF8F6]"
        style={{ borderColor: homeTheme.border }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
          <circle cx="12" cy="8" r="3.5" stroke={homeTheme.text} strokeWidth="1.75" />
          <path
            d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"
            stroke={homeTheme.text}
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </Link>
    </header>
  );
}
