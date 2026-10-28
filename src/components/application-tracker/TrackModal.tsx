import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArchiveX, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AdminApplication } from '@/lib/api-client';
import { getApplicationDetailsQueryOptions, isApplicationDeletedError } from '@/lib/applicationDetailsCache';

interface TrackModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (app: AdminApplication) => void;
}

export function TrackModal({ open, onClose, onSuccess }: TrackModalProps) {
  const { t } = useTranslation();
  const [inputId, setInputId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [applicationDeleted, setApplicationDeleted] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputId.trim();
    if (!clean) { setError(t('components.tracker.enterId')); return; }

    setLoading(true);
    setError('');
    setApplicationDeleted(false);
    try {
      const data = await queryClient.fetchQuery(getApplicationDetailsQueryOptions(clean));
      onSuccess(data);
      setInputId('');
      onClose();
    } catch (err) {
      setApplicationDeleted(isApplicationDeletedError(err));
      setError(err instanceof Error ? err.message : t('components.tracker.cannotAdd'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="dialog-backdrop" style={{ zIndex: 9500 }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="track-modal-title" style={{ maxWidth: 480 }}>
        <h2 id="track-modal-title" style={{ margin: '0 0 10px 0', fontSize: '1.25rem' }}>
          {t('components.tracker.title')}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="track-input-id" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
              {t('components.tracker.idLabel')}
            </label>
            <input
              id="track-input-id"
              className="control"
              placeholder={t('components.tracker.idPlaceholder')}
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              autoFocus
            />
            {error && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                  marginTop: 10,
                  padding: '10px 12px',
                  border: `1px solid ${applicationDeleted ? 'rgba(245, 158, 11, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                  borderRadius: 8,
                  background: applicationDeleted ? 'rgba(245, 158, 11, 0.09)' : 'rgba(239, 68, 68, 0.08)',
                  color: applicationDeleted ? '#fbbf24' : '#fca5a5',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                }}
              >
                {applicationDeleted && <ArchiveX size={17} style={{ flexShrink: 0, marginTop: 1 }} />}
                <span>
                  {applicationDeleted
                    ? t('components.tracker.deleted')
                    : error}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="button button-secondary" onClick={onClose}>
              {t('common.actions.cancel')}
            </button>
            <button type="submit" className="button button-primary" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {loading && <LoaderCircle size={14} className="spinner" />}
              {loading ? t('common.status.searching') : t('components.tracker.title')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
