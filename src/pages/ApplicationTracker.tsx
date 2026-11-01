import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { PlusCircle } from 'lucide-react';
import {
  getTrackedApplications,
  removeTrackedApplication,
  saveTrackedApplication,
  type TrackedApplicationMeta,
} from '../lib/trackedApplications';
import type { AdminApplication } from '@/lib/api-client';
import { isApplicationDeletedError, useApplicationDetails } from '@/lib/applicationDetailsCache';
import { ApplicationListItem } from '../components/application-tracker/ApplicationListItem';
import { ApplicationSidePane } from '../components/application-tracker/ApplicationSidePane';
import { EmptyState } from '../components/application-tracker/EmptyState';
import { PrivacyAdvisory } from '../components/application-tracker/PrivacyAdvisory';
import { TrackModal } from '../components/application-tracker/TrackModal';
import { getReferenceCode } from '../components/application-tracker/trackerUtils';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';

export function ApplicationTracker() {
  const { t } = useTranslation();
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();

  const [currentId, setCurrentId] = useState<string>(params.id || '');
  const [trackedList, setTrackedList] = useState<TrackedApplicationMeta[]>([]);
  const [application, setApplication] = useState<AdminApplication | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string>('');
  const [applicationDeleted, setApplicationDeleted] = useState(false);
  const [panelOpen, setPanelOpen] = useState<boolean>(!!params.id);
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const applicationQuery = useApplicationDetails(currentId);

  // Load saved applications on mount
  useEffect(() => {
    const list = getTrackedApplications();
    setTrackedList(list);

    if (params.id) {
      setCurrentId(params.id);
      setPanelOpen(true);
    } else if (list.length > 0 && !currentId) {
      // Don't auto-select; let user click
    }
  }, [params.id]);

  useEffect(() => {
    setLoading(applicationQuery.isFetching);
    setApplicationDeleted(isApplicationDeletedError(applicationQuery.error));
    setFetchError(applicationQuery.error instanceof Error ? applicationQuery.error.message : '');

    const data = applicationQuery.data;
    if (!data) {
      if (!applicationQuery.isFetching) setApplication(null);
      return;
    }

    setApplication(data);
    saveTrackedApplication({
      id: data.id,
      reference: getReferenceCode(data.id),
      gameName: data.gameName,
      migrationType: data.migrationType,
      status: data.status,
      submittedAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      lastUpdated: data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString(),
    });
    setTrackedList(getTrackedApplications());
  }, [applicationQuery.data, applicationQuery.error, applicationQuery.isFetching]);

  const handleSelectApplication = (id: string) => {
    setCurrentId(id);
    setLocation(`/track/${id}`);
    setPanelOpen(true);
  };

  const handleRemoveTracked = (idToRemove: string) => {
    removeTrackedApplication(idToRemove);
    const updated = getTrackedApplications();
    setTrackedList(updated);
    if (currentId.toLowerCase() === idToRemove.toLowerCase()) {
      setCurrentId('');
      setApplication(null);
      setPanelOpen(false);
      setLocation('/track');
    }
  };

  const handleTrackSuccess = (data: AdminApplication) => {
    saveTrackedApplication({
      id: data.id,
      reference: getReferenceCode(data.id),
      gameName: data.gameName,
      migrationType: data.migrationType,
      status: data.status,
      submittedAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      lastUpdated: data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString(),
    });
    setTrackedList(getTrackedApplications());
    setCurrentId(data.id);
    setLocation(`/track/${data.id}`);
    setPanelOpen(true);
  };

  const openTrackModal = () => {
    setTrackModalOpen(true);
  };

  return (
    <main className="form-shell" style={{ maxWidth: 1200, margin: '0 auto' }}>

      <PageHeader
        backHref="/"
        actions={
          <button
            type="button"
            className="button button-primary"
            onClick={openTrackModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.88rem' }}
          >
            <PlusCircle size={16} /> {t('components.tracker.title')}
          </button>
        }
        eyebrow={t('pages.tracker.eyebrow')}
        title={t('pages.tracker.title')}
        description={t('pages.tracker.description')}
      />

      <PrivacyAdvisory />

      {/* ── Two-column layout ── */}
      <div
        className="application-tracker-layout"
        style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}
      >

        {/* ── Left: Application List ── */}
        <div className="application-tracker-list">
          {trackedList.length === 0 ? (
            !panelOpen && <EmptyState onTrack={openTrackModal} />
          ) : (
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 8 }}>
                {t('components.tracker.savedCount', { count: trackedList.length })}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {trackedList.map((item) => {
                  const isActive = item.id.toLowerCase() === currentId.toLowerCase();
                  return (
                    <ApplicationListItem
                      key={item.id}
                      item={item}
                      isActive={isActive}
                      onClick={() => handleSelectApplication(item.id)}
                      onRemove={() => handleRemoveTracked(item.id)}
                    />
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* ── Right: Side Detail Pane ── */}
        <ApplicationSidePane
          application={application}
          applicationId={currentId}
          loading={loading}
          error={fetchError}
          deleted={applicationDeleted}
          onClose={() => { setPanelOpen(false); setCurrentId(''); setLocation('/track'); }}
          onRemove={handleRemoveTracked}
          onTrack={openTrackModal}
        />

      </div>

      {/* ── Track Modal ── */}
      <TrackModal
        open={trackModalOpen}
        onClose={() => setTrackModalOpen(false)}
        onSuccess={handleTrackSuccess}
      />
    </main>
  );
}
