import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AdminApplication } from '@/lib/api-client';
import { ApplicationDetailPane } from './ApplicationDetailPane';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

interface ApplicationSidePaneProps {
  application: AdminApplication | null;
  applicationId: string;
  loading: boolean;
  error: string;
  deleted?: boolean;
  onClose: () => void;
  onRemove: (id: string) => void;
  onTrack: () => void;
}

export function ApplicationSidePane({ application, applicationId, loading, error, deleted = false, onClose, onRemove, onTrack }: ApplicationSidePaneProps) {
  const { t } = useTranslation();
  const open = loading || !!error || !!application;

  if (!open) return null;

  return (
    <div
      className="detail-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="detail-drawer tracker-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t('components.tracker.details')}
      >
        <button
          type="button"
          className="icon-button tracker-detail-close"
          onClick={onClose}
          aria-label={t('components.tracker.closeDetails')}
        >
          <X size={18} />
        </button>
        <div className="tracker-detail-content">
          {loading && <LoadingState />}
          {!loading && error && (
            <ErrorState
              message={error}
              deleted={deleted}
              onTrack={onTrack}
              onRemoveTracking={() => {
                onRemove(applicationId);
                onClose();
              }}
              onClose={onClose}
            />
          )}
          {!loading && !error && application && (
            <ApplicationDetailPane application={application} onRemove={() => onRemove(application.id)} />
          )}
        </div>
      </aside>
    </div>
  );
}
