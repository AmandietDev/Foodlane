"use client";

import { useState } from "react";
import { useTranslation } from "./TranslationProvider";
import { getLocale } from "../src/lib/i18n";

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="text-left">
      <span className="block text-xs text-[var(--text-secondary)] mb-1">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-lg text-sm font-semibold border transition-colors ${
              value >= n
                ? "bg-[#E94E77] border-[#E94E77] text-white"
                : "bg-white border-[var(--beige-border)] text-[var(--foreground)]"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function UserFeedback() {
  const { t } = useTranslation();
  const [satisfaction, setSatisfaction] = useState(0);
  const [ease, setEase] = useState(0);
  const [recommend, setRecommend] = useState(0);
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (comment.trim().length < 5) {
      setError(t("feedback.error.short"));
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: comment.trim(),
          satisfaction: satisfaction || undefined,
          ease: ease || undefined,
          recommend: recommend || undefined,
          email: email.trim() || undefined,
          locale: getLocale(),
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || t("feedback.error.send"));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("feedback.error.send"));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4 text-center">
        <p className="text-sm text-[var(--foreground)] font-semibold">{t("feedback.thanks.title")}</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">{t("feedback.thanks.desc")}</p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-[var(--beige-card)] border border-[var(--beige-border)] px-4 py-4">
      <p className="text-sm text-[var(--foreground)] mb-1 font-semibold text-center">{t("feedback.title")}</p>
      <p className="text-xs text-[var(--text-secondary)] mb-3 text-center">{t("feedback.subtitle")}</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <StarRow label={t("feedback.stars.satisfaction")} value={satisfaction} onChange={setSatisfaction} />
        <StarRow label={t("feedback.stars.ease")} value={ease} onChange={setEase} />
        <StarRow label={t("feedback.stars.recommend")} value={recommend} onChange={setRecommend} />
        <div>
          <label className="block text-xs text-[var(--beige-text-muted)] mb-1">{t("feedback.comment")}</label>
          <textarea
            required
            className="w-full rounded-xl border border-[var(--beige-border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] min-h-[88px]"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("feedback.comment.placeholder")}
            maxLength={4000}
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--beige-text-muted)] mb-1">{t("feedback.email_optional")}</label>
          <input
            type="email"
            className="w-full rounded-xl border border-[var(--beige-border)] bg-white px-3 py-2 text-sm text-[var(--foreground)]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemple.com"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={sending}
          className="w-full px-4 py-2 rounded-xl bg-[#E94E77] hover:bg-[#D63D56] text-white text-xs font-semibold transition-colors disabled:opacity-60"
        >
          {sending ? t("feedback.sending") : t("feedback.submit")}
        </button>
      </form>
    </section>
  );
}
