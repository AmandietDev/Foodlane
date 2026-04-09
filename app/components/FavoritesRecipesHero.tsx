"use client";

import Image from "next/image";
import Link from "next/link";

type Props = {
  /** Si false, affichage décoratif sans lien (ex. page favoris déjà ouverte). */
  linkable?: boolean;
  href?: string;
  /** Titre + sous-titre sous la photo (comme la carte « Mes préférences » du tableau). */
  caption?: boolean;
  title?: string;
  subtitle?: string;
  heightClass?: string;
  className?: string;
};

/**
 * Visuel « Recettes favorites » (photo + texte optionnel).
 */
export default function FavoritesRecipesHero({
  linkable = true,
  href = "/favoris",
  caption = true,
  title = "Recettes favorites",
  subtitle = "Ton carnet, collections et idées aimées…",
  heightClass = "h-40",
  className = "",
}: Props) {
  const inner = (
    <>
      <div className={`relative w-full overflow-hidden bg-white ${heightClass}`}>
        <Image
          src="/favorites-recipes-hero-02b30ddf.png"
          alt=""
          fill
          className="object-cover object-center"
          sizes="(max-width: 512px) 100vw, 512px"
        />
      </div>
      {caption ? (
        <div className="bg-white p-4 text-center border-t border-[#F0E0E0]">
          <span className="text-lg block mb-1" aria-hidden>
            ❤️
          </span>
          <div className="font-semibold text-[#4a2c2c]">{title}</div>
          <p className="text-xs text-[#7a5a5a] mt-1 leading-snug">{subtitle}</p>
        </div>
      ) : null}
    </>
  );

  const boxClass = `rounded-2xl border border-[#E8A0A0] overflow-hidden shadow-sm bg-white ${linkable ? "hover:shadow-md transition-shadow block" : ""} ${className}`;

  if (linkable) {
    return (
      <Link
        href={href}
        className={boxClass}
        aria-label="Recettes favorites — ouvrir mon carnet"
      >
        {inner}
      </Link>
    );
  }

  return <div className={boxClass}>{inner}</div>;
}
