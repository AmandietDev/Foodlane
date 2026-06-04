import Image from "next/image";
import AnimateIn from "./AnimateIn";
import { AppStoreBadge, GooglePlayBadge } from "./LandingIcons";
import { PrimaryButton, OutlineButton } from "./LandingShared";
import { COMING_SOON_APP_STORE_HREF, COMING_SOON_GOOGLE_PLAY_HREF } from "./landingTheme";

const HERO_IMAGE = {
  src: "/landing-hero-reference@2x.png",
  width: 972,
  height: 1188,
  displayWidth: 486,
} as const;

export function LandingHeroSection() {
  return (
    <section id="apropos" className="relative overflow-hidden bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-14 pt-6 sm:px-6 lg:grid-cols-[45fr_55fr] lg:gap-10 lg:px-8 lg:pb-20 lg:pt-14">
        <AnimateIn>
          <h1 className="text-[2rem] font-bold leading-[1.1] tracking-tight text-[#3D2525] sm:text-[2.75rem] lg:text-[3.25rem] xl:text-[3.75rem]">
            Simplifiez
            <br />
            vos repas,
            <br />
            <span className="relative inline-block text-[#E94E77]">
              gagnez du temps.
              <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 310 8" fill="none" aria-hidden>
                <path d="M2 6C80 2 200 1 308 6" stroke="#E94E77" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
              </svg>
            </span>
          </h1>

          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[#7A5C5C] sm:mt-6 sm:text-base">
            Générez vos menus, vos recettes et votre liste de courses en quelques clics, avec un{" "}
            <span className="font-semibold text-[#E94E77]">assistant diététicien IA</span> à vos
            côtés.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
            <PrimaryButton className="inline-flex items-center justify-center gap-2 sm:shadow-lg sm:shadow-[#E94E77]/25">
              <SparkleIcon />
              Commencer gratuitement
            </PrimaryButton>
            <OutlineButton href="#fonctionnalites" className="inline-flex items-center justify-center gap-2">
              <PlayCircleIcon />
              Découvrir l&apos;app
            </OutlineButton>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 sm:mt-6">
            <AppStoreBadge href={COMING_SOON_APP_STORE_HREF} />
            <GooglePlayBadge href={COMING_SOON_GOOGLE_PLAY_HREF} />
          </div>
        </AnimateIn>

        <AnimateIn delay={0.15} className="relative flex justify-center lg:justify-end">
          <HeroPhonesVisual />
        </AnimateIn>
      </div>
    </section>
  );
}

function HeroPhonesVisual() {
  return (
    <figure className="relative w-full" style={{ maxWidth: HERO_IMAGE.displayWidth }}>
      <Image
        src={HERO_IMAGE.src}
        alt="Aperçu Foodlane sur iPhone : génération de menus et recettes"
        width={HERO_IMAGE.width}
        height={HERO_IMAGE.height}
        priority
        unoptimized
        className="h-auto w-full object-contain"
        sizes={`(min-width: 1024px) ${HERO_IMAGE.displayWidth}px, min(100vw - 2rem, ${HERO_IMAGE.displayWidth}px)`}
      />
    </figure>
  );
}

function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l2.4 7.2H22l-6.2 4.5 2.4 7.2L12 16.4l-6.2 4.5 2.4-7.2L2 9.2h7.6z" />
    </svg>
  );
}

function PlayCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polygon points="10,8 16,12 10,16" fill="currentColor" stroke="none" />
    </svg>
  );
}
