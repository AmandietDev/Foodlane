"use client";



import Image from "next/image";

import Link from "next/link";

import { homeTheme } from "./homeTheme";



const ACTIONS = [

  {

    href: "/preferences",

    title: "Mes préférences",

    iconSrc: "/home/quick-actions/icon-preferences.png",

  },

  {

    href: "/menu-semaine",

    title: "Mon carnet",

    iconSrc: "/home/quick-actions/icon-carnet.png",

  },

  {

    href: "/favoris",

    title: "Favoris",

    iconSrc: "/home/quick-actions/icon-favoris.png",

  },

  {

    href: "/recettes",

    title: "Recettes",

    iconSrc: "/home/quick-actions/icon-recettes.png",

  },

] as const;



export function HomeQuickActions() {

  return (

    <section className="grid grid-cols-2 gap-3">

      {ACTIONS.map((action) => (

        <Link

          key={action.href}

          href={action.href}

          className="relative flex min-h-[5.75rem] flex-col justify-between rounded-3xl border bg-white p-3.5 transition active:scale-[0.98]"

          style={{ borderColor: homeTheme.border, boxShadow: homeTheme.shadowSm }}

        >

          <div className="relative h-10 w-10 shrink-0" aria-hidden>

            <Image

              src={action.iconSrc}

              alt=""

              width={40}

              height={40}

              className="h-full w-full object-contain object-left-top"

              unoptimized

            />

          </div>

          <span className="pr-7 text-sm font-bold leading-tight" style={{ color: homeTheme.text }}>

            {action.title}

          </span>

          <span

            className="absolute bottom-3 right-3 flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold leading-none"

            style={{ backgroundColor: homeTheme.accentSoft, color: homeTheme.accent }}

            aria-hidden

          >

            ›

          </span>

        </Link>

      ))}

    </section>

  );

}

