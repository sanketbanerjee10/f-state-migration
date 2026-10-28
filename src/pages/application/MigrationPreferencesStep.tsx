import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCachedActiveAlliances } from '../../lib/activeAlliancesCache';
import { Field, FormSection } from '../../components/Field';
import { AllianceMultiSelect } from '../../components/AllianceMultiSelect';
import { StepLayout } from '../../components/form/StepLayout';
import type { MigrationTier, MigrationType } from '../../types/application';
import { useApplicationDraft, type StepErrors } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

const tierOptions: MigrationTier[] = ['Regular', 'Medium', 'Advanced', 'Elite'];

export function MigrationPreferencesStep() {
  const { t } = useTranslation();
  const { draft, setDraftField, validateStep } = useApplicationDraft();
  const { nextStep, prevStep, isGroup } = useWizardNavigation();
  const [stepErrors, setStepErrors] = useState<StepErrors>({});

  const activeAlliances = useCachedActiveAlliances();

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
        continueLabel: isGroup ? t('wizard.preferences.continueDetails') : t('wizard.preferences.continueReview'),
        // backLabel: 'Back to Combat Stats',
        disabled: activeAlliances.isLoading,
      }}
    >
      <FormSection number="04" title={t('wizard.preferences.title')}>
        <Field
          id="migrationType"
          label={t('wizard.preferences.typeQuestion')}
          required
          error={stepErrors.migrationType}
          hint={t('wizard.preferences.typeDescription')}
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
            <option value="">{t('wizard.preferences.chooseOption')}</option>
            <option value="Individual">{t('common.labels.individual')}</option>
            <option value="Group">{t('common.labels.group')}</option>
          </select>
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

        <Field id="tier-regular" label={t('wizard.preferences.tier')} required error={stepErrors.tier}>
          <div className="radio-grid" role="radiogroup" aria-label={t('wizard.preferences.tier')} data-testid="tier-options">
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
                {t(`wizard.preferences.tiers.${tier.toLowerCase()}`)}
              </label>
            ))}
          </div>
        </Field>
      </FormSection>
    </StepLayout>
  );
}
