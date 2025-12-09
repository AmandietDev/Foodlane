/**
 * Composant pour afficher des messages d'erreur utilisateur-friendly
 */

interface ErrorMessageProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export default function ErrorMessage({
  message,
  onDismiss,
  className = "",
}: ErrorMessageProps) {
  return (
    <div
      className={`p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-lg">⚠️</span>
        <div className="flex-1">
          <p className="font-medium mb-1">Erreur</p>
          <p>{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-700 hover:text-red-900 font-bold text-lg leading-none"
            aria-label="Fermer"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

