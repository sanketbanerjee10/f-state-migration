import { useTranslation } from 'react-i18next';

export function PageLoader({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <div className={`page-loading${className ? ` ${className}` : ''}`} role="status" aria-live="polite">
      <div className="page-loading__art" aria-hidden="true">
        <span className="page-loading__mark" />
      </div>
      <span className="page-loading__message">{t('ui.spinnerLoading')}</span>
    </div>
  );
}
