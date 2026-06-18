import type { Metadata } from "next";

import { LegalPageView } from "../components/legal/LegalPageView";

export const metadata: Metadata = {
  title: "Politique de cookies",
  description:
    "Politique de cookies Foodlane : types de cookies, Google AdSense, gestion du consentement.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return <LegalPageView doc="cookies" />;
}
