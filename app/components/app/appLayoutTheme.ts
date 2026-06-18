/** Fond rose unifié + tokens pages app connectée */
export const appLayoutTheme = {
  pageBg: "#FFF9F5",
  pageBgDeep: "#FFF0F3",
  cardPink: "#FFF0F3",
  cardPinkBorder: "#F5DDE5",
  text: "#4A2C2A",
  textMuted: "#8A6F6F",
  accent: "#E94E77",
  accentSoft: "#FFE8EE",
  shadow: "0 4px 20px rgba(233, 78, 119, 0.08)",
} as const;

/** Padding bas mobile = hauteur nav (sans double marge page). */
export const APP_MOBILE_BOTTOM = "calc(3.75rem + env(safe-area-inset-bottom, 0px))";
