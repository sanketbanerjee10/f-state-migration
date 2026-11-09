import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ExternalLink, ShieldAlert, ShieldCheck, Users } from 'lucide-react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { useSubmitMigrationApplication } from '@/lib/api-client';
import { FormSection } from '../../components/Field';
import { StepLayout } from '../../components/form/StepLayout';
import { parseMagnitude, parseStateNumber } from '../../lib/parsers';
import { calculateMigrationScoreFromRaw, TIER_COLORS, useLiveTierThresholds } from '../../lib/migrationScore';
import { ApplicationDeletedError } from '../../lib/applicationDetailsCache';
import { saveTrackedApplication } from '../../lib/trackedApplications';
import type { MigrationTier, MigrationType } from '../../types/application';
import { useApplicationDraft, type StepErrors } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';
import { ReviewSummarySection } from './review/ReviewSummarySection';
import { ReviewRosterMemberCard } from './review/ReviewRosterMemberCard';
import { ReviewConfirmModal } from './review/ReviewConfirmModal';

export function ApplicationReviewStep() {
  const { t } = useTranslation();
  const { draft, validateAll, clearDraft, setNavigationNotice } = useApplicationDraft();
  const { prevStep, goToStep, isGroup } = useWizardNavigation();
  const [, setLocation] = useLocation();
  const { thresholds } = useLiveTierThresholds();

  const [stepErrors, setStepErrors] = useState<StepErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const idempotencyRef = useRef<string | null>(null);
  const submitMutation = useSubmitMigrationApplication();

  // Compute effective migration type for display & submission:
  // If user selected Group but added 0 members, downgrade to Individual at submit time.
  const displayMigrationType: MigrationType =
    draft.migrationType === 'Group' && draft.groupMembers.length === 0
      ? 'Individual'
      : (draft.migrationType as MigrationType);
  const applicantTier =
    calculateMigrationScoreFromRaw(
      parseMagnitude(draft.structurePower) || 0,
      parseMagnitude(draft.techPower) || 0,
      parseMagnitude(draft.heroPower) || 0,
      parseMagnitude(draft.modVehiclePower) || 0,
      thresholds,
    )?.tier || 'Regular';

  const handleOpenConfirm = () => {
    // Validate all preceding stages
    const allErrors = validateAll();
    if (Object.keys(allErrors).length > 0) {
      setNavigationNotice(Object.values(allErrors)[0]);
      if (
        allErrors.playerName ||
        allErrors.highestPowerOnRecord ||
        allErrors.kills ||
        allErrors.structurePower ||
        allErrors.techPower ||
        allErrors.troopPower ||
        allErrors.heroPower ||
        allErrors.modVehiclePower
      ) {
        goToStep('character');
        return;
      }
      if (allErrors.currentState || allErrors.currentAlliance || allErrors.f1 || allErrors.f2 || allErrors.f3) {
        goToStep('combat');
        return;
      }
      if (allErrors.preferredAlliances || allErrors.migrationType || allErrors.representative || allErrors.reason) {
        goToStep('migration');
        return;
      }
      setStepErrors(allErrors);
      return;
    }

    setNavigationNotice('');
    setStepErrors({});
    setConfirmOpen(true);
  };

  const confirmSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    const isEditing = Boolean(draft.editingApplicationId);

    try {
      if (!idempotencyRef.current) {
        idempotencyRef.current = crypto.randomUUID();
      }

      const anyAlliance = draft.preferredAlliances.includes('any');
      // Auto-downgrade: if type is Group but no members added, treat as Individual
      const effectiveMigrationType: MigrationType =
        draft.migrationType === 'Group' && draft.groupMembers.length === 0
          ? 'Individual'
          : (draft.migrationType as MigrationType);
      const verifiedTag = draft.hasScreenshot ? '[Screenshot Verified]' : null;
      const groupNote = draft.groupMembers.length > 0 ? `[Group Members: ${draft.groupMembers.length}]` : null;
      const comments = [draft.comments.trim(), verifiedTag, groupNote].filter(Boolean).join(' ') || null;

      const mappedGroupMembers =
        draft.migrationType === 'Group' && draft.groupMembers.length > 0
          ? draft.groupMembers.map((m) => ({
              playerName: m.playerName.trim(),
              highestPowerOnRecord: Math.max(0, Math.round(parseMagnitude(m.highestPowerOnRecord) || 0)),
              structurePower: Math.max(0, Math.round(parseMagnitude(m.structurePower) || 0)),
              techPower: Math.max(0, Math.round(parseMagnitude(m.techPower) || 0)),
              troopPower: Math.max(0, Math.round(parseMagnitude(m.troopPower) || 0)),
              heroPower: Math.max(0, Math.round(parseMagnitude(m.heroPower) || 0)),
              modVehiclePower: Math.max(0, Math.round(parseMagnitude(m.modVehiclePower) || 0)),
              kills: m.kills.trim() ? Math.max(0, Math.round(parseMagnitude(m.kills, true) || 0)) : null,
              currentAlliance: (m.currentAlliance || draft.currentAlliance).trim(),
              currentState: parseStateNumber(m.currentState || draft.currentState) as number,
              ...(m.f1ArenaPower && parseMagnitude(m.f1ArenaPower)
                ? { f1ArenaPower: Math.round(parseMagnitude(m.f1ArenaPower) as number) }
                : {}),
              ...(m.f2ArenaPower && parseMagnitude(m.f2ArenaPower)
                ? { f2ArenaPower: Math.round(parseMagnitude(m.f2ArenaPower) as number) }
                : {}),
              ...(m.f3ArenaPower && parseMagnitude(m.f3ArenaPower)
                ? { f3ArenaPower: Math.round(parseMagnitude(m.f3ArenaPower) as number) }
                : {}),
              t10ResearchComplete:
                (parseMagnitude(m.techPower) || 0) >= 25_000_000 ||
                m.t10ResearchComplete === true,
              t10ResearchPercent:
                (parseMagnitude(m.techPower) || 0) >= 25_000_000 ||
                m.t10ResearchComplete === true
                  ? null
                  : Number(m.t10ResearchPercent),
              isScreenshotVerified: Boolean(m.isScreenshotVerified),
            }))
          : undefined;

      const applicantHighestPower = Math.max(
        0,
        Math.round(parseMagnitude(draft.highestPowerOnRecord || draft.f1) || 0)
      );

      const autoCalculatedTier: MigrationTier = (() => {
        const s = parseMagnitude(draft.structurePower) || 0;
        const tech = parseMagnitude(draft.techPower) || 0;
        const h = parseMagnitude(draft.heroPower) || 0;
        const v = parseMagnitude(draft.modVehiclePower) || 0;
        const scoreRes = calculateMigrationScoreFromRaw(s, tech, h, v, thresholds);
        return (scoreRes?.tier || 'Regular') as MigrationTier;
      })();

      const payload = {
        idempotencyKey: idempotencyRef.current,
        gameName: draft.playerName.trim(),
        currentState: parseStateNumber(draft.currentState) as number,
        currentAlliance: draft.currentAlliance.trim(),
        f1ArenaPower: Math.round(parseMagnitude(draft.f1) as number),
        f2ArenaPower: Math.round(parseMagnitude(draft.f2) as number),
        f3ArenaPower: Math.round(parseMagnitude(draft.f3) as number),
        kills: draft.kills.trim() ? Math.round(parseMagnitude(draft.kills, true) || 0) : null,
        preferredAllianceIds: anyAlliance ? [] : draft.preferredAlliances.map(Number),
        anyAlliance,
        migrationTier: autoCalculatedTier,
        migrationType: effectiveMigrationType,
        groupRepresentative: effectiveMigrationType === 'Group' ? draft.representative.trim() : null,
        migrationReason: draft.reason.trim(),
        additionalComments: comments,
        highestPowerOnRecord: applicantHighestPower,
        structurePower: Math.max(0, Math.round(parseMagnitude(draft.structurePower) || 0)),
        techPower: Math.max(0, Math.round(parseMagnitude(draft.techPower) || 0)),
        troopPower: Math.max(0, Math.round(parseMagnitude(draft.troopPower) || 0)),
        heroPower: Math.max(0, Math.round(parseMagnitude(draft.heroPower) || 0)),
        modVehiclePower: Math.max(0, Math.round(parseMagnitude(draft.modVehiclePower) || 0)),
        isScreenshotVerified: Boolean(draft.hasScreenshot),
        t10ResearchComplete:
          (parseMagnitude(draft.techPower) || 0) >= 25_000_000 ||
          draft.t10ResearchComplete === true,
        t10ResearchPercent:
          (parseMagnitude(draft.techPower) || 0) >= 25_000_000 ||
          draft.t10ResearchComplete === true
            ? null
            : Number(draft.t10ResearchPercent),
        groupMembers: mappedGroupMembers,
      };
      let resultData: { message: string; applicationReference: string; applicationId?: string };

      if (isEditing && draft.editingApplicationId) {
        const res = await fetch(`/api/applications/${encodeURIComponent(draft.editingApplicationId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          if (res.status === 404) throw new ApplicationDeletedError();
          throw new Error('Application update failed');
        }
        resultData = await res.json();
      } else {
        const res = await submitMutation.mutateAsync({ data: payload });
        resultData = res as any;
      }

      const resolvedAppId = resultData.applicationId || draft.editingApplicationId || '';
      if (!resolvedAppId) {
        throw new Error('The application was submitted without an application ID.');
      }

      // Save to localStorage tracked applications
      saveTrackedApplication({
        id: resolvedAppId,
        reference: resultData.applicationReference,
        gameName: draft.playerName.trim(),
        migrationType: draft.migrationType || 'Individual',
        status: 'Pending',
        submittedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      });

      setConfirmOpen(false);
      idempotencyRef.current = null;
      clearDraft(true);
      setLocation(
        `/application-submitted/${encodeURIComponent(resolvedAppId)}${isEditing ? '?updated=1' : ''}`,
      );
    } catch (error) {
      setConfirmOpen(false);
      toast.error(
        error instanceof ApplicationDeletedError
          ? t('wizard.review.deleted')
          : isEditing
            ? t('wizard.review.updateFailed')
            : t('wizard.review.submitFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <StepLayout
      navigationProps={{
        onContinue: handleOpenConfirm,
        onBack: prevStep,
        continueLabel: t('wizard.review.confirm'),
        submitting,
        submitMode: true,
      }}
    >
      <FormSection number={isGroup ? '05' : '04'} title={t('wizard.review.title')}>
        <div className="review-summary-card" data-testid="review-summary-card">
          <div className="review-summary-top">
            <h3 className="review-summary-title">
              <ShieldCheck size={18} className="review-shield-icon" />
              {t('wizard.review.overview')}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="review-summary-tag">{t('wizard.review.finalCheck')}</div>
              {draft.hasScreenshot && (
                <div className="verified-badge" data-testid="verified-badge">
                  <CheckCircle2 size={13} /> {t('wizard.review.verified')}
                </div>
              )}
            </div>
          </div>

          <div className="review-summary-grid">
            <ReviewSummarySection
              title={t('wizard.review.characterTitle')}
              onEdit={() => goToStep('character')}
              editTestId="edit-character-summary"
              t={t}
            >
              <div className="review-item"><span>{t('common.labels.name')}</span> <strong>{draft.playerName || t('wizard.review.notProvided')}</strong></div>
              <div className="review-item"><span>{t('common.labels.kills')}</span> <strong>{draft.kills || t('wizard.review.notProvided')}</strong></div>
              <div className="review-item"><span>{t('common.labels.power')}</span> <strong>{draft.highestPowerOnRecord || t('wizard.review.notProvided')}</strong></div>
              <div className="review-item"><span>{t('common.labels.structurePower')}</span> <strong>{draft.structurePower || t('wizard.review.notProvided')}</strong></div>
              <div className="review-item"><span>{t('common.labels.techPower')}</span> <strong>{draft.techPower || t('wizard.review.notProvided')}</strong></div>
              <div className="review-item"><span>{t('common.labels.troopPower')}</span> <strong>{draft.troopPower || t('wizard.review.notProvided')}</strong></div>
              <div className="review-item"><span>{t('common.labels.heroPower')}</span> <strong>{draft.heroPower || t('wizard.review.notProvided')}</strong></div>
              <div className="review-item"><span>{t('common.labels.vehiclePower')}</span> <strong>{draft.modVehiclePower || t('wizard.review.notProvided')}</strong></div>
              {(() => {
                const s = parseMagnitude(draft.structurePower) || 0;
                const tech = parseMagnitude(draft.techPower) || 0;
                const h = parseMagnitude(draft.heroPower) || 0;
                const v = parseMagnitude(draft.modVehiclePower) || 0;
                const scoreRes = calculateMigrationScoreFromRaw(s, tech, h, v, thresholds);
                if (!scoreRes) return null;
                return (
                  <div className="review-item" style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed rgba(255, 255, 255, 0.08)' }}>
                    <span>{t('wizard.review.score')}</span>
                    <strong style={{ color: TIER_COLORS[scoreRes.tier].text }}>
                      {scoreRes.score.toFixed(2)} ({t(`wizard.preferences.tiers.${scoreRes.tier.toLowerCase()}`)})
                    </strong>
                  </div>
                );
              })()}
            </ReviewSummarySection>

            <ReviewSummarySection
              title={t('wizard.review.combatTitle')}
              onEdit={() => goToStep('combat')}
              editTestId="edit-combat-summary"
              t={t}
            >
              <div className="review-item"><span>{t('common.labels.state')}</span> <strong>{t('wizard.review.currentStateNumber', { state: draft.currentState || '—' })}</strong></div>
              <div className="review-item"><span>{t('common.labels.alliance')}</span> <strong>{draft.currentAlliance || '—'}</strong></div>
              <div className="review-item"><span>{t('wizard.review.f1')}</span> <strong>{draft.f1 || '—'}</strong></div>
              <div className="review-item"><span>{t('wizard.review.f2')}</span> <strong>{draft.f2 || '—'}</strong></div>
              <div className="review-item"><span>{t('wizard.review.f3')}</span> <strong>{draft.f3 || '—'}</strong></div>
              <div className="review-item">
                <span>{t('wizard.combat.t10Title')}</span>
                <strong>
                  {(parseMagnitude(draft.techPower) || 0) >= 25_000_000 ||
                  draft.t10ResearchComplete === true
                    ? t('wizard.combat.t10Yes')
                    : draft.t10ResearchComplete === false
                      ? t('wizard.combat.t10ProgressSummary', {
                          percent: draft.t10ResearchPercent || '—',
                        })
                      : '—'}
                </strong>
              </div>
            </ReviewSummarySection>

            <ReviewSummarySection
              title={t('wizard.review.migrationTitle')}
              onEdit={() => goToStep('migration')}
              editTestId="edit-preferences-summary"
              t={t}
            >
              <div className="review-item"><span>{t('wizard.review.migrationType')}</span> <strong>{displayMigrationType === 'Group' ? t('common.labels.group') : t('common.labels.individual')}{displayMigrationType !== draft.migrationType && <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>{t('wizard.review.individualNote')}</span>}</strong></div>
              {displayMigrationType === 'Group' && (
                <div className="review-item"><span>{t('wizard.review.representative')}</span> <strong>{draft.representative || t('wizard.review.notSpecified')}</strong></div>
              )}
              <div className="review-item"><span>{t('wizard.review.tier')}</span> <strong>{t(`wizard.preferences.tiers.${applicantTier.toLowerCase()}`)}</strong></div>
              <div className="review-item">
                <span>{t('wizard.review.destinations')}</span>
                <strong>{draft.preferredAlliances.includes('any') ? t('wizard.preferences.anyAlliance') : t('wizard.review.selected', { count: draft.preferredAlliances.length })}</strong>
              </div>
              <div className="review-item" style={{ marginTop: 6, display: 'block' }}>
                <span style={{ display: 'block', marginBottom: 2 }}>{t('wizard.review.reason')}</span>
                <p style={{ margin: 0, color: '#e2e8f0', fontSize: 11, fontStyle: 'italic', lineHeight: 1.4 }}>
                  "{draft.reason}"
                </p>
              </div>
            </ReviewSummarySection>

            {isGroup && (
              <ReviewSummarySection
                title={t('wizard.review.rosterTitle')}
                onEdit={() => goToStep('group-roster')}
                editTestId="edit-roster-summary"
                t={t}
                fullWidth
              >
                <div style={{ fontSize: 10, marginBottom: 6 }}>{t('wizard.review.importedCount', { count: draft.groupMembers.length })}</div>
                {draft.groupMembers.length === 0 ? (
                  <p className="hint" style={{ margin: '4px 0 0' }}>{t('wizard.review.noRoster')}</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 8 }}>
                    {draft.groupMembers.map((m, index) => (
                      <ReviewRosterMemberCard
                        key={m.id}
                        member={m}
                        draft={draft}
                        index={index}
                        t={t}
                        thresholds={thresholds}
                      />
                    ))}
                  </div>
                )}
              </ReviewSummarySection>
            )}
          </div>
        </div>
      </FormSection>

      {confirmOpen && (
        <ReviewConfirmModal
          isOpen={confirmOpen}
          submitting={submitting}
          t={t}
          hasScreenshot={draft.hasScreenshot}
          isGroup={isGroup}
          memberCount={draft.groupMembers.length}
          onClose={() => !submitting && setConfirmOpen(false)}
          onConfirm={confirmSubmit}
        />
      )}
    </StepLayout>
  );
}
