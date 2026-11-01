import type { TFunction } from 'i18next';
import { Field, FormSection } from '../../../components/Field';
import { CommaFormattedNumberInput } from '../../../components/form/CommaFormattedNumberInput';
import type { StepErrors } from '../../../hooks/useApplicationDraft';

export type PowerCharacterStatsSectionProps = {
  t: TFunction;
  draft: {
    playerName: string;
    highestPowerOnRecord: string;
    kills: string;
  };
  stepErrors: StepErrors;
  onPlayerNameChange: (value: string) => void;
  onKillsChange: (value: string) => void;
  clearError: (field: keyof StepErrors) => void;
};

export function PowerCharacterStatsSection({
  t,
  draft,
  stepErrors,
  onPlayerNameChange,
  onKillsChange,
  clearError,
}: PowerCharacterStatsSectionProps) {
  return (
    <FormSection number="02" title={t('wizard.power.character')}>
      <div className="row-3">
          <Field
            id="playerName"
            label={t('wizard.power.playerName')}
            required
            error={stepErrors.playerName}
            hint={t('wizard.power.playerHint')}
          >
            <input
              className="control"
              id="playerName"
              value={draft.playerName}
              maxLength={30}
              placeholder={t('wizard.power.playerPlaceholder')}
              onChange={(e) => {
                onPlayerNameChange(e.target.value);
                clearError('playerName');
              }}
              data-testid="ocr-player-name"
            />
          </Field>

          <Field
            id="highestPowerOnRecord"
            label={t('wizard.power.powerRecord')}
            required
            error={stepErrors.highestPowerOnRecord}
            hint={t('wizard.power.powerHint')}
          >
            <CommaFormattedNumberInput
              className="control control-verified"
              id="highestPowerOnRecord"
              value={draft.highestPowerOnRecord}
              placeholder={t('wizard.power.currentPower')}
              disabled
              onChange={() => undefined}
              data-testid="ocr-highest-power"
            />
          </Field>

          <Field
            id="kills"
            label={t('wizard.power.killsOptional')}
            error={stepErrors.kills}
            hint={t('wizard.power.killsHint')}
          >
            <CommaFormattedNumberInput
              className="control"
              id="kills"
              value={draft.kills}
              placeholder={t('wizard.power.killsPlaceholder')}
              onChange={(value) => {
                onKillsChange(value);
                clearError('kills');
              }}
              data-testid="ocr-kills"
            />
          </Field>
        </div>
    </FormSection>
  );
}
