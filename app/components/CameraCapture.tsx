"use client";

import { useState, useRef, useEffect } from "react";

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
  title?: string;
}

export default function CameraCapture({
  onCapture,
  onClose,
  title = "Prendre une photo",
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment"); // "environment" = caméra arrière
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      // Arrêter le stream précédent s'il existe
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      setError(null);
      
      // Demander l'accès à la caméra
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);

      // Afficher le stream dans la vidéo
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Erreur d'accès à la caméra:", err);
      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError("Permission d'accès à la caméra refusée. Veuillez autoriser l'accès dans les paramètres de votre navigateur.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setError("Aucune caméra trouvée sur cet appareil.");
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          setError("La caméra est déjà utilisée par une autre application.");
        } else {
          setError(`Erreur d'accès à la caméra: ${err.message}`);
        }
      } else {
        setError("Impossible d'accéder à la caméra. Veuillez vérifier les permissions.");
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    if (!context) {
      setIsCapturing(false);
      return;
    }

    // Définir la taille du canvas à celle de la vidéo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dessiner l'image de la vidéo sur le canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir en base64
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);

    // Appeler la fonction de callback
    onCapture(imageDataUrl);

    // Arrêter la caméra
    stopCamera();
    setIsCapturing(false);
  };

  const switchCamera = () => {
    setFacingMode(facingMode === "environment" ? "user" : "environment");
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* En-tête */}
      <div className="flex items-center justify-between p-4 bg-black/80 text-white">
        <button
          onClick={handleClose}
          className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
        >
          ✕ Annuler
        </button>
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="w-20"></div> {/* Spacer pour centrer le titre */}
      </div>

      {/* Zone de prévisualisation */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {error ? (
          <div className="text-center p-6 text-white">
            <div className="text-4xl mb-4">📷</div>
            <p className="text-sm mb-4">{error}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-lg bg-[#D44A4A] text-white hover:bg-[#C03A3A] transition-colors"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Canvas caché pour capturer l'image */}
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>

      {/* Contrôles */}
      {!error && (
        <div className="p-6 bg-black/80">
          <div className="flex items-center justify-center gap-4">
            {/* Bouton pour changer de caméra (si plusieurs caméras disponibles) */}
            <button
              onClick={switchCamera}
              className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              title="Changer de caméra"
            >
              🔄
            </button>

            {/* Bouton de capture */}
            <button
              onClick={capturePhoto}
              disabled={isCapturing || !stream}
              className="w-16 h-16 rounded-full bg-white border-4 border-white/30 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="w-full h-full rounded-full bg-white"></div>
            </button>

            {/* Espaceur */}
            <div className="w-12"></div>
          </div>
        </div>
      )}
    </div>
  );
}

