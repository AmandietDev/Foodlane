/** Tokens visuels alignés sur la maquette landing Foodlane */
import { foodlaneColors } from "../../theme/foodlaneColors";

export const landingTheme = {
  page: foodlaneColors.page,
  featuresCard: foodlaneColors.surface,
  iconCircle: foodlaneColors.accentIconBg,
  cream: foodlaneColors.page,
  pinkSection: foodlaneColors.page,
  assistantPanel: foodlaneColors.assistantPanel,
  pinkSoft: foodlaneColors.accentSoft,
  pinkTag: foodlaneColors.accentTag,
  accent: foodlaneColors.accent,
  accentHover: foodlaneColors.accentHover,
  accentLight: foodlaneColors.accentLight,
  text: foodlaneColors.textLanding,
  textMuted: foodlaneColors.textMuted,
  card: foodlaneColors.surface,
  cardShadow: `0 10px 40px ${foodlaneColors.shadow}`,
  cardShadowSm: `0 4px 20px ${foodlaneColors.shadowSm}`,
  radiusCard: "1.5rem",
  radiusBtn: "9999px",
} as const;

export const LOGIN_HREF = "/login";
export const SIGNUP_HREF = "/login?mode=signup";
export const COMING_SOON_HREF = "/coming-soon";
export const COMING_SOON_APP_STORE_HREF = "/coming-soon?store=app-store";
export const COMING_SOON_GOOGLE_PLAY_HREF = "/coming-soon?store=google-play";
export const INSTAGRAM_HREF =
  "https://www.instagram.com/foodlane_app?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==";
