"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePremium } from "../../contexts/PremiumContext";
import { useSupabaseSession } from "../../hooks/useSupabaseSession";
import {
  consumeSignupUpsellPending,
  markWeeklyUpsellShown,
  shouldShowWeeklyUpsell,
} from "../../src/lib/subscriptionUpsellStorage";
import SubscriptionUpsellModal from "./SubscriptionUpsellModal";

const BLOCKED_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/premium",
  "/billing",
];

function isBlockedPath(pathname: string): boolean {
  return BLOCKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export default function SubscriptionUpsellGate() {
  const pathname = usePathname();
  const { user } = useSupabaseSession();
  const { isPremium, loading } = usePremium();
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<"signup" | "weekly">("weekly");

  useEffect(() => {
    if (loading || !user || isPremium) return;
    if (isBlockedPath(pathname)) return;

    const afterSignup = consumeSignupUpsellPending();
    if (afterSignup) {
      setVariant("signup");
      const t = setTimeout(() => setOpen(true), 350);
      return () => clearTimeout(t);
    }

    if (pathname === "/onboarding") return;

    if (shouldShowWeeklyUpsell(user.id)) {
      setVariant("weekly");
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [user, isPremium, loading, pathname]);

  const handleClose = () => {
    if (user) markWeeklyUpsellShown(user.id);
    setOpen(false);
  };

  return <SubscriptionUpsellModal open={open} onClose={handleClose} variant={variant} />;
}
