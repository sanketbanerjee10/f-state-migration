import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Edit2, ExternalLink, LoaderCircle, ShieldAlert, ShieldCheck, Users } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useSubmitMigrationApplication } from '@/lib/api-client';
import { FormSection } from '../../components/Field';
import { Modal } from '../../components/Dialogs';
import { StepLayout } from '../../components/form/StepLayout';
import { CelebrationModal } from '../../components/CelebrationModal';
import { parseMagnitude, parseStateNumber } from '../../lib/parsers';
import { calculateMigrationScoreFromRaw, TIER_COLORS, useLiveTierThresholds } from '../../lib/migrationScore';
import { ApplicationDeletedError } from '../../lib/applicationDetailsCache';
import { saveTrackedApplication } from '../../lib/trackedApplications';
import type { MigrationTier, MigrationType } from '../../types/application';
import { useApplicationDraft, type StepErrors } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

export function ApplicationReviewStep() {
  const { t } = useTranslation();
  const { draft, validateAll, clearDraft } = useApplicationDraft();
  const { prevStep, goToStep, isGroup } = useWizardNavigation();
  const [, setLocation] = useLocation();
  const { thresholds } = useLiveTierThresholds();

  const [stepErrors, setStepErrors] = useState<StepErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);
  const [applicationReference, setApplicationReference] = useState('');
  const [submittedApplicationId, setSubmittedApplicationId] = useState('');
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [isUpdateSuccess, setIsUpdateSuccess] = useState(false);

  const idempotencyRef = useRef<string | null>(null);
  const submitMutation = useSubmitMigrationApplication();

  // Compute effective migration type for display & submission:
  // If user selected Group but added 0 members, downgrade to Individual at submit time.
  const displayMigrationType: MigrationType =
    draft.migrationType === 'Group' && draft.groupMembers.length === 0
      ? 'Individual'
      : (draft.migrationType as MigrationType);

  const handleOpenConfirm = () => {
    // Validate all preceding stages
    const allErrors = validateAll();
    if (Object.keys(allErrors).length > 0) {
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

    setStepErrors({});
    setConfirmOpen(true);
  };

  const confirmSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');

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
        return (scoreRes?.tier || draft.tier || 'Regular') as MigrationTier;
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
        characterReference: null,
        additionalComments: comments,
        highestPowerOnRecord: applicantHighestPower,
        structurePower: Math.max(0, Math.round(parseMagnitude(draft.structurePower) || 0)),
        techPower: Math.max(0, Math.round(parseMagnitude(draft.techPower) || 0)),
        troopPower: Math.max(0, Math.round(parseMagnitude(draft.troopPower) || 0)),
        heroPower: Math.max(0, Math.round(parseMagnitude(draft.heroPower) || 0)),
        modVehiclePower: Math.max(0, Math.round(parseMagnitude(draft.modVehiclePower) || 0)),
        isScreenshotVerified: Boolean(draft.hasScreenshot),
        groupMembers: mappedGroupMembers,
      };

      let resultData: { message: string; applicationReference: string; applicationId?: string };
      const isEditing = Boolean(draft.editingApplicationId);

      if (isEditing && draft.editingApplicationId) {
        const res = await fetch(`/api/applications/${encodeURIComponent(draft.editingApplicationId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          if (res.status === 404) throw new ApplicationDeletedError();
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to update application');
        }
        resultData = await res.json();
      } else {
        const res = await submitMutation.mutateAsync({ data: payload });
        resultData = res as any;
      }

      const resolvedAppId = resultData.applicationId || draft.editingApplicationId || '';

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
      setApplicationReference(resultData.applicationReference);
      setSubmittedApplicationId(resolvedAppId);
      setIsUpdateSuccess(isEditing);
      idempotencyRef.current = null;
      clearDraft(true);
      setSuccess(true);
      setCelebrationOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setConfirmOpen(false);
      setSubmitError(
        error instanceof ApplicationDeletedError
          ? t('wizard.review.deleted')
          : t('wizard.review.submitFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const returnToStart = () => {
    clearDraft();
    setSuccess(false);
    goToStep('character');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Render CelebrationModal outside the success branch so it is always mounted when
  // celebrationOpen becomes true — even before the success page fully renders.
  const celebrationModal = (
    <CelebrationModal
      isOpen={celebrationOpen}
      onClose={() => {
        setCelebrationOpen(false);
        if (!success) return;
        clearDraft();
      }}
      applicationId={submittedApplicationId}
      applicationReference={applicationReference}
      isUpdate={isUpdateSuccess}
      onNewApplication={returnToStart}
    />
  );

  if (success) {
    return (
      <main className="form-shell">
        {celebrationModal}
      </main>
    );
  }

  return (
    <StepLayout
      navigationProps={{
        onContinue: handleOpenConfirm,
        onBack: prevStep,
        continueLabel: t('wizard.review.confirm'),
        // backLabel: isGroup ? 'Back to Group Roster' : 'Back to Migration Details',
        submitting,
        submitMode: true,
      }}
      formError={submitError}
    >
      {celebrationModal}
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
            {/* Stage 1: Character Details */}
            <div className="review-section-box">
              <div className="review-section-title-row">
                <strong>{t('wizard.review.characterTitle')}</strong>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => goToStep('character')}
                  data-testid="edit-character-summary"
                >
                  <Edit2 size={12} /> {t('wizard.review.edit')}
                </button>
              </div>
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
                  <div
                    className="review-item"
                    style={{
                      marginTop: 6,
                      paddingTop: 6,
                      borderTop: '1px dashed rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <span>{t('wizard.review.score')}</span>
                    <strong style={{ color: TIER_COLORS[scoreRes.tier].text }}>
                      {scoreRes.score.toFixed(2)} ({t(`wizard.preferences.tiers.${scoreRes.tier.toLowerCase()}`)})
                    </strong>
                  </div>
                );
              })()}
            </div>

            {/* Stage 2: Combat Power */}
            <div className="review-section-box">
              <div className="review-section-title-row">
                <strong>{t('wizard.review.combatTitle')}</strong>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => goToStep('combat')}
                  data-testid="edit-combat-summary"
                >
                  <Edit2 size={12} /> {t('wizard.review.edit')}
                </button>
              </div>
              <div className="review-item"><span>{t('common.labels.state')}</span> <strong>{t('wizard.review.currentStateNumber', { state: draft.currentState || '—' })}</strong></div>
              <div className="review-item"><span>{t('common.labels.alliance')}</span> <strong>{draft.currentAlliance || '—'}</strong></div>
              <div className="review-item"><span>{t('wizard.review.f1')}</span> <strong>{draft.f1 || '—'}</strong></div>
              <div className="review-item"><span>{t('wizard.review.f2')}</span> <strong>{draft.f2 || '—'}</strong></div>
              <div className="review-item"><span>{t('wizard.review.f3')}</span> <strong>{draft.f3 || '—'}</strong></div>
            </div>

            {/* Stage 3: Migration Details */}
            <div className="review-section-box">
              <div className="review-section-title-row">
                <strong>{t('wizard.review.migrationTitle')}</strong>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => goToStep('migration')}
                  data-testid="edit-preferences-summary"
                >
                  <Edit2 size={12} /> {t('wizard.review.edit')}
                </button>
              </div>
              <div className="review-item"><span>{t('wizard.review.migrationType')}</span> <strong>{displayMigrationType === 'Group' ? t('common.labels.group') : t('common.labels.individual')}{displayMigrationType !== draft.migrationType && <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>{t('wizard.review.individualNote')}</span>}</strong></div>
              {displayMigrationType === 'Group' && (
                <div className="review-item"><span>{t('wizard.review.representative')}</span> <strong>{draft.representative || t('wizard.review.notSpecified')}</strong></div>
              )}
              <div className="review-item"><span>{t('wizard.review.tier')}</span> <strong>{t(`wizard.preferences.tiers.${(draft.tier || 'Regular').toLowerCase()}`)}</strong></div>
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
            </div>

            {/* Stage 4 (if group): Group Roster */}
            {isGroup && (
              <div className="review-section-box" style={{ gridColumn: '1 / -1' }}>
                <div className="review-section-title-row">
                  <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div>
                      {t('wizard.review.rosterTitle')}
                      <div style={{fontSize: 10}}>{t('wizard.review.importedCount', { count: draft.groupMembers.length })}</div>
                    </div> 
                  </strong>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => goToStep('group-roster')}
                    data-testid="edit-roster-summary"
                  >
                    <Edit2 size={12} /> {t('wizard.review.edit')}
                  </button>
                </div>
                {draft.groupMembers.length === 0 ? (
                  <p className="hint" style={{ margin: '4px 0 0' }}>{t('wizard.review.noRoster')}</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 8 }}>
                    {draft.groupMembers.map((m) => {
                      const ms = parseMagnitude(m.structurePower) || 0;
                      const mt = parseMagnitude(m.techPower) || 0;
                      const mh = parseMagnitude(m.heroPower) || 0;
                      const mv = parseMagnitude(m.modVehiclePower) || 0;
                      const mScore = calculateMigrationScoreFromRaw(ms, mt, mh, mv, thresholds);

                      return (
                      <div
                        key={m.id}
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          padding: '8px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 600, color: '#93c5fd' }}>{m.playerName}</span>
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
                          {t('common.labels.power')} {m.highestPowerOnRecord} · {t('common.labels.kills')} {m.kills}
                        </div>
                        <div style={{ color: '#64748b', fontSize: 10 }}>
                          {t('common.labels.alliance')} {m.currentAlliance || draft.currentAlliance || '—'}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </FormSection>

      {confirmOpen && (
        <Modal
          title={t('wizard.review.beforeContinuing')}
          onClose={() => !submitting && setConfirmOpen(false)}
          actions={
            <>
              <button
                type="button"
                className="button button-quiet"
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                data-testid="cancel-submit"
              >
                {t('common.actions.cancel')}
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={confirmSubmit}
                disabled={submitting}
                data-testid="confirm-submit"
              >
                {submitting ? (
                  <>
                    <LoaderCircle size={14} className="spin" /> {t('common.status.sending')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> {t('wizard.review.submit')}
                  </>
                )}
              </button>
            </>
          }
        >
          <p>
            {t('wizard.review.privacy')}
          </p>
          {draft.hasScreenshot && (
            <p style={{ marginTop: 12, color: '#86efac', fontSize: 13 }}>
              {t('wizard.review.verifiedExplanation')}<strong>{t('wizard.review.verified')}</strong>.
            </p>
          )}
          {isGroup && draft.groupMembers.length > 0 && (
            <p style={{ marginTop: 8, color: '#93c5fd', fontSize: 13 }}>
              {t('wizard.review.membersRecorded', { count: draft.groupMembers.length })}
            </p>
          )}
          <p style={{ marginTop: 12 }}>
            {t('wizard.review.terms')}
          </p>

          <p style={{ marginTop: 12 }}>
            {t('wizard.review.ready')}
          </p>
        </Modal>
      )}
    </StepLayout>
  );
}
