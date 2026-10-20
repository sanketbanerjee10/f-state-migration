import { useMemo, useState } from 'react';
import { Field, FormSection } from '../../components/Field';
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
        backLabel: 'Back to Character Details',
      }}
    >
      {/* ── Section 1: Current state & alliance ── */}
      <FormSection number="01" title="Current location">
        <Field
          id="currentState"
          label="Current state"
          required
          error={stepErrors.currentState}
          hint="Enter your current state number (1–32767). State 565 is your target destination."
        >
          <input
            className="control"
            id="currentState"
            value={draft.currentState}
            max={32767}
            onChange={(e) => {
              setDraftField('currentState', e.target.value, true);
              setStepErrors((old) => ({ ...old, currentState: '' }));
            }}
            placeholder="Search or enter a state number (e.g. 520)"
            list="known-state-options"
            inputMode="numeric"
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
          hint="Your current alliance name or tag in your state"
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
            placeholder="Your alliance name or tag"
            data-testid="current-alliance"
          />
        </Field>
      </FormSection>

      {/* ── Section 2: Arena powers ── */}
      <FormSection number="02" title="Arena formation powers">
        <p className="hint" style={{ margin: '-3px 0 12px' }}>
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
      </FormSection>
    </StepLayout>
  );
}
