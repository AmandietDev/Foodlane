import type { Locale } from "./i18n";

const NAMES: Record<Locale, string> = {
  fr: "French",
  en: "English",
  es: "Spanish",
  de: "German",
};

/** Consigne courte pour que les sorties IA restent dans la langue de l’interface. */
export function aiOutputLanguageDirective(locale: Locale): string {
  if (locale === "fr") {
    return "Tout texte libre destiné à l’utilisateur doit être en français.";
  }
  return `All user-facing free text in your response must be in ${NAMES[locale]}.`;
}
