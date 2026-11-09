import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Field, FormSection } from '../../components/Field';
import { CommaFormattedNumberInput } from '../../components/form/CommaFormattedNumberInput';
import { StepLayout } from '../../components/form/StepLayout';
import { KNOWN_STATES } from '../../config/states';
import { parseMagnitude } from '../../lib/parsers';
import {
  T10_RESEARCH_AUTO_COMPLETE_TECH_POWER,
  useApplicationDraft,
  type StepErrors,
} from '../../hooks/useApplicationDraft';
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
  const isT10AutoComplete =
    (parseMagnitude(draft.techPower) || 0) >= T10_RESEARCH_AUTO_COMPLETE_TECH_POWER;
  const t10ResearchComplete = isT10AutoComplete || draft.t10ResearchComplete === true;
  const t10ResearchPercent = Number(draft.t10ResearchPercent);
  const t10ResearchPercentHint =
    draft.t10ResearchPercent !== '' &&
    Number.isInteger(t10ResearchPercent) &&
    t10ResearchPercent >= 0 &&
    t10ResearchPercent <= 99
      ? t(`wizard.combat.t10PercentMilestones.${Math.floor(t10ResearchPercent / 10)}`)
      : undefined;

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

      <FormSection number="03" title={t('wizard.combat.t10Title')}>
        <Field
          id="t10ResearchComplete"
          label={t('wizard.combat.t10Question')}
          required
          error={stepErrors.t10ResearchComplete}
          hint={t10ResearchComplete ? t('wizard.combat.t10CompleteMessage') : undefined}
        >
          <div
            className="radio-grid"
            role="radiogroup"
            aria-label={t('wizard.combat.t10Question')}
          >
            <label className="radio-card" htmlFor="t10ResearchComplete">
              <input
                id="t10ResearchComplete"
                type="radio"
                name="t10ResearchComplete"
                value="yes"
                checked={t10ResearchComplete}
                onChange={() => {
                  setDraftField('t10ResearchComplete', true, true);
                  setDraftField('t10ResearchPercent', '', true);
                  setStepErrors((old) => ({
                    ...old,
                    t10ResearchComplete: '',
                    t10ResearchPercent: '',
                  }));
                }}
                data-testid="t10-research-yes"
              />
              {t('wizard.combat.t10Yes')}
            </label>
            <label className="radio-card" htmlFor="t10-research-incomplete">
              <input
                id="t10-research-incomplete"
                type="radio"
                name="t10ResearchComplete"
                value="no"
                checked={!t10ResearchComplete && draft.t10ResearchComplete === false}
                disabled={isT10AutoComplete}
                onChange={() => {
                  setDraftField('t10ResearchComplete', false, true);
                  setStepErrors((old) => ({ ...old, t10ResearchComplete: '' }));
                }}
                data-testid="t10-research-no"
              />
              {t('wizard.combat.t10No')}
            </label>
          </div>
          {isT10AutoComplete && (
            <p className="hint">{t('wizard.combat.t10AutoComplete')}</p>
          )}
          {!t10ResearchComplete && draft.t10ResearchComplete === false && (
            <p className="hint">{t('wizard.combat.t10Hint')}</p>
          )}
        </Field>

        {!t10ResearchComplete && draft.t10ResearchComplete === false && (
          <Field
            id="t10ResearchPercent"
            label={t('wizard.combat.t10Percent')}
            required
            error={stepErrors.t10ResearchPercent}
            hint={t10ResearchPercentHint}
          >
            <div className="t10-percent-input">
              <input
                className="control"
                id="t10ResearchPercent"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={2}
                value={draft.t10ResearchPercent}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value !== '' && (!/^\d{1,2}$/.test(value) || Number(value) > 99)) return;
                  setDraftField('t10ResearchPercent', value, true);
                  setStepErrors((old) => ({ ...old, t10ResearchPercent: '' }));
                }}
                placeholder={t('wizard.combat.t10PercentPlaceholder')}
                data-testid="t10-research-percent"
              />
              <span aria-hidden="true">%</span>
            </div>
          </Field>
        )}
      </FormSection>
    </StepLayout>
  );
}
