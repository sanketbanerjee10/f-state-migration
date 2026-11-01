import type { TFunction } from 'i18next';
import { Users } from 'lucide-react';
import type { ApplicationDraft } from '../../../hooks/useApplicationDraft';
import type { GroupMember } from '../../../types/application';
import { GroupMemberCard } from './GroupMemberCard';
import type { TierThresholds } from '../../../lib/migrationScore';

export type MemberRosterListProps = {
  members: GroupMember[];
  draft: ApplicationDraft;
  thresholds: TierThresholds;
  onEdit: (member: GroupMember) => void;
  onRemove: (id: string) => void;
  t: TFunction;
};

export function MemberRosterList({ members, draft, thresholds, onEdit, onRemove, t }: MemberRosterListProps) {
  if (members.length === 0) {
    return (
      <div className="empty-state compact-empty" style={{ padding: '12px 10px 20px' }}>
        <Users size={24} />
        <strong>{t('wizard.roster.emptyTitle')}</strong>
        <span>{t('wizard.roster.emptyDescription')}</span>
      </div>
    );
  }

  return (
    <div className="group-members-grid" data-testid="group-members-list">
      {members.map((member, idx) => (
        <GroupMemberCard
          key={member.id}
          member={member}
          index={idx}
          draft={draft}
          thresholds={thresholds}
          onEdit={onEdit}
          onRemove={onRemove}
          t={t}
        />
      ))}
    </div>
  );
}
