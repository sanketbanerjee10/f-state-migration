import { Sofa } from 'lucide-react';
import { MigrationScoreBadge } from '../../../components/MigrationScoringGuide';
import { TIER_COLORS, type MigrationScoreResult } from '../../../lib/migrationScore';

export type PowerScorePreviewCardProps = {
  t: (key: string, options?: Record<string, unknown>) => string;
  scoreResult: MigrationScoreResult | null;
  displayScoreResult: MigrationScoreResult | null;
};

export function PowerScorePreviewCard({ t, scoreResult, displayScoreResult }: PowerScorePreviewCardProps) {
  if (!scoreResult) return null;

  return (
    <div
      style={{
        marginTop: 18,
        padding: '14px 16px',
        borderRadius: 8,
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
        border: `1px solid ${TIER_COLORS[scoreResult.tier].border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      data-testid="migration-score-preview"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sofa size={19} color={TIER_COLORS[scoreResult.tier].iconColor} strokeWidth={2.3} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
            {t('wizard.power.estimatedScore')}
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: TIER_COLORS[scoreResult.tier].text,
              fontFamily: 'var(--app-font-mono)',
            }}
          >
            {displayScoreResult?.score.toFixed(2)}
          </span>
          <MigrationScoreBadge scoreResult={displayScoreResult} size="sm" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 4,
              background: TIER_COLORS[scoreResult.tier].bg,
              border: `1px solid ${TIER_COLORS[scoreResult.tier].border}`,
              color: TIER_COLORS[scoreResult.tier].text,
            }}
          >
            {t(`components.scoring.tiers.${scoreResult.tier.toLowerCase()}`)} {t('wizard.power.tier')}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '3px 8px',
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#cbd5e1',
            }}
          >
            {t('wizard.power.passesRequired', { passes: scoreResult.passesRequired })}
          </span>
        </div>
      </div>
    </div>
  );
}
