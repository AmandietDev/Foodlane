import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Abonnements — Foodlane",
  description:
    "Compare les formules Gratuit, Premium et Premium Plus : menus, liste de courses, assistant nutrition, exports et plus encore.",
};

export default function PremiumLayout({ children }: { children: React.ReactNode }) {
  return children;
}
