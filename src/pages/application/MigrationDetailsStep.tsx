import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaUser, FaUsers } from 'react-icons/fa';
import { Field, FormSection } from '../../components/Field';
import { AllianceMultiSelect } from '../../components/AllianceMultiSelect';
import { StepLayout } from '../../components/form/StepLayout';
import { useCachedActiveAlliances } from '../../lib/activeAlliancesCache';
import type { MigrationType } from '../../types/application';
import { useApplicationDraft, type StepErrors } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

export function MigrationDetailsStep() {
  const { t } = useTranslation();
  const { draft, setDraftField, validateStep, setNavigationNotice } = useApplicationDraft();
  const { nextStep, prevStep, isGroup } = useWizardNavigation();

  const [stepErrors, setStepErrors] = useState<StepErrors>({});

  // By default, fill Group representative name as the player applying for migration in stage 1
  if (draft.migrationType === 'Group' && !draft.representative.trim() && draft.playerName.trim()) {
    setDraftField('representative', draft.playerName.trim(), false);
  }

  const activeAlliances = useCachedActiveAlliances();

  const handleContinue = () => {
    const localErrors = validateStep('migration');
    setNavigationNotice(Object.values(localErrors)[0] || '');
    if (Object.keys(localErrors).length > 0) {
      setStepErrors(localErrors);
      return;
    }
    setStepErrors({});
    nextStep();
  };

  return (
    <StepLayout
      navigationProps={{
        onContinue: handleContinue,
        onBack: prevStep,
        continueLabel: isGroup ? t('wizard.preferences.continueRoster') : t('wizard.preferences.continueReview'),
        // backLabel: 'Back to Combat Power',
        disabled: activeAlliances.isLoading,
      }}
    >
      {/* ── Section 1: Migration type & preferences ── */}
      <FormSection number="01" title={t('wizard.preferences.title')}>
        <Field
          id="migrationType"
          label={t('wizard.preferences.type')}
          required
          error={stepErrors.migrationType}
          hint={t('wizard.preferences.typeDescription')}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {(['Individual', 'Group'] as MigrationType[]).map((type) => (
              <button
                key={type}
                type="button"
                data-testid={type === 'Individual' ? 'migration-type-individual' : 'migration-type-group'}
                className={`button ${draft.migrationType === type ? 'button-primary' : 'button-secondary'}`}
                onClick={() => {
                  setDraftField('migrationType', type, true);
                  if (type === 'Group' && !draft.representative.trim() && draft.playerName.trim()) {
                    setDraftField('representative', draft.playerName.trim(), true);
                  }
                  setStepErrors((old) => ({ ...old, migrationType: '' }));
                }}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
              >
                {type === 'Group' ? <FaUsers size={16} aria-hidden="true" /> : <FaUser size={16} aria-hidden="true" />}
                {type === 'Group' ? t('common.labels.group') : t('common.labels.individual')}
              </button>
            ))}
          </div>
        </Field>

        {draft.migrationType === 'Group' && (
          <Field
            id="representative"
            label={t('wizard.preferences.representative')}
            required
            error={stepErrors.representative}
            hint={t('wizard.preferences.representativeHint')}
          >
            <input
              className="control"
              id="representative"
              value={draft.representative}
              maxLength={40}
              onChange={(e) => {
                setDraftField('representative', e.target.value, true);
                setStepErrors((old) => ({ ...old, representative: '' }));
              }}
              placeholder={t('wizard.preferences.representativePlaceholder')}
              data-testid="group-representative"
            />
          </Field>
        )}

        <Field
          id="alliance-options"
          label={t('wizard.preferences.alliances')}
          required
          error={stepErrors.preferredAlliances}
          hint={t('wizard.preferences.alliancesHint')}
        >
          <AllianceMultiSelect
            values={draft.preferredAlliances}
            onChange={(values) => {
              setDraftField('preferredAlliances', values, true);
              setStepErrors((old) => ({ ...old, preferredAlliances: '' }));
            }}
            error=""
            options={activeAlliances.data ?? []}
            loading={activeAlliances.isLoading}
            loadError={
              activeAlliances.isError
                ? t('wizard.preferences.loadError')
                : undefined
            }
            onRetry={() => void activeAlliances.refetch()}
          />
        </Field>
      </FormSection>

      {/* ── Section 2: Reason & comments ── */}
      <FormSection number="02" title={t('wizard.preferences.reason')}>
        <Field
          id="reason"
          label={t('wizard.preferences.reasonAlternate')}
          required
          error={stepErrors.reason}
          // hint="Tell us why you want to join State 565 (10–1,000 characters)."
        >
          <textarea
            className="control"
            id="reason"
            value={draft.reason}
            maxLength={1000}
            placeholder={t('wizard.preferences.reasonPlaceholder')}
            onChange={(e) => {
              setDraftField('reason', e.target.value, true);
              setStepErrors((old) => ({ ...old, reason: '' }));
            }}
            data-testid="migration-reason"
          />
          <div className="counter" aria-live="polite">
            {t('wizard.preferences.counter', { count: draft.reason.length })}
          </div>
        </Field>

        <Field
          id="comments"
          label={t('wizard.preferences.comments')}
          error={stepErrors.comments}
          // hint="Anything else our leadership team should know? (Up to 1,000 characters)."
        >
          <textarea
            className="control"
            id="comments"
            value={draft.comments}
            maxLength={1000}
            onChange={(e) => {
              setDraftField('comments', e.target.value, true);
              setStepErrors((old) => ({ ...old, comments: '' }));
            }}
            placeholder={t('wizard.preferences.commentsHint')}
            data-testid="additional-comments"
          />
          <div className="counter" aria-live="polite">
            {t('wizard.preferences.counter', { count: draft.comments.length })}
          </div>
        </Field>
      </FormSection>
    </StepLayout>
  );
}
