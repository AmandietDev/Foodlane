"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getLocale, setLocale, type Locale, t } from "../src/lib/i18n";

interface TranslationContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined
);

export function TranslationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    // Charger la langue depuis localStorage ou les préférences utilisateur
    const savedLocale = getLocale();
    setLocaleState(savedLocale);
    setLocale(savedLocale);
  }, []);

  // Écouter les changements de localStorage (autres onglets) et le retour sur la fenêtre
  useEffect(() => {
    const handleStorageChange = () => {
      const newLocale = getLocale();
      if (newLocale !== locale) {
        setLocaleState(newLocale);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    const onFocus = () => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) {
        setLocaleState(currentLocale);
      }
    };
    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [locale]);

  const handleSetLocale = (newLocale: Locale) => {
    setLocale(newLocale);
    setLocaleState(newLocale);
    // Recharger la page pour appliquer les traductions
    window.location.reload();
  };

  return (
    <TranslationContext.Provider
      value={{ locale, setLocale: handleSetLocale, t }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
}

