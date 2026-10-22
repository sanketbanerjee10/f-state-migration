import { useMemo, useState } from 'react';
import { Field, FormSection } from '../../components/Field';
import { StepLayout } from '../../components/form/StepLayout';
import { KNOWN_STATES } from '../../config/states';
import { useApplicationDraft, type StepErrors } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

export function CharacterDetailsStep() {
  const { draft, setDraftField, validateStep } = useApplicationDraft();
  const { nextStep, prevStep } = useWizardNavigation();
  const [stepErrors, setStepErrors] = useState<StepErrors>({});

  const stateOptions = useMemo(
    () => KNOWN_STATES.filter((state) => state.toLowerCase().includes(draft.currentState.toLowerCase())),
    [draft.currentState]
  );

  const handleContinue = () => {
    const errors = validateStep('/apply/character');
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
        continueLabel: 'Continue to Combat Stats',
        // backLabel: 'Back to Power Details',
      }}
    >
      <FormSection number="02" title="Character details">
        <Field
          id="characterGameName"
          label="Name in the game"
          required
          error={stepErrors.playerName}
          hint="Pre-filled from your screenshot. You can correct it here if needed."
        >
          <input
            className="control"
            id="characterGameName"
            value={draft.playerName}
            maxLength={40}
            placeholder="Enter your in-game name"
            onChange={(e) => {
              setDraftField('playerName', e.target.value, true);
              setStepErrors((old) => ({ ...old, playerName: '' }));
            }}
            data-testid="game-name"
            autoComplete="nickname"
          />
        </Field>

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
    </StepLayout>
  );
}
