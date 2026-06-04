import type { Metadata } from "next";
import ComingSoonPageClient from "./ComingSoonPageClient";

export const metadata: Metadata = {
  title: "Bientôt sur l'App Store et Google Play",
  description:
    "Foodlane arrive bientôt sur l'App Store et Google Play. Inscris-toi pour être alerté(e) de la mise en ligne.",
  robots: { index: true, follow: true },
};

export default function ComingSoonPage() {
  return <ComingSoonPageClient />;
}
