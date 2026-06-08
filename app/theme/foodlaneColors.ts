/**
 * Palette Foodlane — source unique (alignée landing + app).
 * Pour le logo PNG : utiliser accent (#E94E77) et accentHover (#D63D56).
 */
export const foodlaneColors = {
  /** Rose principal (boutons, liens, accents) */
  accent: "#E94E77",
  /** Rose foncé (hover, états actifs) */
  accentHover: "#D63D56",
  /** Rose clair (highlights, secondaire) */
  accentLight: "#F9A8B4",
  /** Fonds rose très pâle */
  accentSoft: "#FFD9D9",
  accentSoftAlt: "#FFC4C4",
  /** Pastilles / tags */
  accentTag: "#FFE4E0",
  accentIconBg: "#FDECEC",
  /** Texte */
  text: "#6B2E2E",
  textLanding: "#3D2525",
  textMuted: "#7A5C5C",
  textLight: "#726566",
  /** Surfaces */
  page: "#FFFFFF",
  pageTint: "#FFF0F0",
  surface: "#FFFFFF",
  surfaceMuted: "#FFF8F6",
  assistantPanel: "#FEFAF9",
  /** Bordures */
  border: "#F0C4CC",
  borderStrong: "#E994AF",
  borderSubtle: "#F0E6E8",
  /** Ombres (rgba du rose principal) */
  shadow: "rgba(233, 78, 119, 0.1)",
  shadowSm: "rgba(233, 78, 119, 0.08)",
} as const;

export type FoodlaneColorKey = keyof typeof foodlaneColors;
