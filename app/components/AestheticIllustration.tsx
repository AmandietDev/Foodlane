"use client";

type IllustrationVariant = "menu" | "recipes" | "coach" | "favorites";

const ICONS: Record<IllustrationVariant, string> = {
  menu: "M7 4h10M7 10h10M7 16h10M4 7h.01M4 13h.01M4 19h.01",
  recipes: "M6 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 5h12",
  coach: "M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-7 17a7 7 0 0 1 14 0",
  favorites: "M12 20s-6.5-4.2-8.5-7A5.2 5.2 0 0 1 12 5a5.2 5.2 0 0 1 8.5 8c-2 2.8-8.5 7-8.5 7z",
};

export default function AestheticIllustration({
  variant,
  className = "",
}: {
  variant: IllustrationVariant;
  className?: string;
}) {
  return (
    <div
      className={`relative h-20 w-full overflow-hidden rounded-2xl border border-white/60 bg-gradient-to-br from-white/80 to-[#FFECEC]/70 backdrop-blur-sm ${className}`}
      aria-hidden="true"
    >
      <div className="absolute -left-5 -top-6 h-16 w-16 rounded-full bg-[#FFD4D4]/80 blur-xl" />
      <div className="absolute right-8 top-2 h-14 w-14 rounded-full bg-[#FFDFF6]/70 blur-xl" />
      <div className="absolute -right-6 -bottom-8 h-20 w-20 rounded-full bg-[#FBE7C8]/70 blur-xl" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-2xl border border-[#F4CDCD] bg-white/90 p-2.5 shadow-sm">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-[#9C4A4A]"
          >
            <path
              d={ICONS[variant]}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

