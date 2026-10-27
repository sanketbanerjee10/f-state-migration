import { AlertTriangle, X } from 'lucide-react';

export function DismissibleToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  if (!message) return null;

  return (
    <div className="dismissible-toast" role="alert" aria-live="assertive">
      <AlertTriangle size={18} aria-hidden="true" />
      <span>{message}</span>
      <button
        type="button"
        className="dismissible-toast-close"
        onClick={onDismiss}
        aria-label="Dismiss message"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
