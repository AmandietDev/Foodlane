/**
 * Composant pour afficher un état vide (pas de favoris, pas de collections, etc.)
 */

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon = "📭",
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm">
        {message}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2 rounded-xl bg-gradient-to-br from-[#E94E77] to-[#D63D56] text-sm font-semibold text-white hover:from-[#D63D56] hover:to-[#E94E77] transition-all shadow-md"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

