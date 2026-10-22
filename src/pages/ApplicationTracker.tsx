import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import {
  getTrackedApplications,
  removeTrackedApplication,
  saveTrackedApplication,
  type TrackedApplicationMeta,
} from '../lib/trackedApplications';
import type { AdminApplication } from '@/lib/api-client';
import { ApplicationListItem } from '../components/application-tracker/ApplicationListItem';
import { ApplicationSidePane } from '../components/application-tracker/ApplicationSidePane';
import { EmptyState } from '../components/application-tracker/EmptyState';
import { PrivacyAdvisory } from '../components/application-tracker/PrivacyAdvisory';
import { TrackModal } from '../components/application-tracker/TrackModal';
import { getReferenceCode } from '../components/application-tracker/trackerUtils';

export function ApplicationTracker() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();

  const [currentId, setCurrentId] = useState<string>(params.id || '');
  const [trackedList, setTrackedList] = useState<TrackedApplicationMeta[]>([]);
  const [application, setApplication] = useState<AdminApplication | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string>('');
  const [panelOpen, setPanelOpen] = useState<boolean>(!!params.id);
  const [trackModalOpen, setTrackModalOpen] = useState(false);

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

  // Fetch application details when currentId changes
  useEffect(() => {
    if (!currentId) {
      setApplication(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setFetchError('');

    fetch(`/api/applications/${encodeURIComponent(currentId)}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error('Application not found. Please verify the ID or reference.');
          throw new Error('Could not load application details. Please try again.');
        }
        return res.json();
      })
      .then((data: AdminApplication) => {
        if (!isMounted) return;
        setApplication(data);

        // Sync to local storage
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
      })
      .catch((err) => {
        if (!isMounted) return;
        setFetchError(err instanceof Error ? err.message : 'Error fetching application.');
        setApplication(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [currentId]);

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

      {/* ── Page Header ── */}
      <header className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Link href="/" className="button button-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
            <ArrowLeft size={14} /> Back
          </Link>
          <button
            type="button"
            className="button button-primary"
            onClick={openTrackModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.88rem' }}
          >
            <PlusCircle size={16} /> Track Application
          </button>
        </div>
        <div className="eyebrow" style={{ marginTop: 16 }}>STATE 565 MIGRATION</div>
        <h1 className="form-title" style={{ margin: '6px 0' }}>Application Tracker</h1>
        <p className="intro" style={{ margin: 0 }}>
          Inspect the live status, player details, and score breakdown for your migration submission.
        </p>
      </header>

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
                Saved Applications ({trackedList.length})
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
          loading={loading}
          error={fetchError}
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
