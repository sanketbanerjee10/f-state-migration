import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PrivacyAdvisory() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 8,
        padding: '12px 16px',
        marginBottom: 20,
        fontSize: '0.85rem',
        color: '#fde68a',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <strong>{t('components.tracker.privacyTitle')}</strong>
      </div>
      {t('components.tracker.privacyDescription')}
    </div>
  );
}
