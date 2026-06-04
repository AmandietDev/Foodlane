"use client";

import { useState, useEffect, useRef } from "react";

export default function SplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [hasPlayed, setHasPlayed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const SPLASH_PLAYED_KEY = "foodlane_splash_played";

  useEffect(() => {
    let mounted = true;

    const hide = () => {
      if (mounted) setShowSplash(false);
    };

    try {
      if (localStorage.getItem(SPLASH_PLAYED_KEY) === "true") {
        hide();
        return () => {
          mounted = false;
        };
      }
    } catch {
      /* private mode */
    }

    const video = videoRef.current;
    if (video) {
      video.play().catch((err) => {
        console.error("Erreur lors de la lecture de la vidéo:", err);
        hide();
      });
    }

    return () => {
      mounted = false;
    };
  }, []);

  const dismissSplash = () => {
    setShowSplash(false);
    setHasPlayed(true);
    try {
      localStorage.setItem(SPLASH_PLAYED_KEY, "true");
    } catch {
      /* ignore */
    }
  };

  const handleVideoEnd = () => {
    dismissSplash();
  };

  if (!showSplash) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      role="button"
      tabIndex={0}
      onClick={dismissSplash}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") dismissSplash();
      }}
      aria-label="Passer l’intro"
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        onEnded={handleVideoEnd}
        playsInline
        muted
        autoPlay
        preload="auto"
      >
        <source src="/ouverture.mp4" type="video/mp4" />
        Votre navigateur ne supporte pas la lecture de vidéos.
      </video>
    </div>
  );
}

