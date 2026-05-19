import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProviderWrapper } from "./providers/ThemeProviderWrapper";
import { TranslationProvider } from "./components/TranslationProvider";
import { PremiumProvider } from "./contexts/PremiumContext";
import BottomNavigation from "./components/BottomNavigation";
import AuthGuard from "./components/AuthGuard";
import SplashScreen from "./components/SplashScreen";
import EnvChecker from "./components/EnvChecker";
import RefgrowReferralHint from "./components/RefgrowReferralHint";

export const metadata: Metadata = {
  title: "Foodlane",
  description: "Ta diététicienne privée t'accompagne à équilibrer tes repas et faciliter ton organisation. Trouve des recettes avec ce que tu as déjà, ou crée un menu et génère ta liste de courses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const refgrowProjectId = process.env.NEXT_PUBLIC_REFGRROW_PROJECT_ID?.trim();

  return (
    <html lang="fr">
      <body>
        {refgrowProjectId ? (
          <Script
            src="https://scripts.refgrowcdn.com/latest.js"
            data-project-id={refgrowProjectId}
            strategy="afterInteractive"
          />
        ) : null}
        {refgrowProjectId ? <RefgrowReferralHint /> : null}
        <SplashScreen />
        <ThemeProviderWrapper>
          <TranslationProvider>
            <AuthGuard>
              <PremiumProvider>
                {/* Contenu : marge basse mobile (barre + pub) ; sur bureau, décalage pour le rail gauche */}
                <div className="min-h-screen pb-36 md:pb-10 md:pl-[var(--app-nav-rail-width)]">
                  {children}
                </div>

                {/* Zone fixe en bas : barre d'onglets + pub sous les onglets */}
                <BottomNavigation />
              </PremiumProvider>
            </AuthGuard>
            <EnvChecker />
          </TranslationProvider>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}

