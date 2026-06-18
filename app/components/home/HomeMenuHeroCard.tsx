"use client";

import Image from "next/image";
import Link from "next/link";
import { homeTheme } from "./homeTheme";

function MenuSparklesIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0" fill="none" aria-hidden>
      <path
        d="M10 2v3M10 15v3M2 10h3M15 10h3M4.2 4.2l2.1 2.1M13.7 13.7l2.1 2.1M4.2 15.8l2.1-2.1M13.7 6.3l2.1-2.1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BadgeLightningIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <path
        d="M9 1 4 9h3.5L7 15l6-8H9.5L9 1Z"
        fill="#F5B800"
        stroke="#E8A800"
        strokeWidth="0.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BadgeCartIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <path
        d="M1.5 1.5h1.4l1.2 6.2a1 1 0 0 0 1 .8h4.9a1 1 0 0 0 .98-.8l.9-4.5H4.2"
        fill="none"
        stroke="#F0A030"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6.2" cy="12.8" r="0.9" fill="#F0A030" />
      <circle cx="11.2" cy="12.8" r="0.9" fill="#F0A030" />
    </svg>
  );
}

function BadgeLeafIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <path
        d="M8 14.5S2.5 11 2.5 6.5C2.5 3.5 5 1.5 8 1.5s5.5 2 5.5 5c0 4.5-5.5 8-5.5 8Z"
        fill="#5CB85C"
        stroke="#4AA84A"
        strokeWidth="0.5"
      />
      <path d="M8 14.5V5.5M8 5.5C6 5 4.5 3.5 4 2" stroke="#fff" strokeWidth="0.7" strokeLinecap="round" />
    </svg>
  );
}

const FEATURES = [
  { icon: <BadgeLightningIcon />, label: "Rapide" },
  { icon: <BadgeCartIcon />, label: "Liste courses" },
  { icon: <BadgeLeafIcon />, label: "Équilibré" },
] as const;

/** Rose du fond illustration.png — aligné pixel-perfect */
const HERO_PINK = "#FDECEA";

const VISUAL_MASK =
  "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.4) 8%, black 22%, black 100%)";

/** Carte « Menu de la semaine » */
export function HomeMenuHeroCard() {
  return (
    <section
      className="relative flex min-h-[14rem] overflow-hidden rounded-[1.75rem] bg-[#FFF8FA]"
      style={{ boxShadow: homeTheme.shadow }}
    >
      {/* Colonne texte — fondu doux vers le visuel */}
      <div
        className="relative z-20 flex min-w-0 flex-[1.08] flex-col justify-between px-4 py-4"
        style={{
          background:
            "linear-gradient(100deg, #FFF8FA 0%, #FFF8FA 48%, #FFF4F6 72%, rgba(255,248,250,0) 100%)",
        }}
      >
        <div className="max-w-[13.75rem]">
          <h2
            className="text-[1.35rem] font-bold leading-tight tracking-tight"
            style={{ color: homeTheme.text }}
          >
            Menu de la semaine
          </h2>
          <p className="mt-1.5 text-[11px] leading-snug" style={{ color: "#5C4040" }}>
            Génère des repas adaptés à tes goûts, ton foyer et ton organisation.
          </p>
          <Link
            href="/planifier"
            className="mt-3.5 flex w-full max-w-[12.5rem] items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold text-white shadow-[0_6px_20px_rgba(233,78,119,0.38)] transition active:scale-[0.98]"
            style={{ backgroundColor: homeTheme.accent }}
          >
            <MenuSparklesIcon />
            Générer mon menu
          </Link>
        </div>

        <div className="mt-4 flex max-w-[17rem] flex-wrap gap-1.5">
          {FEATURES.map((f) => (
            <span
              key={f.label}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/90 bg-white px-2.5 py-1 text-[10px] font-semibold shadow-[0_2px_8px_rgba(233,78,119,0.06)]"
              style={{ color: homeTheme.text }}
            >
              {f.icon}
              {f.label}
            </span>
          ))}
        </div>
      </div>

      {/* Panneau visuel — fond rose + illustration intégrée, bord gauche fondé */}
      <div
        className="relative -ml-10 w-[47%] shrink-0 self-stretch sm:-ml-12 sm:w-[45%]"
        style={{
          backgroundColor: HERO_PINK,
          WebkitMaskImage: VISUAL_MASK,
          maskImage: VISUAL_MASK,
        }}
        aria-hidden
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 80% at 85% 70%, #F5C9C2 0%, transparent 55%)",
          }}
        />

        <svg
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 w-full text-[#F0B8B0]/30"
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path fill="currentColor" d="M0 26 Q100 14 200 22 T400 20 V40 H0 Z" />
        </svg>

        <Image
          src="/home/menu-hero/illustration.png"
          alt=""
          fill
          className="object-contain object-bottom-right"
          sizes="(max-width: 512px) 47vw, 220px"
          unoptimized
          priority
          aria-hidden
        />
      </div>
    </section>
  );
}
