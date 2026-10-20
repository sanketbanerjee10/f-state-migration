import { useRef, useState } from 'react';
import { CheckCircle2, Edit2, ExternalLink, LoaderCircle, ShieldAlert, ShieldCheck, Users } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useSubmitMigrationApplication } from '@/lib/api-client';
import { FormSection } from '../../components/Field';
import { Modal } from '../../components/Dialogs';
import { StepLayout } from '../../components/form/StepLayout';
import { CelebrationModal } from '../../components/CelebrationModal';
import { parseMagnitude, parseStateNumber } from '../../lib/parsers';
import { calculateMigrationScoreFromRaw, TIER_COLORS, useLiveTierThresholds } from '../../lib/migrationScore';
import { saveTrackedApplication } from '../../lib/trackedApplications';
import type { MigrationTier, MigrationType } from '../../types/application';
import { useApplicationDraft, type StepErrors } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

export function ApplicationReviewStep() {
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
              kills: Math.max(0, Math.round(parseMagnitude(m.kills) || 0)),
              currentAlliance: (m.currentAlliance || draft.currentAlliance).trim(),
              isScreenshotVerified: Boolean(m.isScreenshotVerified),
            }))
          : undefined;

      const applicantHighestPower = Math.max(
        0,
        Math.round(parseMagnitude(draft.highestPowerOnRecord || draft.f1) || 0)
      );

      const payload = {
        idempotencyKey: idempotencyRef.current,
        gameName: draft.playerName.trim(),
        currentState: parseStateNumber(draft.currentState) as number,
        currentAlliance: draft.currentAlliance.trim(),
        f1ArenaPower: Math.round(parseMagnitude(draft.f1) as number),
        f2ArenaPower: Math.round(parseMagnitude(draft.f2) as number),
        f3ArenaPower: Math.round(parseMagnitude(draft.f3) as number),
        kills: Math.round(parseMagnitude(draft.kills) as number),
        preferredAllianceIds: anyAlliance ? [] : draft.preferredAlliances.map(Number),
        anyAlliance,
        migrationTier: draft.tier as MigrationTier,
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
      // NOTE: clearDraft() is deferred — called when user dismisses celebration or starts new app.
      // Clearing here causes the wizard navigation to recompute steps (isGroup changes), which
      // can unmount this component before the CelebrationModal ever renders.
      setSuccess(true);
      setCelebrationOpen(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setConfirmOpen(false);
      setSubmitError('The application could not be submitted. Your entries are still here; please try again.');
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
        // Clear draft only now that the modal is dismissed (avoids wizard navigation
        // unmounting this component before the modal fires confetti)
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
        <header className="page-header">
          <div className="eyebrow">MIGRATION SIGNUP</div>
          <h1 className="form-title">{isUpdateSuccess ? 'Application Updated' : 'Application Submitted'}</h1>
          <p className="intro">Thank you for applying to migrate to State 565.</p>
        </header>

        <div className="success-panel" role="status" data-testid="success-state">
          <div className="success-mark">
            <CheckCircle2 size={26} />
          </div>
          <h2>{isUpdateSuccess ? 'Application changes committed' : 'Application received'}</h2>
          <p>
            Your application was committed for leadership review. This application has been saved to your browser&apos;s
            storage for easy status tracking.
          </p>

          <div className="success-warning" style={{ margin: '16px 0', fontSize: '1rem' }}>
            <ShieldCheck size={16} style={{ verticalAlign: 'middle', marginRight: 7, color: '#60a5fa' }} />
            Application reference: <strong data-testid="application-reference">{applicationReference}</strong>
          </div>

          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 8,
              padding: '12px 16px',
              margin: '16px 0 24px',
              fontSize: '0.85rem',
              color: '#fca5a5',
              lineHeight: 1.45,
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 4 }}>
              <ShieldAlert size={16} style={{ color: '#ef4444' }} />
              <span>Sharing Discretion Advisory</span>
            </div>
            It is at your discretion whom you share your Application ID or Reference with, as anyone with this
            identifier can track the application and edit all player details.
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={`/track/${submittedApplicationId || applicationReference}`}
              className="button button-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <ExternalLink size={15} /> Track Application Status & Details
            </Link>

            <button
              type="button"
              className="button button-secondary"
              onClick={returnToStart}
              data-testid="return-to-form"
            >
              Start a New Application
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <StepLayout
      navigationProps={{
        onContinue: handleOpenConfirm,
        onBack: prevStep,
        continueLabel: 'Confirm and submit',
        backLabel: isGroup ? 'Back to Group Roster' : 'Back to Migration Details',
        submitting,
        submitMode: true,
      }}
      formError={submitError}
    >
      {celebrationModal}
      <FormSection number={isGroup ? '05' : '04'} title="Review application before submission">
        <div className="review-summary-card" data-testid="review-summary-card">
          <div className="review-summary-top">
            <h3 className="review-summary-title">
              <ShieldCheck size={18} className="review-shield-icon" />
              Complete Application Overview
              {draft.hasScreenshot && (
                <span className="verified-badge" data-testid="verified-badge">
                  <CheckCircle2 size={13} /> Screenshot Verified
                </span>
              )}
            </h3>
            <span className="review-summary-tag">Final Check</span>
          </div>

          <div className="review-summary-grid">
            {/* Stage 1: Character Details */}
            <div className="review-section-box">
              <div className="review-section-title-row">
                <strong>1. Character Details</strong>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => goToStep('character')}
                  data-testid="edit-character-summary"
                >
                  <Edit2 size={12} /> Edit
                </button>
              </div>
              <div className="review-item"><span>Name:</span> <strong>{draft.playerName || 'Not provided'}</strong></div>
              <div className="review-item"><span>Kills:</span> <strong>{draft.kills || 'Not provided'}</strong></div>
              <div className="review-item"><span>Highest Power:</span> <strong>{draft.highestPowerOnRecord || 'Not provided'}</strong></div>
              <div className="review-item"><span>Structure Power:</span> <strong>{draft.structurePower || 'Not provided'}</strong></div>
              <div className="review-item"><span>Tech Power:</span> <strong>{draft.techPower || 'Not provided'}</strong></div>
              <div className="review-item"><span>Troop Power:</span> <strong>{draft.troopPower || 'Not provided'}</strong></div>
              <div className="review-item"><span>Hero Power:</span> <strong>{draft.heroPower || 'Not provided'}</strong></div>
              <div className="review-item"><span>Vehicle Power:</span> <strong>{draft.modVehiclePower || 'Not provided'}</strong></div>
              {(() => {
                const s = parseMagnitude(draft.structurePower) || 0;
                const t = parseMagnitude(draft.techPower) || 0;
                const h = parseMagnitude(draft.heroPower) || 0;
                const v = parseMagnitude(draft.modVehiclePower) || 0;
                const scoreRes = calculateMigrationScoreFromRaw(s, t, h, v, thresholds);
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
                    <span>Calculated Score:</span>
                    <strong style={{ color: TIER_COLORS[scoreRes.tier].text }}>
                      {scoreRes.score.toFixed(2)} ({scoreRes.tier})
                    </strong>
                  </div>
                );
              })()}
            </div>

            {/* Stage 2: Combat Power */}
            <div className="review-section-box">
              <div className="review-section-title-row">
                <strong>2. Combat Power</strong>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => goToStep('combat')}
                  data-testid="edit-combat-summary"
                >
                  <Edit2 size={12} /> Edit
                </button>
              </div>
              <div className="review-item"><span>Current State:</span> <strong>State {draft.currentState || '—'}</strong></div>
              <div className="review-item"><span>Current Alliance:</span> <strong>{draft.currentAlliance || '—'}</strong></div>
              <div className="review-item"><span>F1 Arena Power:</span> <strong>{draft.f1 || '—'}</strong></div>
              <div className="review-item"><span>F2 Arena Power:</span> <strong>{draft.f2 || '—'}</strong></div>
              <div className="review-item"><span>F3 Arena Power:</span> <strong>{draft.f3 || '—'}</strong></div>
            </div>

            {/* Stage 3: Migration Details */}
            <div className="review-section-box">
              <div className="review-section-title-row">
                <strong>3. Migration Details</strong>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => goToStep('migration')}
                  data-testid="edit-preferences-summary"
                >
                  <Edit2 size={12} /> Edit
                </button>
              </div>
              <div className="review-item"><span>Migration Type:</span> <strong>{displayMigrationType}{displayMigrationType !== draft.migrationType && <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>(no members added — treated as Individual)</span>}</strong></div>
              {displayMigrationType === 'Group' && (
                <div className="review-item"><span>Group Rep:</span> <strong>{draft.representative || 'Not specified'}</strong></div>
              )}
              <div className="review-item"><span>Expected Tier:</span> <strong>{draft.tier || 'Not selected'}</strong></div>
              <div className="review-item">
                <span>Destinations:</span>
                <strong>{draft.preferredAlliances.includes('any') ? 'Any alliance' : `${draft.preferredAlliances.length} selected`}</strong>
              </div>
              <div className="review-item" style={{ marginTop: 6, display: 'block' }}>
                <span style={{ display: 'block', marginBottom: 2 }}>Reason:</span>
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
                    <Users size={14} /> 4. Group Roster ({draft.groupMembers.length} imported members)
                  </strong>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => goToStep('group-roster')}
                    data-testid="edit-roster-summary"
                  >
                    <Edit2 size={12} /> Edit roster
                  </button>
                </div>
                {draft.groupMembers.length === 0 ? (
                  <p className="hint" style={{ margin: '4px 0 0' }}>No additional roster members imported.</p>
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
                              {mScore.score.toFixed(2)} · {mScore.tier}
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#94a3b8', marginTop: 3 }}>
                          Power: {m.highestPowerOnRecord} · Kills: {m.kills}
                        </div>
                        <div style={{ color: '#64748b', fontSize: 10 }}>
                          Alliance: {m.currentAlliance || draft.currentAlliance || '—'}
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
          title="Review before continuing"
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
                Cancel
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
                    <LoaderCircle size={14} className="spin" /> Sending…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} /> Confirm and submit
                  </>
                )}
              </button>
            </>
          }
        >
          <p>
            Only your confirmed application fields will be sent securely to State 565 leadership.
            Screenshots and recognized text are processed strictly in your browser and are never uploaded.
          </p>
          {draft.hasScreenshot && (
            <p style={{ marginTop: 12, color: '#86efac', fontSize: 13 }}>
              ✓ Your application will be marked as <strong>Screenshot Verified</strong>.
            </p>
          )}
          {isGroup && draft.groupMembers.length > 0 && (
            <p style={{ marginTop: 8, color: '#93c5fd', fontSize: 13 }}>
              👥 {draft.groupMembers.length} group roster members recorded with your application.
            </p>
          )}
          <p style={{ marginTop: 12 }}>
            Submit your application for State 565 leadership review?
          </p>
        </Modal>
      )}
    </StepLayout>
  );
}
