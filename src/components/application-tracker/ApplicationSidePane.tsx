import { X } from 'lucide-react';
import type { AdminApplication } from '@/lib/api-client';
import { ApplicationDetailPane } from './ApplicationDetailPane';
import { ErrorState } from './ErrorState';
import { LoadingState } from './LoadingState';

interface ApplicationSidePaneProps {
  application: AdminApplication | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onRemove: (id: string) => void;
  onTrack: () => void;
}

export function ApplicationSidePane({ application, loading, error, onClose, onRemove, onTrack }: ApplicationSidePaneProps) {
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
        aria-label="Application details"
      >
        <button
          type="button"
          className="icon-button tracker-detail-close"
          onClick={onClose}
          aria-label="Close application details"
        >
          <X size={18} />
        </button>
        <div className="tracker-detail-content">
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onTrack={onTrack} />}
          {!loading && !error && application && (
            <ApplicationDetailPane application={application} onRemove={() => onRemove(application.id)} />
          )}
        </div>
      </aside>
    </div>
  );
}
