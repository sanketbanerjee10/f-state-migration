import { AlertCircle, ArchiveX } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ErrorState({
  message,
  deleted = false,
  onTrack,
  onRemoveTracking,
  onClose,
}: {
  message: string;
  deleted?: boolean;
  onTrack: () => void;
  onRemoveTracking: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const Icon = deleted ? ArchiveX : AlertCircle;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 20px',
        textAlign: 'center',
        background: 'rgba(239,68,68,0.06)',
        borderRadius: 8,
        border: '1px solid rgba(239,68,68,0.2)',
      }}
    >
      <Icon size={36} style={{ color: deleted ? '#f59e0b' : '#ef4444', marginBottom: 12 }} />
      <div
        style={{
          marginBottom: 8,
          color: deleted ? '#fbbf24' : '#f87171',
          fontSize: '1rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {deleted ? t('components.tracker.unavailableDeleted') : t('components.tracker.unavailable')}
      </div>
      <h3 style={{ margin: '0 0 8px 0', color: '#f1f5f9', fontSize: '0.9rem', }}>
        {deleted ? t('components.tracker.noLongerExists') : t('components.tracker.couldNotLocate')}
      </h3>
      <p style={{ margin: '0 0 20px 0', maxWidth: 420, fontSize: '0.8rem', lineHeight: 1.6, color: '#cbd5e1' }}>
        {deleted
          ? t('components.tracker.unavailableDescription')
          : message}
      </p>
      {deleted ? (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="button button-secondary" onClick={onClose}>
            {t('common.actions.close')}
          </button>
          <button type="button" className="button button-danger" onClick={onRemoveTracking}>
            {t('components.tracker.yesRemove')}
          </button>
        </div>
      ) : (
        <button type="button" className="button button-primary" onClick={onTrack}>
          {t('components.tracker.enterAnother')}
        </button>
      )}
    </div>
  );
}
