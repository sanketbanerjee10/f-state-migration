import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Field, FormSection } from '../../components/Field';
import { CommaFormattedNumberInput } from '../../components/form/CommaFormattedNumberInput';
import { StepLayout } from '../../components/form/StepLayout';
import { useApplicationDraft, type StepErrors } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

export function CombatStatisticsStep() {
  const { t } = useTranslation();
  const { draft, setDraftField, validateStep } = useApplicationDraft();
  const { nextStep, prevStep } = useWizardNavigation();
  const [stepErrors, setStepErrors] = useState<StepErrors>({});

  const handleContinue = () => {
    const errors = validateStep('/apply/combat');
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
        continueLabel: t('wizard.statistics.continue'),
        // backLabel: 'Back to Character',
      }}
    >
      <FormSection number="03" title={t('wizard.statistics.title')}>
        <div className="field">
          <span className="label">
            {t('wizard.statistics.arena')} <span className="required" aria-hidden="true">*</span>
          </span>
          <p className="hint" style={{ margin: '-3px 0 10px' }}>
            {t('wizard.statistics.arenaHint')}
          </p>

          <div className="row-3">
            {(['f1', 'f2', 'f3'] as const).map((key, index) => (
              <Field
                key={key}
                id={key}
                label={t('wizard.combat.formation', { number: index + 1 })}
                required
                error={stepErrors[key]}
              >
                <CommaFormattedNumberInput
                  className="control"
                  id={key}
                  value={draft[key]}
                  placeholder={t(`wizard.statistics.f${index + 1}Placeholder`)}
                  onChange={(value) => {
                    setDraftField(key, value, true);
                    setStepErrors((old) => ({ ...old, [key]: '' }));
                  }}
                  data-testid={`arena-${key}`}
                />
              </Field>
            ))}
          </div>
        </div>

        <Field
          id="combatKills"
          label={t('wizard.statistics.kills')}
          required
          error={stepErrors.kills}
          hint={t('wizard.statistics.hint')}
        >
          <CommaFormattedNumberInput
            className="control"
            id="combatKills"
            value={draft.kills}
            placeholder={t('wizard.statistics.killsPlaceholder')}
            onChange={(value) => {
              setDraftField('kills', value, true);
              setStepErrors((old) => ({ ...old, kills: '' }));
            }}
            data-testid="kills"
          />
        </Field>
      </FormSection>
    </StepLayout>
  );
}
