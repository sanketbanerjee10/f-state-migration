import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function DismissibleToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  if (!message) return null;

  return (
    <div className="dismissible-toast" role="alert" aria-live="assertive">
      <AlertTriangle size={18} aria-hidden="true" />
      <span>{message}</span>
      <button
        type="button"
        className="dismissible-toast-close"
        onClick={onDismiss}
        aria-label={t('components.dialogs.dismiss')}
      >
        <X size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
