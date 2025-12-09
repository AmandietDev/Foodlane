/**
 * Composant de chargement standardisé
 */

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function LoadingSpinner({
  message = "Chargement...",
  size = "md",
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className={`animate-spin rounded-full border-b-2 border-[#D44A4A] ${sizeClasses[size]}`}
      />
      {message && (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">{message}</p>
      )}
    </div>
  );
}

