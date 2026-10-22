import { useState } from 'react';
import { getGetActiveAlliancesQueryKey, useGetActiveAlliances } from '@/lib/api-client';
import { Field, FormSection } from '../../components/Field';
import { AllianceMultiSelect } from '../../components/AllianceMultiSelect';
import { StepLayout } from '../../components/form/StepLayout';
import { getCachedActiveAlliances } from '../../lib/activeAlliancesCache';
import type { MigrationType } from '../../types/application';
import { useApplicationDraft, type StepErrors } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

export function MigrationDetailsStep() {
  const { draft, setDraftField, validateStep } = useApplicationDraft();
  const { nextStep, prevStep, isGroup } = useWizardNavigation();

  const [stepErrors, setStepErrors] = useState<StepErrors>({});

  // By default, fill Group representative name as the player applying for migration in stage 1
  if (draft.migrationType === 'Group' && !draft.representative.trim() && draft.playerName.trim()) {
    setDraftField('representative', draft.playerName.trim(), false);
  }

  const activeAlliances = useGetActiveAlliances({
    query: {
      queryKey: getGetActiveAlliancesQueryKey(),
      queryFn: ({ signal }) => getCachedActiveAlliances(signal),
      staleTime: 24 * 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  });

  const handleContinue = () => {
    const localErrors = validateStep('migration');
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
        continueLabel: isGroup ? 'Continue to Group Roster' : 'Continue to Review',
        // backLabel: 'Back to Combat Power',
        disabled: activeAlliances.isLoading,
      }}
    >
      {/* ── Section 1: Migration type & preferences ── */}
      <FormSection number="01" title="Migration preferences">
        <Field
          id="migrationType"
          label="Migration Type"
          required
          error={stepErrors.migrationType}
          hint="Select whether you are applying alone or representing a group migrating together."
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {(['Individual', 'Group'] as MigrationType[]).map((type) => (
              <button
                key={type}
                type="button"
                data-testid={type === 'Individual' ? 'migration-type-individual' : 'migration-type-group'}
                className={`button ${draft.migrationType === type ? 'button-primary' : 'button-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => {
                  setDraftField('migrationType', type, true);
                  if (type === 'Group' && !draft.representative.trim() && draft.playerName.trim()) {
                    setDraftField('representative', draft.playerName.trim(), true);
                  }
                  setStepErrors((old) => ({ ...old, migrationType: '' }));
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </Field>

        {draft.migrationType === 'Group' && (
          <Field
            id="representative"
            label="Group representative"
            required
            error={stepErrors.representative}
            hint="The in-game name of the primary contact or coordinator for your group."
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
              placeholder="Enter the representative's in-game name"
              data-testid="group-representative"
            />
          </Field>
        )}

        <Field
          id="alliance-options"
          label="Alliances you'd like to migrate to"
          required
          error={stepErrors.preferredAlliances}
          hint="Choose 'Any alliance' or select one or more specific destination alliances in State 565."
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
                ? 'Active alliance options could not be loaded. Please retry before continuing.'
                : undefined
            }
            onRetry={() => void activeAlliances.refetch()}
          />
        </Field>
      </FormSection>

      {/* ── Section 2: Reason & comments ── */}
      <FormSection number="02" title="Why do you want to join State 565?">
        <Field
          id="reason"
          label="Why do you want to migrate?"
          required
          error={stepErrors.reason}
          // hint="Tell us why you want to join State 565 (10–1,000 characters)."
        >
          <textarea
            className="control"
            id="reason"
            value={draft.reason}
            maxLength={1000}
            placeholder="Tell us what goals, friendships, or playstyle bring you to State 565..."
            onChange={(e) => {
              setDraftField('reason', e.target.value, true);
              setStepErrors((old) => ({ ...old, reason: '' }));
            }}
            data-testid="migration-reason"
          />
          <div className="counter" aria-live="polite">
            {draft.reason.length} / 1,000
          </div>
        </Field>

        <Field
          id="comments"
          label="Additional comments"
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
            placeholder="Anything else our leadership team should know?"
            data-testid="additional-comments"
          />
          <div className="counter" aria-live="polite">
            {draft.comments.length} / 1,000
          </div>
        </Field>
      </FormSection>
    </StepLayout>
  );
}
