"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getLocale, setLocale, type Locale, t } from "../src/lib/i18n";
import { loadPreferences } from "../src/lib/userPreferences";

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

  // Écouter les changements de localStorage pour synchroniser la langue
  useEffect(() => {
    const handleStorageChange = () => {
      const newLocale = getLocale();
      if (newLocale !== locale) {
        setLocaleState(newLocale);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Écouter les changements personnalisés (même fenêtre)
    const interval = setInterval(() => {
      const currentLocale = getLocale();
      if (currentLocale !== locale) {
        setLocaleState(currentLocale);
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
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

