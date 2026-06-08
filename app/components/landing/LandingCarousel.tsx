"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type LandingCarouselProps = {
  itemCount: number;
  autoMs?: number;
  showDots?: boolean;
  showArrows?: boolean;
  /** Flèches et pastilles plus petites */
  compactControls?: boolean;
  className?: string;
  renderItem: (index: number) => ReactNode;
  visibleCount?: number;
};

export default function LandingCarousel({
  itemCount,
  autoMs = 5000,
  showDots = false,
  showArrows = true,
  compactControls = false,
  className = "",
  renderItem,
  visibleCount = 1,
}: LandingCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const maxIndex = Math.max(0, itemCount - visibleCount);

  const next = useCallback(() => {
    setIndex((i) => (i >= maxIndex ? 0 : i + 1));
  }, [maxIndex]);

  const prev = useCallback(() => {
    setIndex((i) => (i <= 0 ? maxIndex : i - 1));
  }, [maxIndex]);

  useEffect(() => {
    if (paused || itemCount <= visibleCount || autoMs <= 0) return;
    const id = window.setInterval(next, autoMs);
    return () => window.clearInterval(id);
  }, [paused, autoMs, itemCount, visibleCount, next]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX ?? start;
    const delta = end - start;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) next();
    else prev();
  };

  if (itemCount === 0) return null;

  const slidePct = 100 / visibleCount;
  const arrowSizeClass = compactControls ? "h-8 w-8 shadow-sm" : "h-10 w-10 shadow-md";
  const arrowLeftClass = compactControls
    ? "absolute left-0 md:-left-4"
    : "absolute -left-1 md:-left-5";
  const arrowRightClass = compactControls
    ? "absolute right-0 md:-right-4"
    : "absolute -right-1 md:-right-5";
  const chevronSize = compactControls ? 14 : 20;
  const dotActive = compactControls ? "h-2 w-6" : "h-2.5 w-8";
  const dotIdle = compactControls ? "h-2 w-2" : "h-2.5 w-2.5";
  const itemGap = compactControls ? "px-1.5" : "px-2";

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {showArrows && itemCount > visibleCount ? (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Précédent"
            className={`${arrowLeftClass} top-1/2 z-10 flex ${arrowSizeClass} -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#E94E77] transition hover:bg-[#FFF0EE]`}
          >
            <ChevronLeft size={chevronSize} />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Suivant"
            className={`${arrowRightClass} top-1/2 z-10 flex ${arrowSizeClass} -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#E94E77] transition hover:bg-[#FFF0EE]`}
          >
            <ChevronRight size={chevronSize} />
          </button>
        </>
      ) : null}

      <div className="overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * slidePct}%)` }}
        >
          {Array.from({ length: itemCount }).map((_, i) => (
            <div key={i} className={`shrink-0 ${itemGap}`} style={{ flex: `0 0 ${slidePct}%` }}>
              {renderItem(i)}
            </div>
          ))}
        </div>
      </div>

      {showDots && maxIndex > 0 ? (
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`rounded-full transition-all ${
                i === index ? `${dotActive} bg-[#E94E77]` : `${dotIdle} bg-[#F9C4CE]`
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ChevronLeft({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
