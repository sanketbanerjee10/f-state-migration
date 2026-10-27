import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Maximize2, Sofa, Users, X } from 'lucide-react';
import {
  getGetAdminApplicationQueryKey,
  getListAdminApplicationsQueryKey,
  getGetAdminOverviewQueryKey,
  useGetAdminApplication,
  useGetAdminTierThresholds,
  useUpdateAdminApplicationStatus,
  type ApplicationStatus,
} from '@/lib/api-client';
import {
  TIER_COLORS,
  rowsToTierThresholds,
  tierFromScore,
} from '../../lib/migrationScore';
import {
  MigrationScoreBadge,
  VerifiedBadge,
} from '../MigrationScoringGuide';
import { Modal } from '../Dialogs';

interface ApplicationDetailDrawerProps {
  applicationId: string;
  onClose: () => void;
  onNotice?: (msg: string) => void;
  onSessionError?: () => void;
}

export function ApplicationDetailDrawer({
  applicationId,
  onClose,
  onNotice,
  onSessionError,
}: ApplicationDetailDrawerProps) {
  const client = useQueryClient();
  const [modalContent, setModalContent] = useState<{ title: string; text: string } | null>(null);

  const detail = useGetAdminApplication(applicationId, {
    query: {
      queryKey: getGetAdminApplicationQueryKey(applicationId),
      enabled: !!applicationId,
    },
  });

  const tierThresholds = useGetAdminTierThresholds();
  const liveThresholds = useMemo(
    () => rowsToTierThresholds(tierThresholds.data),
    [tierThresholds.data],
  );

  const statusMutation = useUpdateAdminApplicationStatus();

  const changeStatus = async (newStatus: ApplicationStatus) => {
    if (!applicationId || statusMutation.isPending) return;
    try {
      await statusMutation.mutateAsync({
        id: applicationId,
        data: { status: newStatus },
      });
      onNotice?.(`Application marked ${newStatus.toLowerCase()}.`);
      void client.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
      void client.invalidateQueries({ queryKey: getListAdminApplicationsQueryKey() });
      void client.invalidateQueries({
        queryKey: getGetAdminApplicationQueryKey(applicationId),
      });
    } catch (error) {
      const statusCode = (error as { status?: number })?.status;
      if (statusCode === 401 || statusCode === 403) {
        onSessionError?.();
      }
      onNotice?.(
        error instanceof Error ? error.message : 'Failed to update status.',
      );
    }
  };

  const selected = detail.data;

  // Compute aggregate tier counts for players in this application
  const playerTierCounts = useMemo(() => {
    const counts = { Elite: 0, Advanced: 0, Medium: 0, Regular: 0 };
    if (selected?.players && selected.players.length > 0) {
      for (const p of selected.players) {
        if (p.migrationScore != null) {
          const tier = tierFromScore(Number(p.migrationScore), liveThresholds);
          counts[tier]++;
        } else {
          counts[selected.migrationTier || 'Regular']++;
        }
      }
    } else if (selected) {
      counts[selected.migrationTier || 'Regular'] = 1;
    }
    return counts;
  }, [selected, liveThresholds]);

  const activeTiers = (['Elite', 'Advanced', 'Medium', 'Regular'] as const).filter(
    (t) => playerTierCounts[t] > 0,
  );

  return (
    <>
      <div
        className="detail-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <aside
          className="detail-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Application review"
          data-testid="application-detail"
        >
          <div className="detail-top">
            <div>
              <span className="panel-kicker">APPLICATION REVIEW</span>
              <h2>
                {selected?.gameName ||
                  (detail.isLoading ? 'Loading application…' : 'Application')}
              </h2>
            </div>
            <button
              className="icon-button"
              aria-label="Close application details"
              onClick={onClose}
              data-testid="close-detail"
            >
              <X size={18} />
            </button>
          </div>

          {detail.isLoading ? (
            <div className="skeleton detail-skeleton" />
          ) : detail.isError ? (
            <div className="admin-error" role="alert">
              <span>
                {detail.error instanceof Error
                  ? detail.error.message
                  : 'Failed to load application details.'}
              </span>
              <button className="button" onClick={() => void detail.refetch()}>
                Retry
              </button>
            </div>
          ) : (
            selected && (
              <>
                <div className="detail-summary">
                  <span
                    className={`status-pill status-${selected.status.toLowerCase()}`}
                  >
                    {selected.status}
                  </span>
                  <span>
                    Submitted {new Date(selected.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Decision Action Bar */}
                <div
                  style={{
                    margin: '12px 0 16px',
                    padding: '12px 14px',
                    background: 'rgba(15, 23, 42, 0.7)',
                    borderRadius: 8,
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#93c5fd',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Application Decision
                    </span>
                    <span
                      className={`status-pill status-${selected.status.toLowerCase()}`}
                    >
                      Current: {selected.status}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: 8,
                    }}
                  >
                    <button
                      type="button"
                      className="button button-primary"
                      style={{
                        background:
                          selected.status === 'Approved' ? '#15803d' : '#166534',
                        borderColor: '#22c55e',
                        color: '#f0fdf4',
                        fontSize: 11,
                        padding: '7px 8px',
                      }}
                      disabled={
                        statusMutation.isPending || selected.status === 'Approved'
                      }
                      onClick={() => void changeStatus('Approved')}
                      data-testid="accept-application-btn"
                    >
                      {selected.status === 'Approved' ? '✓ Approved' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className="button button-danger"
                      style={{
                        background:
                          selected.status === 'Rejected' ? '#991b1b' : '#7f1d1d',
                        borderColor: '#ef4444',
                        color: '#fef2f2',
                        fontSize: 11,
                        padding: '7px 8px',
                      }}
                      disabled={
                        statusMutation.isPending || selected.status === 'Rejected'
                      }
                      onClick={() => void changeStatus('Rejected')}
                      data-testid="reject-application-btn"
                    >
                      {selected.status === 'Rejected' ? '✕ Rejected' : 'Reject'}
                    </button>
                    <button
                      type="button"
                      className="button button-quiet"
                      style={{
                        border: '1px solid #475569',
                        fontSize: 11,
                        padding: '7px 8px',
                      }}
                      disabled={
                        statusMutation.isPending || selected.status === 'Pending'
                      }
                      onClick={() => void changeStatus('Pending')}
                      data-testid="pending-application-btn"
                    >
                      {selected.status === 'Pending' ? '● Pending' : 'Set to Pending'}
                    </button>
                  </div>
                </div>

                {selected.migrationType === 'Group' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      borderRadius: 6,
                      marginBottom: 14,
                      color: '#bfdbfe',
                      fontSize: 12,
                    }}
                  >
                    <Users
                      size={16}
                      style={{ color: '#60a5fa', flexShrink: 0 }}
                    />
                    <span>
                      <strong>Group Migration:</strong>{' '}
                      {selected.players?.length || 1} people migrating together
                      under representative{' '}
                      <strong>
                        {selected.groupRepresentative || selected.gameName}
                      </strong>
                      .
                    </span>
                  </div>
                )}

                <div className="detail-data">
                  <DetailItem
                    label="Request type"
                    value={selected.migrationType}
                  />
                  {selected.groupRepresentative && (
                    <DetailItem
                      label="Group representative"
                      value={selected.groupRepresentative}
                    />
                  )}
                  <DetailItem
                    label="Current state"
                    value={`State ${selected.currentState}`}
                  />
                  <DetailItem
                    label="Current alliance"
                    value={selected.currentAlliance || 'None listed'}
                  />
                  <DetailItem
                    label="Migration tier"
                    value={selected.migrationTier}
                  />
                  <DetailItem
                    label="Preferred alliances"
                    value={
                      selected.anyAlliance
                        ? 'Any alliance'
                        : selected.preferredAlliances
                            .map((item) => `${item.tag} · ${item.name}`)
                            .join(', ') || 'No preference listed'
                    }
                  />

                  {/* ── Tier-based Player Count Aggregate (Above Reason) ── */}
                  <div
                    className="detail-item"
                    style={{
                      display: 'block',
                      background: 'rgba(255, 255, 255, 0.02)',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      margin: '8px 0',
                    }}
                    data-testid="detail-tier-breakdown"
                  >
                    <span
                      style={{
                        display: 'block',
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#94a3b8',
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      Player Tiers Breakdown
                    </span>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                      }}
                    >
                      {activeTiers.map((t) => {
                        const count = playerTierCounts[t];
                        const colors = TIER_COLORS[t];
                        return (
                          <span
                            key={t}
                            title={`${count} ${colors.label} player${count > 1 ? 's' : ''}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              fontSize: 12,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 4,
                              background: colors.bg,
                              border: `1px solid ${colors.border}`,
                              color: colors.text,
                            }}
                          >
                            <Sofa
                              size={13}
                              color={colors.iconColor}
                              strokeWidth={2.4}
                            />
                            <span>
                              {count} {colors.label}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Truncated Reason for Migrating with Modal View ── */}
                  <ExpandableTextItem
                    label="Reason for migrating"
                    text={selected.migrationReason}
                    onOpenModal={(title, text) => setModalContent({ title, text })}
                  />

                  {selected.characterReference ? (
                    <DetailItem
                      label="Character reference"
                      value={selected.characterReference}
                    />
                  ) : null}

                  {/* ── Truncated Additional Comments with Modal View ── */}
                  <ExpandableTextItem
                    label="Additional comments"
                    text={selected.additionalComments || 'Not provided'}
                    onOpenModal={(title, text) => setModalContent({ title, text })}
                  />

                  {/* ── Player Profiles / Roster ── */}
                  {selected.players && selected.players.length > 0 && (
                    <div
                      style={{
                        marginTop: 18,
                        borderTop: '1px solid #2f3d4b',
                        paddingTop: 14,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 10,
                        }}
                      >
                        <span
                          className="panel-kicker"
                          style={{ fontSize: 11 }}
                        >
                          {selected.migrationType === 'Group'
                            ? `GROUP ROSTER (${selected.players.length} PEOPLE)`
                            : `APPLICANT PLAYER PROFILE`}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gap: 10 }}>
                        {selected.players.map((p, idx) => (
                          <div
                            key={p.id}
                            style={{
                              padding: '11px 13px',
                              background: 'rgba(255, 255, 255, 0.03)',
                              borderRadius: 6,
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                            }}
                            data-testid={`detail-player-${p.id}`}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '83%',
                                marginBottom: 6,
                              }}
                            >
                              <div>
                                <strong
                                  style={{ color: '#f1f5f9', fontSize: 13 }}
                                >
                                  {p.playerName}
                                </strong>
                                <div
                                  style={{
                                    marginTop: 2,
                                    fontSize: 10,
                                    color: p.isApplicant ? '#93c5fd' : '#cbd5e1',
                                    background: p.isApplicant
                                      ? 'rgba(59, 130, 246, 0.15)'
                                      : 'rgba(255, 255, 255, 0.06)',
                                    padding: '2px 6px',
                                    borderRadius: 4,
                                  }}
                                >
                                  {p.isApplicant
                                    ? 'Primary Applicant / Rep'
                                    : `Group Member #${idx}`}
                                </div>
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  gap: 2,
                                  alignItems: 'center',
                                }}
                              >
                                {p.migrationScore != null &&
                                  (() => {
                                    const scoreVal = Number(p.migrationScore);
                                    const calculatedTier = tierFromScore(
                                      scoreVal,
                                      liveThresholds,
                                    );
                                    const calculatedPasses =
                                      calculatedTier === 'Elite'
                                        ? liveThresholds.elitePasses
                                        : calculatedTier === 'Advanced'
                                          ? liveThresholds.advancedPasses
                                          : calculatedTier === 'Medium'
                                            ? liveThresholds.mediumPasses
                                            : liveThresholds.regularPasses;

                                    return (
                                      <MigrationScoreBadge
                                        scoreResult={{
                                          score: scoreVal,
                                          tier: calculatedTier,
                                          passesRequired: calculatedPasses,
                                          breakdown: {
                                            baseComponent: 0,
                                            techVehicleBonus: 0,
                                            eliteTechBonus: 0,
                                          },
                                        }}
                                        playerName={p.playerName}
                                        size="sm"
                                        showDetailsText
                                        disableHover
                                      />
                                    );
                                  })()}
                                {p.isScreenshotVerified ? (
                                  <VerifiedBadge />
                                ) : (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color: '#94a3b8',
                                      background: 'rgba(255, 255, 255, 0.06)',
                                      padding: '2px 6px',
                                      borderRadius: 4,
                                    }}
                                  >
                                    Manual
                                  </span>
                                )}
                              </div>
                            </div>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                                gap: 4,
                                fontSize: 11,
                                color: '#94a3b8',
                              }}
                            >
                              <div>
                                State:{' '}
                                <strong style={{ color: '#e2e8f0' }}>
                                  {p.currentState}
                                </strong>
                              </div>
                              <div>
                                Power:{' '}
                                <strong style={{ color: '#e2e8f0' }}>
                                  {Number(p.highestPowerOnRecord).toLocaleString()}
                                </strong>
                              </div>
                              <div>
                                F1:{' '}
                                <strong style={{ color: '#e2e8f0' }}>
                                  {p.f1ArenaPower !== null && p.f1ArenaPower > 0
                                    ? Number(p.f1ArenaPower).toLocaleString()
                                    : '—'}
                                </strong>
                              </div>
                              <div>
                                Kills:{' '}
                                <strong style={{ color: '#e2e8f0' }}>
                                  {Number(p.kills).toLocaleString()}
                                </strong>
                              </div>
                              <div>
                                Alliance:{' '}
                                <strong style={{ color: '#e2e8f0' }}>
                                  {p.currentAlliance ||
                                    selected.currentAlliance ||
                                    '—'}
                                </strong>
                              </div>
                            </div>
                            {(p.structurePower > 0 ||
                              p.techPower > 0 ||
                              p.troopPower > 0 ||
                              p.heroPower > 0 ||
                              p.modVehiclePower > 0) && (
                              <div
                                style={{
                                  marginTop: 6,
                                  paddingTop: 6,
                                  borderTop:
                                    '1px dashed rgba(255, 255, 255, 0.06)',
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '4px 8px',
                                  fontSize: 10,
                                  color: '#64748b',
                                }}
                              >
                                <span>
                                  Struct:{' '}
                                  <strong style={{ color: '#cbd5e1' }}>
                                    {Number(p.structurePower).toLocaleString()}
                                  </strong>
                                </span>
                                <span>
                                  Tech:{' '}
                                  <strong style={{ color: '#cbd5e1' }}>
                                    {Number(p.techPower).toLocaleString()}
                                  </strong>
                                </span>
                                <span>
                                  Troop:{' '}
                                  <strong style={{ color: '#cbd5e1' }}>
                                    {Number(p.troopPower).toLocaleString()}
                                  </strong>
                                </span>
                                <span>
                                  Hero:{' '}
                                  <strong style={{ color: '#cbd5e1' }}>
                                    {Number(p.heroPower).toLocaleString()}
                                  </strong>
                                </span>
                                <span>
                                  Vehicle:{' '}
                                  <strong style={{ color: '#cbd5e1' }}>
                                    {Number(p.modVehiclePower).toLocaleString()}
                                  </strong>
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          )}
        </aside>
      </div>

      {/* ── Full Text Modal for Reason / Comments ── */}
      {modalContent && (
        <Modal
          title={modalContent.title}
          onClose={() => setModalContent(null)}
          actions={
            <button
              type="button"
              className="button button-primary"
              onClick={() => setModalContent(null)}
            >
              Close
            </button>
          }
        >
          <div
            style={{
              maxHeight: '60vh',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
              padding: '14px 16px',
              background: 'rgba(15, 23, 42, 0.65)',
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f1f5f9',
              fontSize: 13,
              margin: '10px 0',
            }}
          >
            {modalContent.text}
          </div>
        </Modal>
      )}
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ExpandableTextItem({
  label,
  text,
  onOpenModal,
  maxPreviewChars = 90,
}: {
  label: string;
  text: string;
  onOpenModal: (title: string, text: string) => void;
  maxPreviewChars?: number;
}) {
  const isLong = text.length > maxPreviewChars || text.includes('\n');
  const preview = isLong ? `${text.slice(0, maxPreviewChars).trim()}…` : text;

  return (
    <div
      className="detail-item"
      style={{
        display: 'block',
        cursor: isLong ? 'pointer' : 'default',
      }}
      onClick={() => {
        if (isLong) onOpenModal(label, text);
      }}
      title={isLong ? 'Click to view full text in modal' : undefined}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 3,
        }}
      >
        <span>{label}</span>
        {isLong && (
          <button
            type="button"
            className="link-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              fontSize: 10,
              color: '#60a5fa',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '1px 4px',
              borderRadius: 3,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onOpenModal(label, text);
            }}
          >
            <Maximize2 size={11} /> Expand
          </button>
        )}
      </div>
      <strong
        style={{
          display: 'block',
          whiteSpace: 'pre-wrap',
          color: isLong ? '#cbd5e1' : '#f1f5f9',
          fontStyle: isLong ? 'italic' : 'normal',
        }}
      >
        {preview}
      </strong>
    </div>
  );
}
