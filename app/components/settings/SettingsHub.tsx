"use client";

import Image from "next/image";
import Link from "next/link";
import { appLayoutTheme } from "../app/appLayoutTheme";

type SettingsHubProps = {
  displayName: string;
  email: string;
  isPremium: boolean;
  subscriptionLabel: string;
  notificationsEnabled: boolean;
  themeLabel: string;
  languageLabel: string;
  onOpenNotifications: () => void;
  onOpenFoyer: () => void;
  onOpenParametres: () => void;
  onOpenAbonnement: () => void;
  onOpenAide: () => void;
  onOpenApropos: () => void;
  onOpenConfidentialite: () => void;
  onToggleNotifications: (enabled: boolean) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
};

function SettingsRow({
  icon,
  iconBg,
  title,
  subtitle,
  onClick,
  href,
  danger,
  trailing,
}: {
  icon: string;
  iconBg: string;
  title: string;
  subtitle: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  trailing?: React.ReactNode;
}) {
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#FFF8FA]">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
        style={{ backgroundColor: iconBg }}
        aria-hidden
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${danger ? "text-red-600" : "text-[#4A2C2A]"}`}>{title}</p>
        <p className="text-[11px] leading-snug text-[#8A6F6F]">{subtitle}</p>
      </div>
      {trailing ?? (
        <span className={`text-lg ${danger ? "text-red-400" : "text-[#C9A8B0]"}`} aria-hidden>
          ›
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block border-t border-[#F5E8ED] first:border-t-0">
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="block w-full border-t border-[#F5E8ED] text-left first:border-t-0">
      {inner}
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 px-1 text-sm font-bold text-[#4A2C2A]">{title}</h2>
      <div
        className="overflow-hidden rounded-[1.5rem]"
        style={{
          backgroundColor: appLayoutTheme.cardPink,
          boxShadow: appLayoutTheme.shadow,
          border: `1px solid ${appLayoutTheme.cardPinkBorder}`,
        }}
      >
        {children}
      </div>
    </section>
  );
}

export function SettingsHub({
  displayName,
  email,
  isPremium,
  subscriptionLabel,
  notificationsEnabled,
  themeLabel,
  languageLabel,
  onOpenNotifications,
  onOpenFoyer,
  onOpenParametres,
  onOpenAbonnement,
  onOpenAide,
  onOpenApropos,
  onOpenConfidentialite,
  onToggleNotifications,
  onLogout,
  onDeleteAccount,
}: SettingsHubProps) {
  return (
    <div className="space-y-5 pb-2">
      <header className="flex items-start justify-between gap-3 px-1">
        <div>
          <h1 className="text-2xl font-bold text-[#4A2C2A]">Réglages</h1>
          <p className="mt-1 text-sm text-[#8A6F6F]">Gère ton compte, tes préférences et l&apos;app.</p>
        </div>
        <Link
          href="/compte"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#F5DDE5] bg-[#FFF0F3] text-[#E94E77]"
          aria-label="Mon profil"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
            <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </Link>
      </header>

      <div
        className="overflow-hidden rounded-[1.75rem] p-4"
        style={{
          background: "linear-gradient(135deg, #FFF0F3 0%, #FFE8EE 100%)",
          border: `1px solid ${appLayoutTheme.cardPinkBorder}`,
          boxShadow: appLayoutTheme.shadow,
        }}
      >
        <div className="flex gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#FFE4EC]">
            <Image src="/equilibre/assistant-raspberry-mascot.png" alt="" fill className="object-contain p-1" unoptimized />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-[#4A2C2A]">{displayName}</p>
            <p className="truncate text-xs text-[#8A6F6F]">{email}</p>
            <Link
              href="/compte"
              className="mt-2 inline-flex rounded-full border border-[#E94E77] bg-white/70 px-3 py-1 text-[11px] font-semibold text-[#E94E77]"
            >
              Modifier mon profil ›
            </Link>
          </div>
          <button
            type="button"
            onClick={onOpenAbonnement}
            className="w-[7.5rem] shrink-0 border-l border-[#F5DDE5] pl-3 text-left"
          >
            <p className="text-xs font-bold text-[#4A2C2A]">
              {isPremium ? "Foodlane Plus 👑" : "Passer Premium"}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-[#8A6F6F]">
              {isPremium ? "Profite de toutes les fonctionnalités" : "Débloque l'assistant et plus"}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#FFE4EC]">
              <div className="h-full rounded-full bg-[#E94E77]" style={{ width: isPremium ? "88%" : "24%" }} />
            </div>
            <p className={`mt-1 text-[10px] font-semibold ${isPremium ? "text-emerald-600" : "text-[#E94E77]"}`}>
              {subscriptionLabel} ›
            </p>
          </button>
        </div>
      </div>

      <SectionCard title="Préférences et contenu">
        <SettingsRow icon="🍴" iconBg="#FFE8EE" title="Préférences alimentaires" subtitle="Régimes, goûts, intolérances, allergies…" href="/preferences" />
        <SettingsRow icon="🧺" iconBg="#E8F8EE" title="Foyer et organisation" subtitle="Nombre de personnes, budget, équipements…" onClick={onOpenFoyer} />
        <SettingsRow icon="🔖" iconBg="#FFF4DC" title="Favoris et collections" subtitle="Organise tes recettes préférées" href="/favoris" />
      </SectionCard>

      <SectionCard title="Application">
        <SettingsRow
          icon="🔔"
          iconBg="#FFE8EE"
          title="Notifications"
          subtitle="Gère les rappels et alertes"
          onClick={onOpenNotifications}
          trailing={
            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              onClick={(e) => {
                e.stopPropagation();
                onToggleNotifications(!notificationsEnabled);
              }}
              className={`relative h-6 w-11 rounded-full transition ${notificationsEnabled ? "bg-[#E94E77]" : "bg-[#E8D5D5]"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${notificationsEnabled ? "left-5" : "left-0.5"}`}
              />
            </button>
          }
        />
        <SettingsRow icon="🌙" iconBg="#FFE8EE" title="Thème" subtitle={themeLabel} onClick={onOpenParametres} />
        <SettingsRow icon="🌍" iconBg="#E8F8EE" title="Langue" subtitle={languageLabel} onClick={onOpenParametres} />
        <SettingsRow icon="💬" iconBg="#FFF4DC" title="Aide et support" subtitle="FAQ, contacter le support" onClick={onOpenAide} />
        <SettingsRow icon="ℹ️" iconBg="#F5F5F5" title="À propos de Foodlane" subtitle="Version 1.0.0" onClick={onOpenApropos} />
      </SectionCard>

      <section>
        <h2 className="mb-2.5 px-1 text-sm font-bold text-[#4A2C2A]">Compte</h2>
        <div className="flex gap-3">
          <div
            className="min-w-0 flex-1 overflow-hidden rounded-[1.5rem]"
            style={{
              backgroundColor: appLayoutTheme.cardPink,
              border: `1px solid ${appLayoutTheme.cardPinkBorder}`,
              boxShadow: appLayoutTheme.shadow,
            }}
          >
            <SettingsRow icon="🛡️" iconBg="#E8F8EE" title="Sécurité et confidentialité" subtitle="Mot de passe, données, confidentialité" onClick={onOpenConfidentialite} />
            <SettingsRow icon="🚪" iconBg="#FFE8DC" title="Se déconnecter" subtitle="Quitter ton compte" onClick={onLogout} />
            <SettingsRow icon="🗑️" iconBg="#FFE8EE" title="Supprimer mon compte" subtitle="Cette action est irréversible" onClick={onDeleteAccount} danger />
          </div>
          <div className="relative hidden w-24 shrink-0 sm:block" aria-hidden>
            <Image
              src="/equilibre/assistant-raspberry-mascot.png"
              alt=""
              width={96}
              height={120}
              className="h-full w-full object-contain object-bottom drop-shadow-[0_4px_12px_rgba(233,78,119,0.2)]"
              unoptimized
            />
          </div>
        </div>
      </section>
    </div>
  );
}
