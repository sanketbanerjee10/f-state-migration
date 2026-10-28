import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Field, FormSection } from '../../components/Field';
import { StepLayout } from '../../components/form/StepLayout';
import { KNOWN_STATES } from '../../config/states';
import { useApplicationDraft, type StepErrors } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

export function CharacterDetailsStep() {
  const { t } = useTranslation();
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
        continueLabel: t('wizard.character.continue'),
        // backLabel: 'Back to Power Details',
      }}
    >
      <FormSection number="02" title={t('wizard.character.title')}>
        <Field
          id="characterGameName"
          label={t('wizard.character.nameLabel')}
          required
          error={stepErrors.playerName}
          hint={t('wizard.character.nameHint')}
        >
          <input
            className="control"
            id="characterGameName"
            value={draft.playerName}
            maxLength={30}
            placeholder={t('wizard.character.namePlaceholder')}
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
          label={t('wizard.character.stateLabel')}
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
            placeholder={t('wizard.character.statePlaceholder')}
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
          label={t('wizard.character.allianceLabel')}
          required
          error={stepErrors.currentAlliance}
          hint={t('wizard.character.allianceHint')}
        >
          <input
            className="control"
            id="currentAlliance"
            value={draft.currentAlliance}
            maxLength={50}
            onChange={(e) => {
              setDraftField('currentAlliance', e.target.value, true);
              setStepErrors((old) => ({ ...old, currentAlliance: '' }));
            }}
            placeholder={t('wizard.character.alliancePlaceholder')}
            data-testid="current-alliance"
          />
        </Field>
      </FormSection>
    </StepLayout>
  );
}
