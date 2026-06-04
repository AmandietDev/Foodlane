"use client";

import { Pacifico } from "next/font/google";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { LandingLogo, OutlineButton } from "../components/landing/LandingShared";
import { LOGIN_HREF } from "../components/landing/landingTheme";

const pacifico = Pacifico({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const landingLogoStyle = { fontFamily: pacifico.style.fontFamily };

type FormStatus = "idle" | "loading" | "success" | "error";

function storeSource(param: string | null): string {
  if (param === "app-store") return "app_store";
  if (param === "google-play") return "google_play";
  return "coming_soon";
}

function storeHeadline(param: string | null): string {
  if (param === "app-store") {
    return "L'application Foodlane sera bientôt disponible sur l'App Store.";
  }
  if (param === "google-play") {
    return "L'application Foodlane sera bientôt disponible sur Google Play.";
  }
  return "L'application Foodlane sera bientôt disponible sur l'App Store et Google Play.";
}

function ComingSoonContent() {
  const searchParams = useSearchParams();
  const store = searchParams.get("store");
  const source = storeSource(store);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/app-launch-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      const data = (await res.json()) as { message?: string; error?: string };

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Une erreur est survenue.");
        return;
      }

      setStatus("success");
      setMessage(data.message || "Merci ! Tu seras alerté(e) dès la mise en ligne.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Erreur réseau. Vérifie ta connexion et réessaie.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-16 text-[#3D2525]">
      <LandingLogo
        className="mb-10 justify-center"
        wordmarkStyle={landingLogoStyle}
      />
      <div className="mx-auto w-full max-w-lg text-center">
        <h1 className="text-2xl font-bold text-[#3D2525] sm:text-3xl">{storeHeadline(store)}</h1>
        <p className="mt-5 text-base leading-relaxed text-[#7A5C5C]">
          La publication mobile est en cours de finalisation. En attendant, tu peux déjà utiliser
          Foodlane depuis ton navigateur.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 opacity-90" aria-hidden>
          <span className="inline-flex h-12 cursor-default items-center gap-2 rounded-xl bg-black px-4 text-white opacity-80">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white" aria-hidden>
              <path d="M18.7 12.5c-.1-2.1 1.7-3.1 1.8-3.2-1-.1-2-.6-2.5-1.4-.6-.8-1.5-1.2-2.4-1.2-1 0-2 .6-2.5.6s-1.3-.6-2.2-.6c-1.1 0-2.2.7-2.8 1.7-1.2 2.1-.3 5.2.8 6.9.6.8 1.2 1.7 2.1 1.7.8 0 1.1-.5 2.2-.5 1 0 1.3.5 2.2.5.9 0 1.5-.8 2.1-1.6.7-.9 1-1.9 1-1.9-.1 0-2-.8-2-3.1zM15.5 4.2c.5-.6.9-1.5.8-2.3-.8 0-1.7.5-2.2 1.1-.5.6-1 1.5-.9 2.3.9.1 1.8-.5 2.3-1.1z" />
            </svg>
            <div className="text-left leading-tight">
              <div className="text-[9px] opacity-80">Bientôt sur</div>
              <div className="text-sm font-semibold">App Store</div>
            </div>
          </span>
          <span className="inline-flex h-12 cursor-default items-center gap-2 rounded-xl bg-black px-4 text-white opacity-80">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
              <path fill="#00D9FF" d="M3 2.5v19l10.5-9.5L3 2.5z" />
              <path fill="#00F076" d="M13.5 12 3 21.5l14.5-8.5L13.5 12z" />
              <path fill="#FF3A44" d="M3 2.5l10.5 9.5L17.5 8 3 2.5z" />
              <path fill="#FFB900" d="M13.5 12 17.5 16 21 12.5 17.5 8 13.5 12z" />
            </svg>
            <div className="text-left leading-tight">
              <div className="text-[9px] opacity-80">Bientôt sur</div>
              <div className="text-sm font-semibold">Google Play</div>
            </div>
          </span>
        </div>

        <div className="mt-10 rounded-2xl border border-[#F0E6E8] bg-[#FFF5F5] p-6 text-left shadow-sm">
          <h2 className="text-center text-lg font-bold text-[#3D2525]">
            Être alerté(e) de la mise en ligne
          </h2>
          <p className="mt-2 text-center text-sm leading-relaxed text-[#7A5C5C]">
            Laisse ton e-mail : nous t&apos;enverrons un message dès que l&apos;app sera
            téléchargeable.
          </p>
          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <label htmlFor="launch-email" className="sr-only">
              Adresse e-mail
            </label>
            <input
              id="launch-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status !== "idle") setStatus("idle");
              }}
              placeholder="ton@email.fr"
              disabled={status === "loading"}
              className="w-full rounded-xl border border-[#E8D4D4] bg-white px-4 py-3 text-sm text-[#3D2525] outline-none transition focus:border-[#E94E77] focus:ring-2 focus:ring-[#E94E77]/20 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={status === "loading" || !email.trim()}
              className="w-full rounded-full bg-[#E94E77] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#E94E77]/20 transition hover:bg-[#D63D56] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? "Inscription…" : "M'alerter de la mise en ligne"}
            </button>
          </form>
          {status === "success" ? (
            <p className="mt-3 text-center text-sm font-medium text-[#2D7A4E]" role="status">
              {message}
            </p>
          ) : null}
          {status === "error" ? (
            <p className="mt-3 text-center text-sm text-[#B42318]" role="alert">
              {message}
            </p>
          ) : null}
          <p className="mt-4 text-center text-[11px] leading-relaxed text-[#9A7A7A]">
            Un seul e-mail lors de la mise en ligne. Pas de newsletter. Tu peux te désinscrire en
            nous contactant.
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4">
          <OutlineButton href={LOGIN_HREF} className="min-w-[220px] justify-center">
            Accéder à la page de connexion
          </OutlineButton>
          <Link href="/" className="text-sm font-medium text-[#E94E77] hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ComingSoonPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white text-[#7A5C5C]">
          <LandingLogo className="justify-center" wordmarkStyle={landingLogoStyle} />
          Chargement…
        </div>
      }
    >
      <ComingSoonContent />
    </Suspense>
  );
}
