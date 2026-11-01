import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Field, FormSection } from '../../components/Field';
import { CommaFormattedNumberInput } from '../../components/form/CommaFormattedNumberInput';
import { StepLayout } from '../../components/form/StepLayout';
import { KNOWN_STATES } from '../../config/states';
import { useApplicationDraft, type StepErrors } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

export function CombatPowerStep() {
  const { t } = useTranslation();
  const { draft, setDraftField, validateStep, setNavigationNotice } = useApplicationDraft();
  const { nextStep, prevStep } = useWizardNavigation();
  const [stepErrors, setStepErrors] = useState<StepErrors>({});

  const stateOptions = useMemo(
    () => KNOWN_STATES.filter((state) => state.toLowerCase().includes(draft.currentState.toLowerCase())),
    [draft.currentState]
  );

  const handleContinue = () => {
    const errors = validateStep('combat');
    setStepErrors(errors);
    setNavigationNotice(Object.values(errors)[0] || '');
    if (Object.keys(errors).length === 0) {
      nextStep();
    }
  };

  return (
    <StepLayout
      navigationProps={{
        onContinue: handleContinue,
        onBack: prevStep,
        continueLabel: t('wizard.combat.continue'),
        // backLabel: 'Back to Character Details',
      }}
    >
      {/* ── Section 1: Current state & alliance ── */}
      <FormSection number="01" title={t('wizard.combat.location')}>
        <Field
          id="currentState"
          label={t('wizard.combat.stateLabel')}
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
            placeholder={t('wizard.combat.statePlaceholder')}
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
          label={t('wizard.combat.allianceLabel')}
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
            placeholder={t('wizard.combat.allianceHint')}
            data-testid="current-alliance"
          />
        </Field>
      </FormSection>

      {/* ── Section 2: Arena powers ── */}
      <FormSection number="02" title={t('wizard.combat.arenaTitle')}>
        <p className="hint" style={{ margin: '-3px 0 12px' }}>
          {t('wizard.combat.arenaHint')}
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
                placeholder={t(`wizard.combat.f${index + 1}Placeholder`)}
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
