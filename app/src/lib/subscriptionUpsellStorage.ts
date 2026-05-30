const SIGNUP_PENDING_KEY = "foodlane_upsell_after_signup";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function weekKey(userId: string) {
  return `foodlane_upsell_week_${userId}`;
}

export function markSignupUpsellPending(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(SIGNUP_PENDING_KEY, "1");
}

export function consumeSignupUpsellPending(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  if (sessionStorage.getItem(SIGNUP_PENDING_KEY) !== "1") return false;
  sessionStorage.removeItem(SIGNUP_PENDING_KEY);
  return true;
}

export function shouldShowWeeklyUpsell(userId: string): boolean {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(weekKey(userId));
  if (!raw) return true;
  const t = Number(raw);
  return !Number.isFinite(t) || Date.now() - t >= WEEK_MS;
}

export function markWeeklyUpsellShown(userId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(weekKey(userId), String(Date.now()));
}
