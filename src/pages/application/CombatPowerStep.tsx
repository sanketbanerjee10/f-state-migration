import { useMemo, useState } from 'react';
import { Field, FormSection } from '../../components/Field';
import { CommaFormattedNumberInput } from '../../components/form/CommaFormattedNumberInput';
import { StepLayout } from '../../components/form/StepLayout';
import { KNOWN_STATES } from '../../config/states';
import { useApplicationDraft, type StepErrors } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

export function CombatPowerStep() {
  const { draft, setDraftField, validateStep } = useApplicationDraft();
  const { nextStep, prevStep } = useWizardNavigation();
  const [stepErrors, setStepErrors] = useState<StepErrors>({});

  const stateOptions = useMemo(
    () => KNOWN_STATES.filter((state) => state.toLowerCase().includes(draft.currentState.toLowerCase())),
    [draft.currentState]
  );

  const handleContinue = () => {
    const errors = validateStep('combat');
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
        continueLabel: 'Continue to Migration Details',
        // backLabel: 'Back to Character Details',
      }}
    >
      {/* ── Section 1: Current state & alliance ── */}
      <FormSection number="01" title="Current location">
        <Field
          id="currentState"
          label="Current state"
          required
          error={stepErrors.currentState}
        >
          <input
            className="control"
            id="currentState"
            type="text"
            value={draft.currentState}
            maxLength={4}
            onChange={(e) => {
              if (!/^\d{0,4}$/.test(e.target.value)) return;
              setDraftField('currentState', e.target.value, true);
              setStepErrors((old) => ({ ...old, currentState: '' }));
            }}
            placeholder="Enter a state number (e.g. 565)"
            list="known-state-options"
            inputMode="numeric"
            pattern="[0-9]*"
            data-testid="current-state"
          />
          <datalist id="known-state-options">
            {stateOptions.map((state) => (
              <option value={state} key={state} />
            ))}
          </datalist>
        </Field>

        <Field
          id="currentAlliance"
          label="Current alliance"
          required
          error={stepErrors.currentAlliance}
        >
          <input
            className="control"
            id="currentAlliance"
            value={draft.currentAlliance}
            maxLength={24}
            onChange={(e) => {
              setDraftField('currentAlliance', e.target.value, true);
              setStepErrors((old) => ({ ...old, currentAlliance: '' }));
            }}
            placeholder="Your alliance full name"
            data-testid="current-alliance"
          />
        </Field>
      </FormSection>

      {/* ── Section 2: Arena powers ── */}
      <FormSection number="02" title="Arena formation powers">
        <p className="hint" style={{ margin: '-3px 0 12px' }}>
          Enter your arena formation powers with no season buildings. Numbers are formatted with commas as you type.
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
              <CommaFormattedNumberInput
                className="control"
                id={key}
                value={draft[key]}
                placeholder={['e.g. 180,500,000', 'e.g. 99,183,574', 'e.g. 22,349,680'][index]}
                onChange={(value) => {
                  setDraftField(key, value, true);
                  setStepErrors((old) => ({ ...old, [key]: '' }));
                }}
                data-testid={`arena-${key}`}
              />
            </Field>
          ))}
        </div>
      </FormSection>
    </StepLayout>
  );
}
