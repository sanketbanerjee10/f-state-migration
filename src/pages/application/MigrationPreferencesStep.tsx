import { useState } from 'react';
import { getGetActiveAlliancesQueryKey, useGetActiveAlliances } from '@/lib/api-client';
import { Field, FormSection } from '../../components/Field';
import { AllianceMultiSelect } from '../../components/AllianceMultiSelect';
import { StepLayout } from '../../components/form/StepLayout';
import type { MigrationTier, MigrationType } from '../../types/application';
import { useApplicationDraft, type StepErrors } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

const tierOptions: MigrationTier[] = ['Regular', 'Medium', 'Advanced', 'Elite'];

export function MigrationPreferencesStep() {
  const { draft, setDraftField, validateStep } = useApplicationDraft();
  const { nextStep, prevStep, isGroup } = useWizardNavigation();
  const [stepErrors, setStepErrors] = useState<StepErrors>({});

  const activeAlliances = useGetActiveAlliances({
    query: { queryKey: getGetActiveAlliancesQueryKey() },
  });

  const handleContinue = () => {
    const errors = validateStep('/apply/preferences');
    setStepErrors(errors);
    if (Object.keys(errors).length === 0) {
      nextStep();
    }
  };

  return (
    <StepLayout
      navigationProps={{
        onContinue: handleContinue,
        onBack: prevStep,
        continueLabel: isGroup ? 'Continue to Group Details' : 'Continue to Review',
        backLabel: 'Back to Combat Stats',
        disabled: activeAlliances.isLoading,
      }}
    >
      <FormSection number="04" title="Migration preferences">
        <Field
          id="migrationType"
          label="Individual or group migration?"
          required
          error={stepErrors.migrationType}
          hint="Select whether you are applying alone or representing a group migrating together."
        >
          <select
            className="control"
            id="migrationType"
            value={draft.migrationType}
            onChange={(e) => {
              setDraftField('migrationType', e.target.value as MigrationType, true);
              setStepErrors((old) => ({ ...old, migrationType: '' }));
            }}
            data-testid="migration-type"
          >
            <option value="">Choose an option</option>
            <option value="Individual">Individual</option>
            <option value="Group">Group</option>
          </select>
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

        <Field id="tier-regular" label="Expected migration tier" required error={stepErrors.tier}>
          <div className="radio-grid" role="radiogroup" aria-label="Expected migration tier" data-testid="tier-options">
            {tierOptions.map((tier) => (
              <label className="radio-card" key={tier}>
                <input
                  type="radio"
                  name="tier"
                  value={tier}
                  checked={draft.tier === tier}
                  onChange={() => {
                    setDraftField('tier', tier, true);
                    setStepErrors((old) => ({ ...old, tier: '' }));
                  }}
                  data-testid={`tier-${tier.toLowerCase()}`}
                />
                {tier}
              </label>
            ))}
          </div>
        </Field>
      </FormSection>
    </StepLayout>
  );
}
