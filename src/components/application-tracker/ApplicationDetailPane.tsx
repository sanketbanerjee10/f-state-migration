import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'wouter';
import { Edit, Trash2, UserCheck, Users } from 'lucide-react';
import { MigrationScoreBadge, VerifiedBadge } from '../MigrationScoringGuide';
import { calculateMigrationScoreFromRaw, useLiveTierThresholds } from '../../lib/migrationScore';
import type { AdminApplication } from '@/lib/api-client';
import { CopyButton } from './CopyButton';
import { PowerStatCard } from './PowerStatCard';
import { SectionCard } from './SectionCard';
import { StatCell } from './StatCell';
import { StatusIcon } from './StatusIcon';
import { formatNumber, formatPowerInM, getReferenceCode, getStatusColors } from './trackerUtils';

/* ────────────────────────────────────────────────────────────
   Design tokens
   One place for colour, type and spacing so the pane stays
   consistent. Muted text is #94a3b8 (not #64748b) to meet
   WCAG AA contrast on the dark slate background.
   ──────────────────────────────────────────────────────────── */
const c = {
  heading: '#f8fafc',
  body: '#cbd5e1',
  muted: '#94a3b8',
  accent: '#60a5fa',
  group: '#a78bfa',
  danger: '#f87171',
  divider: 'rgba(148, 163, 184, 0.16)',
  inset: 'rgba(2, 6, 23, 0.35)',
};

const fs = {
  title: '1.25rem',
  heading: '1rem',
  body: '0.875rem',
  small: '0.8125rem',
};

const s: Record<string, CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column' },

  /* Status banner */
  banner: { borderRadius: 10, padding: '18px 20px', marginBottom: 16 },
  bannerTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 },
  statusRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 },
  statusTitle: { margin: 0, fontSize: fs.title, fontWeight: 700, lineHeight: 1.2 },
  statusText: { margin: 0, color: c.body, fontSize: fs.body, lineHeight: 1.5, maxWidth: '60ch' },
  editButton: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', fontSize: fs.body, flexShrink: 0 },

  /* Meta strip (reference / id / submitted) */
  meta: { display: 'flex', flexWrap: 'wrap', gap: '12px 32px', margin: '16px 0 0', paddingTop: 14, borderTop: `1px solid ${c.divider}` },

  /* Field = label + value, used everywhere */
  label: { margin: '0 0 3px', fontSize: fs.small, color: c.muted, fontWeight: 500 },
  value: { margin: 0, fontSize: fs.body, color: c.heading, fontWeight: 600, lineHeight: 1.4 },

  /* Card headers */
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  cardTitleWrap: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  cardTitle: { margin: 0, fontSize: fs.heading, fontWeight: 600, color: c.heading },
  cardAside: { fontSize: fs.small, color: c.muted },

  /* Applicant */
  statStrip: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, background: c.inset, border: `1px solid ${c.divider}`, borderRadius: 8, padding: '12px 16px' },
  subSection: { marginTop: 18, paddingTop: 16, borderTop: `1px solid ${c.divider}` },
  subHeading: { margin: '0 0 10px', fontSize: fs.small, fontWeight: 600, color: c.muted },
  powerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 },

  /* Group roster */
  rosterList: { listStyle: 'none', margin: 0, padding: 0, border: `1px solid ${c.divider}`, borderRadius: 8, overflow: 'hidden' },
  rosterRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px 20px', padding: '12px 16px', background: c.inset },
  rosterName: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 160, color: c.heading, fontSize: fs.body, fontWeight: 600 },
  rosterStats: { display: 'flex', flexWrap: 'wrap', gap: '4px 20px', margin: 0, fontSize: fs.small, color: c.muted },
  rosterStat: { display: 'inline-flex', gap: 6, margin: 0 },
  rosterStatValue: { margin: 0, color: c.body, fontWeight: 600 },
  empty: { margin: 0, color: c.muted, fontSize: fs.body },

  /* Preferences */
  fieldGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, margin: 0 },
  prose: { margin: 0, color: c.body, fontSize: fs.body, lineHeight: 1.6, maxWidth: '70ch' },
  proseBlock: { display: 'flex', flexDirection: 'column', gap: 16 },

  /* Footer */
  footer: { display: 'flex', justifyContent: 'flex-end', paddingTop: 4, paddingBottom: 8 },
  removeButton: { display: 'inline-flex', alignItems: 'center', gap: 8, color: c.danger },
};

/* ────────────────────────────────────────────────────────────
   Small local helpers
   ──────────────────────────────────────────────────────────── */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt style={s.label}>{label}</dt>
      <dd style={s.value}>{children}</dd>
    </div>
  );
}

function CardHeading({
  icon,
  title,
  aside,
}: {
  icon: ReactNode;
  title: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div style={s.cardHeader}>
      <div style={s.cardTitleWrap}>
        {icon}
        <h3 style={s.cardTitle}>{title}</h3>
      </div>
      {aside}
    </div>
  );
}

function RosterStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={s.rosterStat}>
      <dt>{label}</dt>
      <dd style={s.rosterStatValue}>{value}</dd>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────── */
interface ApplicationDetailPaneProps {
  application: AdminApplication;
  onRemove: () => void;
}

export function ApplicationDetailPane({ application, onRemove }: ApplicationDetailPaneProps) {
  const { thresholds } = useLiveTierThresholds();
  const applicantPlayer = application.players?.find((p) => p.isApplicant);
  const groupPlayers = application.players?.filter((p) => !p.isApplicant) || [];
  const referenceCode = getReferenceCode(application.id);
  const colors = getStatusColors(application.status);

  const statusMessage =
    application.status === 'Approved'
      ? 'Congratulations! Your application has been approved by State 565 leadership.'
      : application.status === 'Rejected'
      ? 'Your application was not accepted at this time.'
      : 'Your application is currently pending review by State 565 alliance leadership.';

  const submittedAt = application.createdAt ? new Date(application.createdAt) : null;

  return (
    <div style={s.root}>
      {/* ── Status banner ── */}
      <section
        aria-label="Application status"
        style={{
          ...s.banner,
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderLeft: `4px solid ${colors.text}`,
        }}
      >
        <div style={s.bannerTop}>
          <div>
            <div style={s.statusRow}>
              <StatusIcon status={application.status} size={22} />
              <h2 style={{ ...s.statusTitle, color: colors.text }}>{application.status}</h2>
            </div>
            <p style={s.statusText}>{statusMessage}</p>
          </div>

          <Link
            href={`/apply/character?edit=${application.id}`}
            className="button button-primary"
            style={s.editButton}
          >
            <Edit size={16} aria-hidden /> Edit &amp; resubmit
          </Link>
        </div>

        <dl style={s.meta}>
          <Field label="Reference">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: c.accent }}>
              {referenceCode}
              <CopyButton value={referenceCode} />
            </span>
          </Field>
          <Field label="Application ID">
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                fontSize: fs.small,
                fontWeight: 500,
                color: c.body,
              }}
            >
              {application.id}
              <CopyButton value={application.id} />
            </span>
          </Field>
          <Field label="Submitted">
            {submittedAt ? (
              <time dateTime={submittedAt.toISOString()} style={{ fontWeight: 500, color: c.body }}>
                {submittedAt.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </time>
            ) : (
              <span style={{ fontWeight: 500, color: c.muted }}>Not available</span>
            )}
          </Field>
        </dl>
      </section>

      {/* ── Applicant ── */}
      <SectionCard>
        <CardHeading
          icon={<UserCheck size={18} style={{ color: c.accent }} aria-hidden />}
          title={
            <>
              {application.gameName}
              {applicantPlayer?.isScreenshotVerified && (
                <span style={{ marginLeft: 8, verticalAlign: 'middle' }}>
                  <VerifiedBadge />
                </span>
              )}
            </>
          }
          aside={
            applicantPlayer && (
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
            )
          }
        />

        <div style={s.statStrip}>
          <StatCell label="Current state" value={`State #${application.currentState}`} />
          <StatCell label="Alliance" value={application.currentAlliance || 'None'} />
          <StatCell label="Kills" value={formatNumber(application.kills)} />
          <StatCell
            label="Highest power"
            value={
              applicantPlayer
                ? formatPowerInM(applicantPlayer.highestPowerOnRecord)
                : formatPowerInM(application.f1ArenaPower)
            }
          />
        </div>

        {applicantPlayer && (
          <div style={s.subSection}>
            <h4 style={s.subHeading}>Power breakdown</h4>
            <div style={s.powerGrid}>
              <PowerStatCard label="Structure" value={formatPowerInM(applicantPlayer.structurePower)} />
              <PowerStatCard label="Tech" value={formatPowerInM(applicantPlayer.techPower)} />
              <PowerStatCard label="Troop" value={formatPowerInM(applicantPlayer.troopPower)} />
              <PowerStatCard label="Hero" value={formatPowerInM(applicantPlayer.heroPower)} />
              <PowerStatCard label="Vehicle" value={formatPowerInM(applicantPlayer.modVehiclePower)} />
              <PowerStatCard label="F1 Arena" value={formatPowerInM(application.f1ArenaPower)} />
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Group roster ── */}
      {application.migrationType === 'Group' && (
        <SectionCard>
          <CardHeading
            icon={<Users size={18} style={{ color: c.group }} aria-hidden />}
            title="Group roster"
            aside={
              <span style={s.cardAside}>
                {groupPlayers.length} additional {groupPlayers.length === 1 ? 'member' : 'members'}
              </span>
            }
          />

          {groupPlayers.length === 0 ? (
            <p style={s.empty}>No additional group members are attached to this application.</p>
          ) : (
            <ul style={s.rosterList}>
              {groupPlayers.map((member, index) => {
                const memberScore = calculateMigrationScoreFromRaw(
                  member.structurePower,
                  member.techPower,
                  member.heroPower,
                  member.modVehiclePower,
                  thresholds
                );
                return (
                  <li
                    key={member.id || index}
                    style={{
                      ...s.rosterRow,
                      borderTop: index === 0 ? 'none' : `1px solid ${c.divider}`,
                    }}
                  >
                    <div style={s.rosterName}>
                      {member.playerName}
                      {member.isScreenshotVerified && <VerifiedBadge />}
                    </div>

                    <dl style={s.rosterStats}>
                      <RosterStat label="Kills" value={formatNumber(member.kills)} />
                      <RosterStat label="Power" value={formatPowerInM(member.highestPowerOnRecord)} />
                      <RosterStat label="Tech" value={formatPowerInM(member.techPower)} />
                      <RosterStat label="Vehicle" value={formatPowerInM(member.modVehiclePower)} />
                    </dl>

                    <MigrationScoreBadge
                      scoreResult={memberScore}
                      playerName={member.playerName}
                      size="sm"
                      showDetailsText
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      )}

      {/* ── Preferences & background ── */}
      <SectionCard>
        <h3 style={{ ...s.cardTitle, marginBottom: 16 }}>Migration preferences</h3>

        <dl style={s.fieldGrid}>
          <Field label="Migration type">
            {application.migrationType}
            {application.groupRepresentative && (
              <span style={{ display: 'block', marginTop: 2, fontSize: fs.small, fontWeight: 400, color: c.muted }}>
                Representative: {application.groupRepresentative}
              </span>
            )}
          </Field>
          <Field label="Declared tier">{application.migrationTier}</Field>
          <Field label="Preferred alliances">
            {application.anyAlliance
              ? 'Any active State 565 alliance'
              : application.preferredAlliances?.map((a) => `${a.tag} (${a.name})`).join(', ') || 'None specified'}
          </Field>
        </dl>

        <div style={{ ...s.subSection, ...s.proseBlock }}>
          <div>
            <h4 style={s.subHeading}>Reason for migrating</h4>
            <p style={s.prose}>{application.migrationReason || 'None provided'}</p>
          </div>
          {application.additionalComments && (
            <div>
              <h4 style={s.subHeading}>Additional comments</h4>
              <p style={s.prose}>{application.additionalComments}</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Footer ── */}
      <div style={s.footer}>
        <button type="button" className="button button-secondary" onClick={onRemove} style={s.removeButton}>
          <Trash2 size={15} aria-hidden /> Remove from saved
        </button>
      </div>
    </div>
  );
}