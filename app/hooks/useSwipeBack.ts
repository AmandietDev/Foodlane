import { useEffect, useRef } from "react";

/**
 * Hook pour détecter le geste de balayage de gauche à droite (swipe right)
 * et déclencher une action de retour
 */
export function useSwipeBack(onBack: () => void, enabled: boolean = true) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const minSwipeDistance = 50; // Distance minimale en pixels pour déclencher le swipe
  const maxVerticalDistance = 100; // Distance verticale maximale pour considérer un swipe horizontal

  useEffect(() => {
    if (!enabled) return;

    function handleTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
    }

    function handleTouchEnd(e: TouchEvent) {
      if (touchStartX.current === null || touchStartY.current === null) return;

      const touch = e.changedTouches[0];
      const touchEndX = touch.clientX;
      const touchEndY = touch.clientY;

      const deltaX = touchEndX - touchStartX.current;
      const deltaY = Math.abs(touchEndY - touchStartY.current);

      // Vérifier que c'est un swipe horizontal (pas trop vertical)
      if (deltaY > maxVerticalDistance) {
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      // Swipe de gauche à droite (deltaX positif)
      if (deltaX > minSwipeDistance) {
        onBack();
      }

      touchStartX.current = null;
      touchStartY.current = null;
    }

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [onBack, enabled]);
}





