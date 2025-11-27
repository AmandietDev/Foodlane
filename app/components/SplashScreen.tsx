"use client";

import { useState, useEffect, useRef } from "react";

export default function SplashScreen() {
  const [showSplash, setShowSplash] = useState(true);
  const [hasPlayed, setHasPlayed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const SPLASH_PLAYED_KEY = "foodlane_splash_played";

  useEffect(() => {
    // Vérifier si la vidéo a déjà été jouée (optionnel - décommentez si vous voulez la jouer une seule fois)
    // const played = localStorage.getItem(SPLASH_PLAYED_KEY);
    // if (played === "true") {
    //   setShowSplash(false);
    //   return;
    // }

    // Démarrer la vidéo automatiquement (en muet pour éviter les restrictions de navigateur)
    if (videoRef.current) {
      // La vidéo est en muted par défaut, donc elle peut être lue automatiquement
      videoRef.current.play().catch((err) => {
        console.error("Erreur lors de la lecture de la vidéo:", err);
        // Si la vidéo ne peut pas être lue, masquer le splash screen
        setShowSplash(false);
      });
    }
  }, []);

  const handleVideoEnd = () => {
    setShowSplash(false);
    setHasPlayed(true);
    // Marquer comme jouée (optionnel)
    // localStorage.setItem(SPLASH_PLAYED_KEY, "true");
  };

  const handleSkip = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setShowSplash(false);
  };

  if (!showSplash) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
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
      
      {/* Bouton pour passer la vidéo */}
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 px-4 py-2 rounded-lg bg-black/50 hover:bg-black/70 text-white text-sm font-semibold transition-colors backdrop-blur-sm"
      >
        Passer
      </button>
    </div>
  );
}

