import { useState } from 'react';
import { Field, FormSection } from '../../components/Field';
import { StepLayout } from '../../components/form/StepLayout';
import { useApplicationDraft, type StepErrors } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

export function CombatStatisticsStep() {
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
        continueLabel: 'Continue to Preferences',
        backLabel: 'Back to Character',
      }}
    >
      <FormSection number="03" title="Combat statistics">
        <div className="field">
          <span className="label">
            Arena power <span className="required" aria-hidden="true">*</span>
          </span>
          <p className="hint" style={{ margin: '-3px 0 10px' }}>
            Enter your arena formation powers with no season buildings. You can use shorthand such as 12.5M.
          </p>

          <div className="row-3">
            {(['f1', 'f2', 'f3'] as const).map((key, index) => (
              <Field
                key={key}
                id={key}
                label={`F${index + 1} arena power`}
                required
                error={stepErrors[key]}
              >
                <input
                  className="control"
                  id={key}
                  value={draft[key]}
                  placeholder={['e.g. 12.5M', 'e.g. 11M', 'e.g. 10M'][index]}
                  onChange={(e) => {
                    setDraftField(key, e.target.value, true);
                    setStepErrors((old) => ({ ...old, [key]: '' }));
                  }}
                  inputMode="decimal"
                  data-testid={`arena-${key}`}
                />
              </Field>
            ))}
          </div>
        </div>

        <Field
          id="combatKills"
          label="Kills"
          required
          error={stepErrors.kills}
          hint="Pre-filled from your details screenshot. You can use shorthand like 5.4M or full numbers like 5,453,196."
        >
          <input
            className="control"
            id="combatKills"
            value={draft.kills}
            placeholder="e.g. 5,453,196 or 5.4M"
            onChange={(e) => {
              setDraftField('kills', e.target.value, true);
              setStepErrors((old) => ({ ...old, kills: '' }));
            }}
            inputMode="decimal"
            data-testid="kills"
          />
        </Field>
      </FormSection>
    </StepLayout>
  );
}
