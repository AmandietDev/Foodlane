"use client";

import Image from "next/image";
import Link from "next/link";
import { homeTheme } from "./homeTheme";

type MenuRow = {
  id: string;
  title: string;
  week_start_date: string;
};

type HomeWeekSectionProps = {
  menus: MenuRow[];
  loading: boolean;
};

function WeekCalendarIllustration() {
  return (
    <div className="relative h-[4.75rem] w-[4.75rem] shrink-0 sm:h-20 sm:w-20" aria-hidden>
      <Image
        src="/home/week-calendar-icon.png"
        alt=""
        width={80}
        height={80}
        className="h-full w-full object-contain"
        unoptimized
        priority={false}
      />
    </div>
  );
}

function TitleUnderline() {
  return (
    <svg viewBox="0 0 80 6" className="mt-0.5 h-1.5 w-16" fill="none" aria-hidden>
      <path
        d="M1 4C18 1.5 42 1 79 3.5"
        stroke="#E94E77"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

function ButtonSparkles() {
  return (
    <svg viewBox="0 0 28 14" className="mb-0.5 h-3.5 w-7" fill="none" aria-hidden>
      <path d="M4 10 L4 4 M1 7 L7 7" stroke="#E94E77" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 12 L14 6 M11 9 L17 9" stroke="#E94E77" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 9 L22 4 M19.5 6.5 L24.5 6.5" stroke="#E94E77" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function HomeWeekSection({ menus, loading }: HomeWeekSectionProps) {
  const hasMenu = menus.length > 0;

  const ctaHref = hasMenu ? `/menus/${menus[0].id}` : "/planifier";
  const ctaLabel = hasMenu ? "Voir mon menu" : "Créer mon menu";

  return (
    <section
      id="cette-semaine"
      className="flex items-center gap-2.5 rounded-[1.75rem] border px-3.5 py-3.5 sm:gap-3 sm:px-4 sm:py-4"
      style={{
        backgroundColor: "#FFFBF9",
        borderColor: "#F8E8ED",
        boxShadow: "0 4px 20px rgba(233, 78, 119, 0.07)",
      }}
    >
      <WeekCalendarIllustration />

      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-bold leading-tight" style={{ color: "#3C2424" }}>
          Cette semaine
        </h2>
        <TitleUnderline />
        {loading ? (
          <p className="mt-1.5 text-[11px] leading-snug" style={{ color: "#5C4040" }}>
            Chargement…
          </p>
        ) : hasMenu ? (
          <>
            <p className="mt-1.5 text-[11px] font-medium leading-snug" style={{ color: "#3C2424" }}>
              {menus[0].title}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug" style={{ color: "#5C4040" }}>
              Retrouve ton menu et ta liste de courses.
            </p>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-[11px] font-medium leading-snug" style={{ color: "#3C2424" }}>
              Aucun menu généré pour le moment.
            </p>
            <p className="mt-0.5 text-[10px] leading-snug" style={{ color: "#5C4040" }}>
              Gagne du temps et prépare tes repas en quelques clics.
            </p>
          </>
        )}
      </div>

      {!loading ? (
        <div className="flex shrink-0 flex-col items-center">
          <ButtonSparkles />
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-2 text-[11px] font-semibold text-white shadow-[0_4px_14px_rgba(233,78,119,0.35)] transition active:scale-[0.98]"
            style={{ backgroundColor: homeTheme.accent }}
          >
            {ctaLabel}
            <span aria-hidden>›</span>
          </Link>
        </div>
      ) : null}
    </section>
  );
}
