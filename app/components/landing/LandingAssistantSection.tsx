"use client";

import AnimateIn from "./AnimateIn";
import { ASSISTANT_BULLETS, WEEK_CHALLENGES } from "./landingContent";
import { CheckIcon, MascotIllustration } from "./LandingIcons";
import { landingTheme } from "./landingTheme";

const ASSISTANT_PANEL_BG = landingTheme.assistantPanel;

export function LandingAssistantSection() {
  return (
    <AnimateIn>
      <div
        className="mx-auto max-w-6xl rounded-[1.75rem] p-4 sm:p-5 lg:rounded-[2rem]"
        style={{ backgroundColor: ASSISTANT_PANEL_BG }}
      >
        <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(220px,268px)_minmax(240px,300px)_1fr] lg:gap-5">
          <div className="relative mx-auto h-52 w-full max-w-[220px] sm:h-56 lg:mx-0 lg:min-h-[320px] lg:max-w-none lg:h-full">
            <MascotIllustration fill className="object-contain object-bottom drop-shadow-[0_8px_24px_rgba(233,78,119,0.15)]" />
          </div>

          <div className="flex min-w-0 flex-col justify-center px-1 py-2 lg:px-4 lg:py-6">
            <AssistantHeading className="text-[1.65rem] leading-tight" />
            <ul className="mt-5 space-y-2.5">
              {ASSISTANT_BULLETS.map((b) => (
                <li key={b} className="flex items-center gap-2.5 text-sm text-[#1A1A1A]">
                  <CheckIcon />
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid min-w-0 grid-cols-2 content-center gap-3 py-2 lg:gap-4 lg:py-3">
            <ObjectifCard />
            <RepartitionNutritionnelleCard />
            <SemaineEquilibreeCard />
            <DefisCard />
          </div>
        </div>
      </div>
    </AnimateIn>
  );
}

function AssistantHeading({ className = "" }: { className?: string }) {
  return (
    <h2 className={`font-bold text-[#1A1A1A] ${className}`}>
      Votre assistant{" "}
      <span className="relative inline-block">
        diététicien IA
        <svg className="absolute -bottom-0.5 left-0 w-full" viewBox="0 0 160 6" fill="none" aria-hidden>
          <path
            d="M2 4C40 1.5 100 1 158 4"
            stroke="#E94E77"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </span>
    </h2>
  );
}

const cardShell =
  "rounded-2xl bg-white p-4 shadow-[0_4px_20px_rgba(233,78,119,0.08)] lg:p-5";
const cardTitleClass = "text-xs font-bold text-[#1A1A1A]";

function ObjectifCard() {
  return (
    <article className={cardShell}>
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFECE8]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="#E94E77" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="5" stroke="#E94E77" strokeWidth="1.8" />
            <circle cx="12" cy="12" r="1.5" fill="#E94E77" />
            <path d="M12 3v4M15 6l2-2" stroke="#E94E77" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h3 className={cardTitleClass}>Objectif</h3>
          <p className="text-xs text-[#5C4040]">Perte de poids</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-[#FFECE8]">
          <div
            className="h-1.5 rounded-full bg-gradient-to-r from-[#E94E77] to-[#F97B98]"
            style={{ width: "68%" }}
          />
        </div>
        <p className="mt-1 text-right text-[11px] font-semibold text-[#E94E77]">68%</p>
      </div>
    </article>
  );
}

function RepartitionNutritionnelleCard() {
  const r = 30;
  const c = 2 * Math.PI * r;
  const proteins = 0.28 * c;
  const glucides = 0.47 * c;
  const lipides = 0.25 * c;

  return (
    <article className={cardShell}>
      <h3 className={cardTitleClass}>Répartition nutritionnelle</h3>
      <div className="mt-2 flex items-center gap-2">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90" aria-hidden>
            <circle
              cx="38"
              cy="38"
              r={r}
              fill="none"
              stroke="#E94E77"
              strokeWidth="12"
              strokeDasharray={`${proteins} ${c}`}
            />
            <circle
              cx="38"
              cy="38"
              r={r}
              fill="none"
              stroke="#4CAF50"
              strokeWidth="12"
              strokeDasharray={`${glucides} ${c}`}
              strokeDashoffset={-proteins}
            />
            <circle
              cx="38"
              cy="38"
              r={r}
              fill="none"
              stroke="#FFC107"
              strokeWidth="12"
              strokeDasharray={`${lipides} ${c}`}
              strokeDashoffset={-(proteins + glucides)}
            />
          </svg>
        </div>
        <ul className="space-y-0.5 text-[11px] text-[#1A1A1A]">
          <li className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#E94E77]" />
            Protéines 28%
          </li>
          <li className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4CAF50]" />
            Glucides 47%
          </li>
          <li className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FFC107]" />
            Lipides 25%
          </li>
        </ul>
      </div>
    </article>
  );
}

function SemaineEquilibreeCard() {
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <article className={cardShell}>
      <h3 className={cardTitleClass}>Semaine équilibrée</h3>
      <div className="mt-2 flex justify-between gap-0.5">
        {days.map((d, i) => (
          <div key={d} className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-medium text-[#9A7A7A]">{d}</span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                i === 6 ? "bg-[#FFE4E8] text-[#F9A8B4]" : "bg-[#E8F8EE] text-[#3D9A5E]"
              }`}
            >
              {i === 6 ? "○" : "✓"}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}

function DefisCard() {
  return (
    <article className={cardShell}>
      <h3 className={cardTitleClass}>Défis personnalisés</h3>
      <p className="text-[11px] text-[#5C4040]">
        Court, faisable aujourd&apos;hui — adapté à ton profil
      </p>
      <ul className="mt-2.5 space-y-2 text-[11px]">
        {WEEK_CHALLENGES.map((challenge, i) => (
          <li key={challenge.text} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFECE8]">
              <ChallengeIcon type={challenge.icon} className="h-3.5 w-3.5" />
            </span>
            <span className="leading-snug text-[#1A1A1A]">
              {i === 0 ? (
                <>
                  <span className="font-semibold text-[#E94E77]">Aujourd&apos;hui · </span>
                  {challenge.text}
                </>
              ) : (
                challenge.text
              )}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function ChallengeIcon({ type, className = "h-3.5 w-3.5" }: { type: string; className?: string }) {
  const stroke = "#E94E77";

  if (type === "water") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
        <path
          d="M12 3.5c-3 4.5-5.5 7.2-5.5 10a5.5 5.5 0 1011 0C17.5 10.7 15 8 12 3.5z"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "walk") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
        <circle cx="12" cy="5" r="2" stroke={stroke} strokeWidth="1.8" />
        <path
          d="M9 22l2-7 1 3 2-3 2 7M8 12l2-3h4l2 3"
          stroke={stroke}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "plate") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke={stroke} strokeWidth="1.8" />
        <path d="M8 14h8M10 11h4" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M12 3.5c-3 4.5-5.5 7.2-5.5 10a5.5 5.5 0 1011 0C17.5 10.7 15 8 12 3.5z"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
