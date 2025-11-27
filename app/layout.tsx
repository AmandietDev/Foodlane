import type { Metadata } from "next";
import "./globals.css";
import { ThemeProviderWrapper } from "./providers/ThemeProviderWrapper";
import { TranslationProvider } from "./components/TranslationProvider";
import BottomNavigation from "./components/BottomNavigation";
import AuthGuard from "./components/AuthGuard";
import SplashScreen from "./components/SplashScreen";

export const metadata: Metadata = {
  title: "Foodlane",
  description: "Ta diététicienne privée t'accompagne à équilibrer tes repas et faciliter ton organisation. Trouve des recettes avec ce que tu as déjà, ou crée un menu et génère ta liste de courses.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <SplashScreen />
        <ThemeProviderWrapper>
          <TranslationProvider>
            <AuthGuard>
              {/* Contenu principal avec marge en bas pour ne pas passer sous la barre */}
              <div className="min-h-screen pb-32">
                {children}
              </div>

              {/* Zone fixe en bas : barre d'onglets + pub sous les onglets */}
              <BottomNavigation />
            </AuthGuard>
          </TranslationProvider>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}

