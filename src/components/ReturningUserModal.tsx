import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { ExternalLink, FilePlus, FileText, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getTrackedApplications,
  isWelcomePromptDismissed,
  markWelcomePromptDismissed,
  type TrackedApplicationMeta,
} from '../lib/trackedApplications';

export function ReturningUserModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [tracked, setTracked] = useState<TrackedApplicationMeta[]>([]);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Only show if user is on root or initial apply page, not already on tracking or admin
    const path = window.location.pathname;
    const isSpecialPath =
      path.startsWith('/track') ||
      path.startsWith('/leadership') ||
      path.startsWith('/admin') ||
      window.location.search.includes('edit=');

    if (isSpecialPath) return;

    if (!isWelcomePromptDismissed()) {
      const apps = getTrackedApplications();
      if (apps.length > 0) {
        setTracked(apps);
        setIsOpen(true);
      }
    }
  }, []);

  const handleClose = () => {
    markWelcomePromptDismissed();
    setIsOpen(false);
  };

  const handleTrackAll = () => {
    markWelcomePromptDismissed();
    setIsOpen(false);
    setLocation('/track');
  };

  const handleTrackSingle = (id: string) => {
    markWelcomePromptDismissed();
    setIsOpen(false);
    setLocation(`/track/${id}`);
  };

  const handleStartNew = () => {
    markWelcomePromptDismissed();
    setIsOpen(false);
  };

  if (!isOpen || tracked.length === 0) return null;

  return (
    <div className="dialog-backdrop" style={{ zIndex: 8500 }}>
      <section
        className="dialog returning-user-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        style={{
          maxWidth: 540,
          border: '1px solid rgba(59, 130, 246, 0.4)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(59, 130, 246, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60a5fa' }}>
              {t('components.returning.welcome')}
            </div>
            <h2 id="welcome-modal-title" style={{ margin: '4px 0 0 0', fontSize: '1.35rem', color: '#f8fafc' }}>
              {t('components.returning.found')}
            </h2>
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleClose}
            aria-label={t('common.actions.close')}
            style={{ paddingBlock: 6, paddingInline: 10, minWidth: 'auto', borderRadius: '10px' }}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 16px 0', lineHeight: 1.45 }}>
          {t('components.returning.foundDescription', {
            count: tracked.length,
            applicationNoun: tracked.length === 1 ? 'application' : 'applications',
          })}
        </p>

        {/* List of tracked applications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 210, overflowY: 'auto', marginBottom: 20 }}>
          {tracked.map((app) => (
            <div
              key={app.id}
              onClick={() => handleTrackSingle(app.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                e.currentTarget.style.background = 'rgba(30, 41, 59, 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)';
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.92rem' }}>
                  {app.gameName || t('components.returning.unnamed')}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: 8 }}>
                  <span>{app.reference}</span>
                  <span>•</span>
                  <span>{app.migrationType === 'Group' ? t('common.labels.group') : t('common.labels.individual')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '2px 8px',
                    borderRadius: 9999,
                    fontWeight: 600,
                    background:
                      app.status === 'Approved'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : app.status === 'Rejected'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : 'rgba(245, 158, 11, 0.15)',
                    color:
                      app.status === 'Approved'
                        ? '#34d399'
                        : app.status === 'Rejected'
                        ? '#f87171'
                        : '#fbbf24',
                    border: `1px solid ${
                      app.status === 'Approved'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : app.status === 'Rejected'
                        ? 'rgba(239, 68, 68, 0.3)'
                        : 'rgba(245, 158, 11, 0.3)'
                    }`,
                  }}
                >
                  {app.status === 'Approved'
                    ? t('components.returning.approved')
                    : app.status === 'Rejected'
                      ? t('components.returning.rejected')
                      : t('components.returning.pending')}
                </span>
                <ExternalLink size={14} style={{ color: '#94a3b8' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="button button-primary"
            onClick={handleTrackAll}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <FileText size={16} />
            {t('components.returning.viewTrack')}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleStartNew}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <FilePlus size={16} />
            {t('components.returning.newRequest')}
          </button>
        </div>
      </section>
    </div>
  );
}
