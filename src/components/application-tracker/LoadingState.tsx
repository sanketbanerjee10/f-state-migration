import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function LoadingState() {
  const { t } = useTranslation();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: '#94a3b8' }}>
      <LoaderCircle size={36} className="spinner" style={{ marginBottom: 16, color: '#3b82f6' }} />
      <p style={{ margin: 0 }}>{t('components.tracker.retrieving')}</p>
    </div>
  );
}
