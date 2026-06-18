import { LANDING_PAGES } from "./seo";

/** Pages légales accessibles sans connexion (crawlables par Google AdSense). */
export const LEGAL_PUBLIC_PATHS = [
  "/mentions-legales",
  "/confidentialite",
  "/cookies",
  "/cgu",
  "/cgv",
  "/contact",
] as const;

const LANDING_SLUG_PATHS = LANDING_PAGES.map((p) => `/${p.slug}`);

/** Chemins accessibles sans authentification. */
export const PUBLIC_PATHS: readonly string[] = [
  "/",
  "/coming-soon",
  "/compte",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/blog",
  "/organise-repas",
  ...LANDING_SLUG_PATHS,
  ...LEGAL_PUBLIC_PATHS,
];

export function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/blog/")) return true;
  return PUBLIC_PATHS.includes(pathname);
}

/** Pages marketing / SEO sans navigation applicative ni publicité. */
export function isMarketingPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/" || pathname === "/coming-soon" || pathname === "/organise-repas") return true;
  if (pathname.startsWith("/blog")) return true;
  if ((LEGAL_PUBLIC_PATHS as readonly string[]).includes(pathname)) return true;
  return LANDING_SLUG_PATHS.includes(pathname);
}

/**
 * Emplacements AdSense autorisés : pages applicatives avec contenu éditorial,
 * pas les landings SEO ni le blog (contenu trop mince pour la monétisation).
 */
export function isAdPlacementAllowed(pathname: string | null): boolean {
  if (!pathname || isMarketingPublicPath(pathname)) return false;
  const allowedPrefixes = [
    "/tableau",
    "/recettes",
    "/equilibre",
    "/menu",
    "/planifier",
    "/menu-semaine",
    "/favoris",
    "/premium",
    "/preferences",
    "/ressources",
    "/menus",
    "/recette",
  ];
  return allowedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
