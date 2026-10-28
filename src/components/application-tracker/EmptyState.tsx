import { PlusCircle, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  onTrack: () => void;
}

export function EmptyState({ onTrack }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 32px',
        textAlign: 'center',
        color: '#94a3b8',
        background: 'rgba(15,23,42,0.4)',
        borderRadius: 8,
        border: '1px dashed rgba(255,255,255,0.08)',
      }}
    >
      <Search size={40} style={{ color: '#334155', marginBottom: 16 }} />
      <h3 style={{ margin: '0 0 8px 0', color: '#f1f5f9', fontSize: '1.1rem' }}>{t('components.tracker.select')}</h3>
      <p style={{ margin: '0 0 24px 0', fontSize: '0.88rem', maxWidth: 360, lineHeight: 1.5 }}>
        {t('components.tracker.emptyDescription')}
      </p>
      <button type="button" className="button button-primary" onClick={onTrack} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <PlusCircle size={16} /> {t('components.tracker.title')}
      </button>
    </div>
  );
}
