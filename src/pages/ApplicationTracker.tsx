import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Edit,
  ExternalLink,
  Info,
  LoaderCircle,
  PlusCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import {
  getTrackedApplications,
  removeTrackedApplication,
  saveTrackedApplication,
  type TrackedApplicationMeta,
} from '../lib/trackedApplications';
import { MigrationScoreBadge, VerifiedBadge } from '../components/MigrationScoringGuide';
import { calculateMigrationScoreFromRaw, TIER_COLORS, useLiveTierThresholds } from '../lib/migrationScore';
import type { AdminApplication, ApplicationPlayer } from '@workspace/api-zod';

export function ApplicationTracker() {
  const params = useParams<{ id?: string }>();
  const [, setLocation] = useLocation();

  const [currentId, setCurrentId] = useState<string>(params.id || '');
  const { thresholds } = useLiveTierThresholds();
  const [trackedList, setTrackedList] = useState<TrackedApplicationMeta[]>([]);
  const [application, setApplication] = useState<AdminApplication | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string>('');

  // Dialog for tracking a new application ID
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [inputAppId, setInputAppId] = useState('');
  const [trackError, setTrackError] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);

  // Copy states
  const [copiedId, setCopiedId] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    const list = getTrackedApplications();
    setTrackedList(list);

    if (params.id) {
      setCurrentId(params.id);
    } else if (list.length > 0 && !currentId) {
      setCurrentId(list[0].id);
    }
  }, [params.id]);

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

        // Update/sync with local storage
        saveTrackedApplication({
          id: data.id,
          reference: `565-${data.id.replaceAll('-', '').slice(0, 12).toUpperCase()}`,
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

    return () => {
      isMounted = false;
    };
  }, [currentId]);

  const handleAddTracked = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputAppId.trim();
    if (!clean) {
      setTrackError('Please enter an application ID or reference number.');
      return;
    }

    setTrackLoading(true);
    setTrackError('');

    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(clean)}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('No application found with this ID or reference.');
        throw new Error('Unable to retrieve application.');
      }
      const data: AdminApplication = await res.json();

      saveTrackedApplication({
        id: data.id,
        reference: `565-${data.id.replaceAll('-', '').slice(0, 12).toUpperCase()}`,
        gameName: data.gameName,
        migrationType: data.migrationType,
        status: data.status,
        submittedAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
        lastUpdated: data.updatedAt ? new Date(data.updatedAt).toISOString() : new Date().toISOString(),
      });

      setTrackedList(getTrackedApplications());
      setCurrentId(data.id);
      setLocation(`/track/${data.id}`);
      setTrackModalOpen(false);
      setInputAppId('');
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : 'Could not add application.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleRemoveTracked = (idToRemove: string) => {
    removeTrackedApplication(idToRemove);
    const updated = getTrackedApplications();
    setTrackedList(updated);
    if (currentId.toLowerCase() === idToRemove.toLowerCase()) {
      if (updated.length > 0) {
        setCurrentId(updated[0].id);
        setLocation(`/track/${updated[0].id}`);
      } else {
        setCurrentId('');
        setApplication(null);
        setLocation('/track');
      }
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const formatNumber = (val: number | null | undefined) => {
    if (val == null || isNaN(val)) return '0';
    return Number(val).toLocaleString();
  };

  const formatPowerInM = (val: number | null | undefined) => {
    if (val == null || isNaN(val)) return '0M';
    return `${(Number(val) / 1_000_000).toFixed(1)}M`;
  };

  const referenceCode = application ? `565-${application.id.replaceAll('-', '').slice(0, 12).toUpperCase()}` : '';

  // Separate applicant player and group members
  const applicantPlayer = application?.players?.find((p) => p.isApplicant);
  const groupPlayers = application?.players?.filter((p) => !p.isApplicant) || [];

  return (
    <main className="form-shell" style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Header & Navigation */}
      <header className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Link href="/" className="button button-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
            <ArrowLeft size={14} /> Back to Sign Up
          </Link>

          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              setInputAppId('');
              setTrackError('');
              setTrackModalOpen(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.88rem' }}
          >
            <PlusCircle size={16} /> Track Another Application
          </button>
        </div>

        <div className="eyebrow" style={{ marginTop: 16 }}>STATE 565 MIGRATION</div>
        <h1 className="form-title" style={{ margin: '6px 0' }}>Application Tracker</h1>
        <p className="intro" style={{ margin: 0 }}>
          Inspect the live status, player details, and score breakdown for your migration submission.
        </p>
      </header>

      {/* Discretion & Sharing Security Advisory */}
      <div
        style={{
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 20,
          fontSize: '0.85rem',
          color: '#fde68a',
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}
      >
        <ShieldAlert size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Tracking & Privacy Advisory:</strong> It is at your discretion whom you share your Application ID or Reference with. Anyone with this identifier can view the complete status, full player details, and make resubmissions.
        </div>
      </div>

      {/* Tracked Applications Pill Switcher (if user has stored apps) */}
      {trackedList.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 8 }}>
            Your Saved Applications ({trackedList.length})
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {trackedList.map((item) => {
              const active = item.id.toLowerCase() === currentId.toLowerCase() || item.reference.toUpperCase() === currentId.toUpperCase();
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: active ? 'rgba(59, 130, 246, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                    border: `1px solid ${active ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: 6,
                    padding: '4px 10px',
                    gap: 8,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => {
                    setCurrentId(item.id);
                    setLocation(`/track/${item.id}`);
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.85rem', color: active ? '#93c5fd' : '#cbd5e1' }}>
                    {item.gameName}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                    {item.reference}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      padding: '1px 6px',
                      borderRadius: 9999,
                      background:
                        item.status === 'Approved'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : item.status === 'Rejected'
                          ? 'rgba(239, 68, 68, 0.2)'
                          : 'rgba(245, 158, 11, 0.2)',
                      color:
                        item.status === 'Approved'
                          ? '#34d399'
                          : item.status === 'Rejected'
                          ? '#f87171'
                          : '#fbbf24',
                    }}
                  >
                    {item.status || 'Pending'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveTracked(item.id);
                    }}
                    title="Remove from saved applications"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 2,
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <LoaderCircle size={36} className="spinner" style={{ margin: '0 auto 16px', display: 'block', color: '#3b82f6' }} />
          <p>Retrieving migration application details...</p>
        </div>
      ) : fetchError ? (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            padding: '24px 20px',
            textAlign: 'center',
            color: '#fca5a5',
          }}
        >
          <AlertCircle size={36} style={{ color: '#ef4444', margin: '0 auto 12px', display: 'block' }} />
          <h3 style={{ margin: '0 0 8px 0', color: '#f87171' }}>Could Not Locate Application</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem' }}>{fetchError}</p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              setInputAppId('');
              setTrackError('');
              setTrackModalOpen(true);
            }}
          >
            Enter Another Application ID
          </button>
        </div>
      ) : !application ? (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            padding: '40px 20px',
            textAlign: 'center',
            color: '#94a3b8',
          }}
        >
          <Search size={36} style={{ color: '#64748b', margin: '0 auto 12px', display: 'block' }} />
          <h3 style={{ margin: '0 0 8px 0', color: '#f1f5f9' }}>No Application Selected</h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', maxWidth: 460, marginLeft: 'auto', marginRight: 'auto' }}>
            Enter your State 565 Application Reference or unique UUID to track your migration status and review details.
          </p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              setInputAppId('');
              setTrackError('');
              setTrackModalOpen(true);
            }}
          >
            Enter Application ID to Track
          </button>
        </div>
      ) : (
        <div>
          {/* Status Header Banner */}
          <div
            style={{
              background:
                application.status === 'Approved'
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.8))'
                  : application.status === 'Rejected'
                  ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(15, 23, 42, 0.8))'
                  : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(15, 23, 42, 0.8))',
              border: `1px solid ${
                application.status === 'Approved'
                  ? 'rgba(16, 185, 129, 0.4)'
                  : application.status === 'Rejected'
                  ? 'rgba(239, 68, 68, 0.4)'
                  : 'rgba(245, 158, 11, 0.4)'
              }`,
              borderRadius: 8,
              padding: '20px 24px',
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  {application.status === 'Approved' ? (
                    <CheckCircle2 size={24} style={{ color: '#10b981' }} />
                  ) : application.status === 'Rejected' ? (
                    <XCircle size={24} style={{ color: '#ef4444' }} />
                  ) : (
                    <Clock size={24} style={{ color: '#f59e0b' }} />
                  )}
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                    Status:{' '}
                    <span
                      style={{
                        color:
                          application.status === 'Approved'
                            ? '#34d399'
                            : application.status === 'Rejected'
                            ? '#f87171'
                            : '#fbbf24',
                      }}
                    >
                      {application.status}
                    </span>
                  </span>
                </div>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
                  {application.status === 'Approved'
                    ? 'Congratulations! Your application has been approved by State 565 leadership.'
                    : application.status === 'Rejected'
                    ? 'Your application was not accepted at this time.'
                    : 'Your application is currently pending review by State 565 alliance leadership.'}
                </p>
              </div>

              {/* Action: Edit & Resubmit Form */}
              <Link
                href={`/apply/character?edit=${application.id}`}
                className="button button-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                }}
              >
                <Edit size={16} /> Make Edits & Resubmit
              </Link>
            </div>

            {/* Reference info & copy */}
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 24,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b' }}>Reference Code</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95rem', fontWeight: 700, color: '#60a5fa' }}>
                  <span>{referenceCode}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyRef(referenceCode)}
                    className="link-button"
                    style={{ fontSize: '0.75rem', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Copy size={12} /> {copiedRef ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b' }}>Unique Application ID</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontFamily: 'monospace', color: '#cbd5e1' }}>
                  <span>{application.id}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyId(application.id)}
                    className="link-button"
                    style={{ fontSize: '0.75rem', padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <Copy size={12} /> {copiedId ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b' }}>Submitted</div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  {application.createdAt ? new Date(application.createdAt).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Player & Power Details Card */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              padding: '20px 24px',
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserCheck size={20} style={{ color: '#60a5fa' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>
                  Applicant: {application.gameName}
                </h3>
                {applicantPlayer?.isScreenshotVerified && <VerifiedBadge />}
              </div>

              {applicantPlayer && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MigrationScoreBadge
                    scoreResult={calculateMigrationScoreFromRaw(
                      applicantPlayer.structurePower,
                      applicantPlayer.techPower,
                      applicantPlayer.heroPower,
                      applicantPlayer.modVehiclePower,
                      thresholds
                    )}
                    playerName={application.gameName}
                    showDetailsText
                    size="md"
                  />
                </div>
              )}
            </div>

            {/* Quick stats grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                marginBottom: 16,
                background: 'rgba(0, 0, 0, 0.25)',
                padding: '12px 16px',
                borderRadius: 6,
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Current State</span>
                <strong style={{ color: '#f1f5f9' }}>State #{application.currentState}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Current Alliance</span>
                <strong style={{ color: '#f1f5f9' }}>{application.currentAlliance || 'None'}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Kills</span>
                <strong style={{ color: '#f1f5f9' }}>{formatNumber(application.kills)}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Highest Power</span>
                <strong style={{ color: '#f1f5f9' }}>
                  {applicantPlayer ? formatPowerInM(applicantPlayer.highestPowerOnRecord) : formatPowerInM(application.f1ArenaPower)}
                </strong>
              </div>
            </div>

            {/* Power Breakdown details */}
            {applicantPlayer && (
              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 14 }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', marginBottom: 10 }}>
                  Power Breakdown & Combat Arenas
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                  <div className="review-stat-card">
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Structure</span>
                    <strong>{formatPowerInM(applicantPlayer.structurePower)}</strong>
                  </div>
                  <div className="review-stat-card">
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tech</span>
                    <strong>{formatPowerInM(applicantPlayer.techPower)}</strong>
                  </div>
                  <div className="review-stat-card">
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Troop</span>
                    <strong>{formatPowerInM(applicantPlayer.troopPower)}</strong>
                  </div>
                  <div className="review-stat-card">
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Hero</span>
                    <strong>{formatPowerInM(applicantPlayer.heroPower)}</strong>
                  </div>
                  <div className="review-stat-card">
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Vehicle</span>
                    <strong>{formatPowerInM(applicantPlayer.modVehiclePower)}</strong>
                  </div>
                  <div className="review-stat-card">
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>F1 Arena</span>
                    <strong>{formatPowerInM(application.f1ArenaPower)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Group Roster (if Group application) */}
          {application.migrationType === 'Group' && (
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: '20px 24px',
                marginBottom: 20,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Users size={20} style={{ color: '#a855f7' }} />
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f8fafc' }}>
                  Group Roster ({groupPlayers.length} Additional Members)
                </h3>
              </div>

              {groupPlayers.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
                  No additional group members attached to this application.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                  {groupPlayers.map((member, index) => {
                    const memberScore = calculateMigrationScoreFromRaw(
                      member.structurePower,
                      member.techPower,
                      member.heroPower,
                      member.modVehiclePower,
                      thresholds
                    );
                    return (
                      <div
                        key={member.id || index}
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 6,
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <strong style={{ color: '#f1f5f9', fontSize: '0.92rem' }}>{member.playerName}</strong>
                            {member.isScreenshotVerified && <VerifiedBadge />}
                          </div>
                          <MigrationScoreBadge scoreResult={memberScore} playerName={member.playerName} size="sm" showDetailsText />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: '0.8rem', color: '#94a3b8' }}>
                          <div>Kills: <strong style={{ color: '#cbd5e1' }}>{formatNumber(member.kills)}</strong></div>
                          <div>Power: <strong style={{ color: '#cbd5e1' }}>{formatPowerInM(member.highestPowerOnRecord)}</strong></div>
                          <div>Tech: <strong style={{ color: '#cbd5e1' }}>{formatPowerInM(member.techPower)}</strong></div>
                          <div>Vehicle: <strong style={{ color: '#cbd5e1' }}>{formatPowerInM(member.modVehiclePower)}</strong></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Preferences & Background */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              padding: '20px 24px',
              marginBottom: 20,
            }}
          >
            <h3 style={{ margin: '0 0 14px 0', fontSize: '1.15rem', color: '#f8fafc' }}>
              Migration Preferences & Background
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Migration Type</span>
                <strong style={{ color: '#f1f5f9' }}>{application.migrationType}</strong>
                {application.groupRepresentative && (
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginTop: 2 }}>
                    Rep: {application.groupRepresentative}
                  </span>
                )}
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Declared Tier</span>
                <strong style={{ color: '#f1f5f9' }}>{application.migrationTier}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Preferred Alliances</span>
                <strong style={{ color: '#f1f5f9' }}>
                  {application.anyAlliance
                    ? 'Any active State 565 alliance'
                    : application.preferredAlliances?.map((a) => `${a.tag} (${a.name})`).join(', ') || 'None specified'}
                </strong>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: 12 }}>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Reason for Migrating</span>
                <p style={{ margin: '4px 0 0 0', color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.45 }}>
                  {application.migrationReason || 'None provided'}
                </p>
              </div>

              {application.additionalComments && (
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Additional Comments</span>
                  <p style={{ margin: '4px 0 0 0', color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.45 }}>
                    {application.additionalComments}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <Link
              href={`/apply/character?edit=${application.id}`}
              className="button button-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px' }}
            >
              <Edit size={16} /> Edit & Resubmit Application
            </Link>

            <button
              type="button"
              className="button button-secondary"
              onClick={() => handleRemoveTracked(application.id)}
              style={{ color: '#ef4444' }}
            >
              Remove from Saved Applications
            </button>
          </div>
        </div>
      )}

      {/* Modal: Track Another Application */}
      {trackModalOpen && (
        <div className="dialog-backdrop" style={{ zIndex: 9500 }}>
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="track-modal-title"
            style={{ maxWidth: 480 }}
          >
            <h2 id="track-modal-title" style={{ margin: '0 0 10px 0', fontSize: '1.25rem' }}>
              Track Application
            </h2>
            {/* <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 0 16px 0', lineHeight: 1.45 }}>
              Enter the unique Application ID (UUID) or Reference Code (e.g., 565-C62FE35E00D7) to view status and details.
            </p> */}

            <form onSubmit={handleAddTracked}>
              <div style={{ marginBottom: 16 }}>
                <label htmlFor="track-input-id" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                  Application ID or Reference
                </label>
                <input
                  id="track-input-id"
                  className="control"
                  placeholder="e.g. 565-C62FE35E00D7 or 8fa2b4..."
                  value={inputAppId}
                  onChange={(e) => setInputAppId(e.target.value)}
                  autoFocus
                />
                {trackError && (
                  <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 6 }}>
                    {trackError}
                  </div>
                )}
              </div>

              {/* <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 6,
                  padding: '10px 12px',
                  marginBottom: 20,
                  fontSize: '0.78rem',
                  color: '#fca5a5',
                  lineHeight: 1.4,
                }}
              >
                <strong>Notice:</strong> Anyone with this Application ID can track and edit application data.
              </div> */}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setTrackModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={trackLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  {trackLoading && <LoaderCircle size={14} className="spinner" />}
                  {trackLoading ? 'Searching...' : 'Track Application'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
