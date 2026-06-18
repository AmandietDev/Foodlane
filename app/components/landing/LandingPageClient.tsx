"use client";

import { Pacifico } from "next/font/google";
import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import RecipeImage from "../RecipeImage";
import AnimateIn from "./AnimateIn";
import LandingCarousel from "./LandingCarousel";
import LandingLegalModal, { type LegalDocKey } from "./LandingLegalModal";
import LandingContactModal from "./LandingContactModal";
import {
  FEATURES,
  NAV_ITEMS,
  TESTIMONIALS,
} from "./landingContent";
import { COMING_SOON_APP_STORE_HREF, COMING_SOON_GOOGLE_PLAY_HREF, INSTAGRAM_HREF, LOGIN_HREF, landingTheme } from "./landingTheme";
import {
  AppStoreBadge,
  GooglePlayBadge,
  HeartIcon,
  StarIcon,
} from "./LandingIcons";
import { LandingAssistantSection } from "./LandingAssistantSection";
import { LandingHeroSection } from "./LandingHero";
import {
  AccountButton,
  LandingLogo,
  PrimaryButton,
  SectionShell,
} from "./LandingShared";
import {
  recipeHasDisplayablePhoto,
  type LandingRecipe,
} from "../../src/lib/landingRecipes";

export type { LandingRecipe };

const pacifico = Pacifico({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const landingNavLinkClass =
  "text-[15px] font-bold text-[#1A1A1A] transition hover:text-[#E94E77]";

/** Défilement auto : avance d’un cran toutes les 4 s (entre 3 et 5 s). */
const CAROUSEL_AUTO_MS = 4000;
const CAROUSEL_VISIBLE_DESKTOP = 3;

function subscribeCarouselMq(onChange: () => void) {
  const mq = window.matchMedia("(min-width: 1024px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getCarouselVisibleCount(desktopCount: number) {
  return window.matchMedia("(min-width: 1024px)").matches ? desktopCount : 1;
}

function useCarouselVisibleCount(desktopCount: number) {
  return useSyncExternalStore(
    subscribeCarouselMq,
    () => getCarouselVisibleCount(desktopCount),
    () => 1
  );
}

type LandingPageClientProps = {
  recipes: LandingRecipe[];
};

export default function LandingPageClient({ recipes: recipesProp }: LandingPageClientProps) {
  const recipes = recipesProp.filter((r) => recipeHasDisplayablePhoto(r.image_url));
  const carouselVisible = useCarouselVisibleCount(CAROUSEL_VISIBLE_DESKTOP);
  const [menuOpen, setMenuOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocKey>(null);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="landing-page min-h-screen bg-white text-[#3D2525]">
      {/* ── Header desktop ── */}
      <header className="sticky top-0 z-50 hidden border-b border-[#F0E6E8] bg-white lg:block">
        <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-8 py-4">
          <LandingLogo wordmarkStyle={{ fontFamily: pacifico.style.fontFamily }} />
          <nav
            className="flex items-center justify-center gap-8"
            aria-label="Navigation principale"
          >
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href} className={landingNavLinkClass}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex justify-end">
            <AccountButton />
          </div>
        </div>
      </header>

      {/* ── Header mobile ── */}
      <header className="sticky top-0 z-50 border-b border-[#F0E6E8] bg-white lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <LandingLogo
            className="min-w-0"
            wordmarkStyle={{ fontFamily: pacifico.style.fontFamily }}
          />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[#3D2525]"
            aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <CloseIcon /> : <BurgerIcon />}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-[#F0E6E8] bg-white px-4 py-4 sm:px-6">
            <nav className="flex flex-col gap-3" aria-label="Navigation mobile">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-2 ${landingNavLinkClass}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <AccountButton className="mt-2 w-full text-center" />
            </nav>
          </div>
        ) : null}
      </header>

      <LandingHeroSection />

      {/* ── Fonctionnalités ── */}
      <SectionShell id="fonctionnalites">
        <AnimateIn>
          <FeaturesBand />
        </AnimateIn>
      </SectionShell>

      {/* ── Assistant IA ── */}
      <SectionShell id="assistant-ia">
        <LandingAssistantSection />
      </SectionShell>

      {/* ── Recettes ── */}
      <SectionShell id="recettes" className="!pb-20">
        <AnimateIn>
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-bold text-[#3D2525] lg:text-4xl">
                Des recettes pour chaque envie
              </h2>
              <p className="mt-2 text-[#7A5C5C]">Rapides, équilibrées et délicieuses.</p>
            </div>
            <Link
              href={LOGIN_HREF}
              className="inline-flex items-center justify-center gap-1 text-sm font-semibold text-[#E94E77] hover:underline lg:justify-end"
            >
              Voir toutes les recettes <span aria-hidden>→</span>
            </Link>
          </div>
        </AnimateIn>

        {recipes.length > 0 ? (
          <LandingCarousel
            itemCount={recipes.length}
            visibleCount={carouselVisible}
            autoMs={CAROUSEL_AUTO_MS}
            showDots
            compactControls
            className="mx-auto max-w-6xl px-10 lg:px-12"
            renderItem={(i) => {
              const r = recipes[i];
              if (!r) return null;
              return <RecipeCard recipe={r} />;
            }}
          />
        ) : (
          <p className="text-center text-sm text-[#7A5C5C]">
            Recettes bientôt disponibles.
          </p>
        )}
      </SectionShell>

      {/* ── Avis ── */}
      <SectionShell>
        <AnimateIn>
          <h2 className="mb-8 text-center text-3xl font-bold text-[#3D2525] lg:mb-10 lg:text-4xl">
            Ils ont adopté Foodlane
          </h2>
        </AnimateIn>
        <LandingCarousel
          itemCount={TESTIMONIALS.length}
          visibleCount={carouselVisible}
          autoMs={CAROUSEL_AUTO_MS}
          showDots
          compactControls
          className="mx-auto max-w-6xl px-10 lg:px-12"
          renderItem={(i) => {
            const t = TESTIMONIALS[i];
            if (!t) return null;
            return <TestimonialCard testimonial={t} />;
          }}
        />
      </SectionShell>

      {/* ── CTA final ── */}
      <SectionShell id="cta-final">
        <AnimateIn>
          <div
            className="rounded-[2rem] px-6 py-10 sm:px-8 lg:px-10"
            style={{ backgroundColor: landingTheme.assistantPanel }}
          >
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              <div className="shrink-0">
                <LandingLogo wordmarkStyle={{ fontFamily: pacifico.style.fontFamily }} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-bold text-[#3D2525] lg:text-3xl">
                  Prêt à transformer votre façon de manger ?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#7A5C5C] lg:text-base">
                  Rejoignez Foodlane et profitez d&apos;une alimentation équilibrée sans stress, chaque jour.
                </p>
                <div className="mt-5">
                  <PrimaryButton>Commencer gratuitement</PrimaryButton>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-3 lg:items-end">
                <div className="flex flex-wrap gap-3">
                  <AppStoreBadge href={COMING_SOON_APP_STORE_HREF} />
                  <GooglePlayBadge href={COMING_SOON_GOOGLE_PLAY_HREF} />
                </div>
              </div>
            </div>
          </div>
        </AnimateIn>
      </SectionShell>

      {/* ── Footer ── */}
      <footer className="border-t border-[#FFE4E0] bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <LandingLogo wordmarkStyle={{ fontFamily: pacifico.style.fontFamily }} />
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#7A5C5C] sm:gap-x-6" aria-label="Pied de page">
            <Link href="/mentions-legales" className="hover:text-[#E94E77]">
              Mentions légales
            </Link>
            <Link href="/contact" className="hover:text-[#E94E77]">
              Contact
            </Link>
            <Link href="/confidentialite" className="hover:text-[#E94E77]">
              Confidentialité
            </Link>
            <Link href="/cookies" className="hover:text-[#E94E77]">
              Cookies
            </Link>
            <Link href="/cgu" className="hover:text-[#E94E77]">
              CGU
            </Link>
            <Link href="/cgv" className="hover:text-[#E94E77]">
              CGV
            </Link>
          </nav>
          <a
            href={INSTAGRAM_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFECE8] text-[#E94E77] transition hover:bg-[#FFD9D9]"
            aria-label="Instagram"
          >
            <InstagramIcon />
          </a>
        </div>
        <p className="mx-auto mt-8 max-w-6xl text-center text-xs text-[#9A7A7A]">
          © {new Date().getFullYear()} Foodlane — Tous droits réservés.
        </p>
      </footer>

      <LandingLegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
      <LandingContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  );
}

function FeaturesBand() {
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_rgba(233,78,119,0.08)]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature, index) => (
          <FeatureColumn key={feature.title} feature={feature} index={index} />
        ))}
      </div>
    </article>
  );
}

function FeatureColumn({
  feature,
  index,
}: {
  feature: (typeof FEATURES)[number];
  index: number;
}) {
  return (
    <div
      className={`flex flex-col items-center px-5 py-10 text-center ${
        index < FEATURES.length - 1 ? "border-b border-[#F0E6E8]" : ""
      } sm:border-b-0 ${index % 2 === 0 && index < FEATURES.length - 1 ? "sm:border-r sm:border-[#F0E6E8]" : ""} ${
        index < 2 ? "sm:border-b sm:border-[#F0E6E8]" : ""
      } lg:border-b-0 ${index < FEATURES.length - 1 ? "lg:border-r lg:border-[#F0E6E8]" : ""}`}
    >
      <div
        className="mb-4 flex h-[6.25rem] w-[6.25rem] shrink-0 items-center justify-center overflow-visible"
        aria-hidden
      >
        <Image
          src={feature.iconSrc}
          alt=""
          width={100}
          height={100}
          className="max-h-full max-w-full object-contain origin-center"
          style={{ transform: `scale(${feature.iconScale})` }}
          unoptimized
        />
      </div>
      <h3 className="text-[15px] font-bold leading-snug text-[#1A1A1A]">{feature.title}</h3>
      <p className="mt-2 max-w-[200px] text-[13px] leading-relaxed text-[#1A1A1A]/85">
        {feature.description}
      </p>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: LandingRecipe }) {
  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(233,78,119,0.12)] transition hover:-translate-y-1 hover:shadow-[0_12px_36px_rgba(233,78,119,0.16)]">
      <div className="relative aspect-[4/3] w-full bg-[#FFECE8]">
        <RecipeImage
          imageUrl={recipe.image_url}
          alt={recipe.nom_recette || "Recette"}
          className="h-full w-full object-cover"
          sizes="(max-width: 1024px) 100vw, 25vw"
        />
      </div>
      <div className="p-4">
        <h3 className="line-clamp-2 min-h-[2.75rem] text-sm font-bold leading-snug text-[#3D2525]">
          {recipe.nom_recette}
        </h3>
        <div className="mt-3 flex items-center justify-between text-xs text-[#7A5C5C]">
          <span>
            {recipe.temps_preparation_min ?? "—"} min • {recipe.nombre_personnes ?? "—"} pers
          </span>
          <HeartIcon className="h-3.5 w-3.5 opacity-60" />
        </div>
      </div>
    </article>
  );
}

function TestimonialCard({ testimonial }: { testimonial: (typeof TESTIMONIALS)[number] }) {
  return (
    <article className="h-full rounded-3xl bg-white px-6 py-8 text-center shadow-[0_10px_40px_rgba(233,78,119,0.1)] transition hover:-translate-y-1 lg:px-8 lg:py-10">
      <div className="mx-auto h-16 w-16 overflow-hidden rounded-full ring-2 ring-[#FFE4E0]">
        <img
          src={testimonial.photo}
          alt={testimonial.name}
          width={64}
          height={64}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <p className="mt-3 text-sm font-semibold text-[#3D2525]">{testimonial.name}</p>
      <p className="text-xs text-[#9A7A7A]">{testimonial.city}</p>
      <div className="mt-2 flex justify-center gap-0.5">
        {Array.from({ length: 5 }).map((_, s) => (
          <StarIcon key={s} className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
        ))}
      </div>
      <blockquote className="mt-4 text-sm leading-relaxed text-[#5C4040] lg:text-base">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>
    </article>
  );
}

function BurgerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.9.3 2.4.5.6.2 1 .5 1.5 1s.7.9 1 1.5c.2.5.4 1.2.5 2.4.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.9-.5 2.4-.2.6-.5 1-1 1.5s-.9.7-1.5 1c-.5.2-1.2.4-2.4.5-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.3-2.4-.5-.6-.2-1-.5-1.5-1s-.7-.9-1-1.5c-.2-.5-.4-1.2-.5-2.4C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.9.5-2.4.2-.6.5-1 1-1.5s.9-.7 1.5-1c.5-.2 1.2-.4 2.4-.5C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1 .1-1.6.2-2 .4-.5.2-.9.4-1.2.7s-.5.7-.7 1.2c-.2.4-.3 1-.4 2-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1 .2 1.6.4 2 .2.5.4.9.7 1.2s.7.5 1.2.7c.4.2 1 .3 2 .4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1-.1 1.6-.2 2-.4.5-.2.9-.4 1.2-.7s.5-.7.7-1.2c.2-.4.3-1 .4-2 .1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1-.2-1.6-.4-2-.2-.5-.4-.9-.7-1.2s-.7-.5-1.2-.7c-.4-.2-1-.3-2-.4-1.2-.1-1.6-.1-4.7-.1zm0 3.4a4.6 4.6 0 100 9.2 4.6 4.6 0 000-9.2zm0 1.8a2.8 2.8 0 110 5.6 2.8 2.8 0 010-5.6zm5.2-3.6a1.1 1.1 0 100 2.2 1.1 1.1 0 000-2.2z" />
    </svg>
  );
}
