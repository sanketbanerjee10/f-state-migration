import { Swords } from 'lucide-react';
import { VerifiedBadge } from '../../../components/MigrationScoringGuide';
import { parseMagnitude } from '../../../lib/parsers';
import { calculateMigrationScoreFromRaw, TIER_COLORS, type TierThresholds } from '../../../lib/migrationScore';
import type { ApplicationDraft } from '../../../hooks/useApplicationDraft';
import type { GroupMember } from '../../../types/application';

export type ReviewRosterMemberCardProps = {
  member: GroupMember;
  draft: ApplicationDraft;
  index: number;
  t: (key: string, options?: Record<string, unknown>) => string;
  thresholds: TierThresholds;
};

export function ReviewRosterMemberCard({ member, draft, index, t, thresholds }: ReviewRosterMemberCardProps) {
  const ms = parseMagnitude(member.structurePower) || 0;
  const mt = parseMagnitude(member.techPower) || 0;
  const mh = parseMagnitude(member.heroPower) || 0;
  const mv = parseMagnitude(member.modVehiclePower) || 0;
  const mScore = calculateMigrationScoreFromRaw(ms, mt, mh, mv, thresholds);
  const t10Complete = member.t10ResearchComplete === true;
  const t10Percent = t10Complete ? '100' : member.t10ResearchPercent.trim() || '—';

  return (
    <div
      key={member.id}
      style={{
        background: 'rgba(255,255,255,0.03)',
        padding: '8px 10px',
        borderRadius: 6,
        fontSize: 11,
      }}
      data-testid={`review-group-member-${index}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: '#93c5fd' }}>{member.playerName}</span>
          {member.isScreenshotVerified ? (
            <VerifiedBadge />
          ) : (
            <span
              style={{
                fontSize: 9,
                color: '#94a3b8',
                background: 'rgba(255,255,255,0.06)',
                padding: '2px 5px',
                borderRadius: 4,
              }}
            >
              {t('wizard.roster.manual')}
            </span>
          )}
          <span
            data-testid={`review-group-member-t10-${index}`}
            aria-label={`T10: ${t10Percent}%`}
            title={`T10: ${t10Percent}%`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              color: t10Complete ? '#4ade80' : '#f87171',
              background: t10Complete ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
              border: `1px solid ${t10Complete ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)'}`,
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            <Swords size={12} />
            T10: {t10Percent}%
          </span>
        </div>
        {mScore && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: TIER_COLORS[mScore.tier].text,
              background: TIER_COLORS[mScore.tier].bg,
              border: `1px solid ${TIER_COLORS[mScore.tier].border}`,
              padding: '1px 5px',
              borderRadius: 3,
            }}
          >
            {mScore.score.toFixed(2)} · {t(`wizard.preferences.tiers.${mScore.tier.toLowerCase()}`)}
          </span>
        )}
      </div>
      <div style={{ color: '#94a3b8', marginTop: 3 }}>
        {t('common.labels.power')} {member.highestPowerOnRecord} · {t('common.labels.kills')} {member.kills}
      </div>
      <div style={{ color: '#64748b', fontSize: 10 }}>
        {t('common.labels.alliance')} {member.currentAlliance || draft.currentAlliance || '—'}
      </div>
    </div>
  );
}
