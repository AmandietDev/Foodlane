"use client";

import Image from "next/image";
import Link from "next/link";

const PROMPT_ZONES = [
  { label: "Idée dîner rapide ?", href: "/equilibre?prompt=idee-diner-rapide", top: "6%", height: "26%" },
  { label: "Recette sans lactose", href: "/equilibre?prompt=recette-sans-lactose", top: "37%", height: "26%" },
  { label: "Menu équilibré ?", href: "/equilibre?prompt=menu-equilibre", top: "68%", height: "26%" },
] as const;

/** Bannière assistant — visuel maquette + zones cliquables */
export function HomeAssistantCard() {
  return (
    <section className="relative w-full overflow-hidden rounded-[2rem] shadow-[0_8px_28px_rgba(233,78,119,0.1)]">
      <div className="relative w-full" style={{ aspectRatio: "817/189" }}>
        <Image
          src="/home/assistant-card/card-mockup.png"
          alt="Ton assistant Foodlane"
          fill
          className="object-cover object-center"
          sizes="(max-width: 512px) 100vw, 448px"
          unoptimized
        />
        <Link
          href="/equilibre"
          className="absolute left-[11%] top-[54%] h-[34%] w-[28%] rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E94E77]"
          aria-label="Poser une question"
        >
          <span className="sr-only">Poser une question</span>
        </Link>
        {PROMPT_ZONES.map((zone) => (
          <Link
            key={zone.label}
            href={zone.href}
            className="absolute right-[2%] w-[27%] rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E94E77]"
            style={{ top: zone.top, height: zone.height }}
            aria-label={zone.label}
          >
            <span className="sr-only">{zone.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
