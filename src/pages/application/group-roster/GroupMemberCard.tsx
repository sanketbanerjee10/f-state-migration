import type { TFunction } from 'i18next';
import { Edit2, Trash2 } from 'lucide-react';
import { MigrationScoreBadge, VerifiedBadge } from '../../../components/MigrationScoringGuide';
import type { ApplicationDraft } from '../../../hooks/useApplicationDraft';
import { parseMagnitude } from '../../../lib/parsers';
import { calculateMigrationScoreFromRaw, type TierThresholds } from '../../../lib/migrationScore';
import type { GroupMember } from '../../../types/application';

export type GroupMemberCardProps = {
  member: GroupMember;
  index: number;
  draft: ApplicationDraft;
  thresholds: TierThresholds;
  onEdit: (member: GroupMember) => void;
  onRemove: (memberId: string) => void;
  t: TFunction;
};

export function GroupMemberCard({ member, index, draft, thresholds, onEdit, onRemove, t }: GroupMemberCardProps) {
  const mStruct = parseMagnitude(member.structurePower) || 0;
  const mTech = parseMagnitude(member.techPower) || 0;
  const mHero = parseMagnitude(member.heroPower) || 0;
  const mVeh = parseMagnitude(member.modVehiclePower) || 0;
  const mScore = calculateMigrationScoreFromRaw(mStruct, mTech, mHero, mVeh, thresholds);
  const t10Complete = mTech >= 25_000_000 || member.t10ResearchComplete === true;

  return (
    <div className="group-member-card" data-testid={`group-member-item-${index}`}>
      <div className="group-member-top">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <strong className="group-member-name">{member.playerName}</strong>
          {member.isScreenshotVerified ? (
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
              {t('wizard.roster.manual')}
            </span>
          )}
          {mScore && <MigrationScoreBadge scoreResult={mScore} playerName={member.playerName} size="sm" />}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            type="button"
            className="button button-quiet button-sm"
            onClick={() => onEdit(member)}
            title={t('wizard.roster.editMemberDetails')}
            aria-label={t('wizard.roster.editMemberDetails')}
            data-testid={`edit-member-${index}`}
          >
            <Edit2 size={13} />
          </button>
          <button
            type="button"
            className="button button-quiet button-sm button-danger-text"
            onClick={() => onRemove(member.id)}
            title={t('wizard.roster.removeMember')}
            aria-label={t('wizard.roster.removeMember')}
            data-testid={`remove-member-${index}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="group-member-stats">
        <div>
          <span>{t('wizard.roster.stateLabel')}</span>
          <strong>{member.currentState || draft.currentState || '—'}</strong>
        </div>
        <div>
          <span>{t('wizard.roster.power')}</span>
          <strong>{member.highestPowerOnRecord}</strong>
        </div>
        <div>
          <span>{t('wizard.roster.killsLabel')}</span>
          <strong>{member.kills}</strong>
        </div>
        <div>
          <span>{t('wizard.roster.allianceLabel')}</span>
          <strong>{member.currentAlliance || draft.currentAlliance || '—'}</strong>
        </div>
      </div>

      <div className="group-member-breakdown">
        <span>
          {t('wizard.roster.structureShort')} <strong>{member.structurePower}</strong>
        </span>
        <span>
          {t('wizard.roster.techShort')} <strong>{member.techPower}</strong>
        </span>
        <span>
          {t('wizard.roster.troopShort')} <strong>{member.troopPower}</strong>
        </span>
        <span>
          {t('wizard.roster.heroShort')} <strong>{member.heroPower}</strong>
        </span>
        <span>
          {t('wizard.roster.vehicleShort')} <strong>{member.modVehiclePower}</strong>
        </span>
      </div>
      <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 11 }}>
        {t('wizard.combat.t10Title')}:{' '}
        {t10Complete
          ? t('wizard.combat.t10Yes')
          : member.t10ResearchComplete === false && member.t10ResearchPercent
            ? t('wizard.combat.t10ProgressSummary', { percent: member.t10ResearchPercent })
            : t('wizard.review.notProvided')}
      </div>
    </div>
  );
}
