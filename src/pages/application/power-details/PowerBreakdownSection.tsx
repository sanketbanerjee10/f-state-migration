import type { TFunction } from 'i18next';
import { Field, FormSection } from '../../../components/Field';
import { CommaFormattedNumberInput } from '../../../components/form/CommaFormattedNumberInput';
import { MigrationScoringGuide } from '../../../components/MigrationScoringGuide';
import type { StepErrors } from '../../../hooks/useApplicationDraft';
import type { MigrationScoreResult, TierThresholds } from '../../../lib/migrationScore';
import { PowerScorePreviewCard } from './PowerScorePreviewCard';

export type PowerBreakdownSectionProps = {
  t: TFunction;
  screenshotPresent: boolean;
  powerLocked: boolean;
  draft: {
    structurePower: string;
    techPower: string;
    troopPower: string;
    heroPower: string;
    modVehiclePower: string;
  };
  stepErrors: StepErrors;
  thresholds: TierThresholds;
  scoreResult: MigrationScoreResult | null;
  displayScoreResult: MigrationScoreResult | null;
  fieldLocked: (fieldKey: 'structurePower' | 'techPower' | 'troopPower' | 'heroPower' | 'modVehiclePower', value: string) => boolean;
  onFieldChange: (field: 'structurePower' | 'techPower' | 'troopPower' | 'heroPower' | 'modVehiclePower', value: string) => void;
  clearError: (field: keyof StepErrors) => void;
};

export function PowerBreakdownSection({
  t,
  screenshotPresent,
  powerLocked,
  draft,
  stepErrors,
  thresholds,
  scoreResult,
  displayScoreResult,
  fieldLocked,
  onFieldChange,
  clearError,
}: PowerBreakdownSectionProps) {
  return (
    <FormSection number="03" title={t('wizard.power.breakdown')}>
      <>
        <p className="hint" style={{ marginBottom: 12 }}>
          {screenshotPresent
            ? powerLocked
              ? t('wizard.power.lockedHint')
              : t('wizard.power.partialHint')
            : t('wizard.power.requiredHint')}
        </p>

        <div className="row-3">
          <Field id="structurePower" label={t('wizard.power.structure')} required error={stepErrors.structurePower}>
            <CommaFormattedNumberInput
              className={`control${fieldLocked('structurePower', draft.structurePower) ? ' control-verified' : ''}`}
              id="structurePower"
              value={draft.structurePower}
              placeholder={t('wizard.power.structurePlaceholder')}
              disabled={fieldLocked('structurePower', draft.structurePower)}
              onChange={(value) => {
                onFieldChange('structurePower', value);
                clearError('structurePower');
              }}
              data-testid="ocr-structure-power"
            />
          </Field>

          <Field id="techPower" label={t('wizard.power.tech')} required error={stepErrors.techPower}>
            <CommaFormattedNumberInput
              className={`control${fieldLocked('techPower', draft.techPower) ? ' control-verified' : ''}`}
              id="techPower"
              value={draft.techPower}
              placeholder={t('wizard.power.techPlaceholder')}
              disabled={fieldLocked('techPower', draft.techPower)}
              onChange={(value) => {
                onFieldChange('techPower', value);
                clearError('techPower');
              }}
              data-testid="ocr-tech-power"
            />
          </Field>

          <Field id="troopPower" label={t('wizard.power.troop')} required error={stepErrors.troopPower}>
            <CommaFormattedNumberInput
              className={`control${fieldLocked('troopPower', draft.troopPower) ? ' control-verified' : ''}`}
              id="troopPower"
              value={draft.troopPower}
              placeholder={t('wizard.power.troopPlaceholder')}
              disabled={fieldLocked('troopPower', draft.troopPower)}
              onChange={(value) => {
                onFieldChange('troopPower', value);
                clearError('troopPower');
              }}
              data-testid="ocr-troop-power"
            />
          </Field>
        </div>

        <div className="row-3" style={{ marginTop: 12 }}>
          <Field id="heroPower" label={t('wizard.power.hero')} required error={stepErrors.heroPower}>
            <CommaFormattedNumberInput
              className={`control${fieldLocked('heroPower', draft.heroPower) ? ' control-verified' : ''}`}
              id="heroPower"
              value={draft.heroPower}
              placeholder={t('wizard.power.heroPlaceholder')}
              disabled={fieldLocked('heroPower', draft.heroPower)}
              onChange={(value) => {
                onFieldChange('heroPower', value);
                clearError('heroPower');
              }}
              data-testid="ocr-hero-power"
            />
          </Field>

          <Field id="modVehiclePower" label={t('wizard.power.vehicle')} required error={stepErrors.modVehiclePower}>
            <CommaFormattedNumberInput
              className={`control${fieldLocked('modVehiclePower', draft.modVehiclePower) ? ' control-verified' : ''}`}
              id="modVehiclePower"
              value={draft.modVehiclePower}
              placeholder={t('wizard.power.vehiclePlaceholder')}
              disabled={fieldLocked('modVehiclePower', draft.modVehiclePower)}
              onChange={(value) => {
                onFieldChange('modVehiclePower', value);
                clearError('modVehiclePower');
              }}
              data-testid="ocr-mod-vehicle-power"
            />
          </Field>
        </div>

        <PowerScorePreviewCard t={t} scoreResult={scoreResult} displayScoreResult={displayScoreResult} />

        <MigrationScoringGuide
          currentTier={scoreResult?.tier}
          currentScore={scoreResult?.score}
          thresholds={thresholds}
        />
      </>
    </FormSection>
  );
}
