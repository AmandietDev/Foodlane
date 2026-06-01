import type { Metadata } from "next";
import "./globals.css";
import { ThemeProviderWrapper } from "./providers/ThemeProviderWrapper";
import { TranslationProvider } from "./components/TranslationProvider";
import { PremiumProvider } from "./contexts/PremiumContext";
import BottomNavigation from "./components/BottomNavigation";
import AuthGuard from "./components/AuthGuard";
import SplashScreen from "./components/SplashScreen";
import EnvChecker from "./components/EnvChecker";
import RefgrowReferralHint from "./components/RefgrowReferralHint";
import RefgrowScriptLoader from "./components/RefgrowScriptLoader";
import CookieConsentBanner from "./components/CookieConsentBanner";
import SubscriptionUpsellGate from "./components/billing/SubscriptionUpsellGate";
import AdsenseLoader from "./components/ads/AdsenseLoader";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://foodlane.fr";
const ADSENSE_PUBLISHER_META =
  process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID?.trim() || "ca-pub-3828366277477392";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Foodlane | Menu semaine, liste de courses et assistant nutrition",
    template: "%s | Foodlane",
  },
  description:
    "Foodlane est l'assistant intelligent pour organiser tes repas : menu de la semaine automatique, liste de courses intelligente, nutrition simple, économies courses et moins de gaspillage alimentaire.",
  keywords: [
    "menu semaine",
    "menu de la semaine",
    "liste de courses",
    "planification repas",
    "organisation repas",
    "assistant nutrition",
    "assistant diététique",
    "meal planner",
    "menus équilibrés",
    "économies courses",
    "gaspillage alimentaire",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/",
    siteName: "Foodlane",
    title: "Foodlane | Organise tes repas et tes courses simplement",
    description:
      "Génère tes menus de semaine, crée une liste de courses intelligente et améliore ton alimentation avec un assistant nutrition.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Foodlane | Organise tes repas et tes courses simplement",
    description:
      "Menu de la semaine, planning repas, liste de courses et nutrition facile.",
  },
  other: {
    "google-adsense-account": ADSENSE_PUBLISHER_META,
  },
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
          <RefgrowScriptLoader projectId={refgrowProjectId} />
        ) : null}
        {refgrowProjectId ? <RefgrowReferralHint /> : null}
        <SplashScreen />
        <ThemeProviderWrapper>
          <TranslationProvider>
            <AuthGuard>
              <PremiumProvider>
                <SubscriptionUpsellGate />
                {/* Contenu : marge basse mobile (barre + pub) ; sur bureau, décalage pour le rail gauche */}
                <div className="min-h-screen pb-36 md:pb-10 md:pl-[var(--app-nav-rail-width)]">
                  {children}
                </div>

                {/* Zone fixe en bas : pub au-dessus de la barre d'onglets (mobile) */}
                <BottomNavigation />
              </PremiumProvider>
            </AuthGuard>
            <EnvChecker />
            <CookieConsentBanner />
          </TranslationProvider>
        </ThemeProviderWrapper>
      </body>
    </html>
  );
}

