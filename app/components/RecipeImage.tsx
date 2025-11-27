"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { getImageUrl, getImageUrlAlternatives } from "../src/lib/images";

interface RecipeImageProps {
  imageUrl?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  priority?: boolean; // Pour les images au-dessus de la ligne de flottaison
  sizes?: string; // Pour l'optimisation responsive
}

// Cache simple pour éviter de recharger les mêmes images
const imageCache = new Set<string>();

export default function RecipeImage({
  imageUrl,
  alt,
  className = "",
  fallbackClassName = "",
  priority = false,
  sizes = "(max-width: 768px) 50vw, 33vw",
}: RecipeImageProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const processedUrl = getImageUrl(imageUrl);
  const alternativeUrls = getImageUrlAlternatives(imageUrl);
  
  // Prioriser l'URL via le proxy, puis les alternatives directes
  const allUrls = useMemo(() => {
    if (processedUrl) {
      return [processedUrl, ...alternativeUrls.filter(u => u !== processedUrl && !u.includes('/api/images'))];
    }
    return alternativeUrls;
  }, [processedUrl, alternativeUrls]);

  // Si pas d'URL valide, afficher le placeholder
  if (allUrls.length === 0) {
    return (
      <div
        className={`bg-[#FFC4C4] flex items-center justify-center ${className} ${fallbackClassName}`}
      >
        <span className="text-4xl text-[#9A6A6A]">🍽️</span>
      </div>
    );
  }

  const currentUrl = allUrls[currentUrlIndex];
  const isCached = imageCache.has(currentUrl);

  // Si erreur de chargement et qu'il reste des URLs alternatives, essayer la suivante
  const handleError = () => {
    if (currentUrlIndex < allUrls.length - 1) {
      // Essayer l'URL alternative suivante
      setCurrentUrlIndex(currentUrlIndex + 1);
      setImageLoading(true);
      setImageError(false);
    } else {
      // Toutes les URLs ont échoué, afficher le placeholder
      setImageError(true);
      setImageLoading(false);
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Impossible de charger l'image pour "${alt}". URLs essayées:`, allUrls);
      }
    }
  };

  // Réinitialiser l'état quand l'URL change
  useEffect(() => {
    setImageError(false);
    setImageLoading(!isCached); // Si l'image est en cache, ne pas afficher le loader
  }, [currentUrl, isCached]);

  // Ajouter l'image au cache une fois chargée
  useEffect(() => {
    if (!imageLoading && !imageError && currentUrl) {
      imageCache.add(currentUrl);
    }
  }, [imageLoading, imageError, currentUrl]);

  // Précharger l'image si elle est prioritaire
  useEffect(() => {
    if (priority && currentUrl && typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = currentUrl;
      document.head.appendChild(link);
      
      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, currentUrl]);

  // Si erreur de chargement et plus d'alternatives, afficher le placeholder
  if (imageError) {
    return (
      <div
        className={`bg-[#FFC4C4] flex items-center justify-center ${className} ${fallbackClassName}`}
      >
        <span className="text-4xl text-[#9A6A6A]">🍽️</span>
      </div>
    );
  }

  // Vérifier si l'URL est externe (nécessaire pour Next.js Image)
  const isExternalUrl = currentUrl.startsWith('http://') || currentUrl.startsWith('https://');
  const isApiUrl = currentUrl.startsWith('/api/');

  // Pour les URLs externes ou API, utiliser une balise img standard avec optimisations
  if (isExternalUrl && !isApiUrl) {
    return (
      <div className={`relative ${className}`}>
        {imageLoading && (
          <div className="absolute inset-0 bg-[#FFC4C4] flex items-center justify-center z-10">
            <span className="text-2xl text-[#9A6A6A] animate-pulse">🍽️</span>
          </div>
        )}
        <img
          ref={imgRef}
          key={currentUrl}
          src={currentUrl}
          alt={alt}
          className={`w-full h-full object-cover ${imageLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
          onLoad={() => {
            setImageLoading(false);
            setImageError(false);
          }}
          onError={handleError}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
        />
      </div>
    );
  }

  // Pour les URLs API ou locales, utiliser Next.js Image avec fill
  // Note: le parent doit avoir position: relative
  return (
    <div className={`relative ${className}`}>
      {imageLoading && (
        <div className="absolute inset-0 bg-[#FFC4C4] flex items-center justify-center z-10">
          <span className="text-2xl text-[#9A6A6A] animate-pulse">🍽️</span>
        </div>
      )}
      <Image
        key={currentUrl}
        src={currentUrl}
        alt={alt}
        fill
        className={`object-cover ${imageLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        onLoad={() => {
          setImageLoading(false);
          setImageError(false);
        }}
        onError={handleError}
        loading={priority ? "eager" : "lazy"}
        priority={priority}
        sizes={sizes}
        quality={85}
        unoptimized={isApiUrl} // Désactiver l'optimisation pour les URLs API
      />
    </div>
  );
}

