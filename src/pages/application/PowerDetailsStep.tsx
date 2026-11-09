import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/Dialogs';
import { StepLayout } from '../../components/form/StepLayout';
import { DismissibleToast } from '../../components/DismissibleToast';
import { parseMagnitude } from '../../lib/parsers';
import { calculateMigrationScoreFromRaw, useLiveTierThresholds } from '../../lib/migrationScore';
import {
  hasApplicationDraftData,
  useApplicationDraft,
  type StepErrors,
} from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';
import type { OcrDiagnostics } from '../../lib/ocr';
import { PowerDetailsUploadSection } from './power-details/PowerDetailsUploadSection';
import { PowerCharacterStatsSection } from './power-details/PowerCharacterStatsSection';
import { PowerBreakdownSection } from './power-details/PowerBreakdownSection';

export function PowerDetailsStep() {
  const { t } = useTranslation();
  const {
    draft,
    screenshotFile,
    groupScreenshotFile,
    setDraftField,
    applyOcrResults,
    setScreenshotFile,
    removeScreenshot,
    validateStep,
    clearDraft,
    setNavigationNotice,
    showOcrAccuracyNotice,
  } = useApplicationDraft();

  const { nextStep } = useWizardNavigation();

  const [processing, setProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<{ status: string; progress: number } | null>(null);
  const [ocrError, setOcrError] = useState('');
  const [ocrSuccess, setOcrSuccess] = useState(draft.hasScreenshot);
  const [ocrUncertain, setOcrUncertain] = useState(false);
  const [ocrDiagnostics, setOcrDiagnostics] = useState<OcrDiagnostics | null>(null);
  const [stepErrors, setStepErrors] = useState<StepErrors>({});
  const [dragging, setDragging] = useState(false);
  const [scoreErrorToast, setScoreErrorToast] = useState('');
  const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { thresholds } = useLiveTierThresholds();
  const hasDraftData = hasApplicationDraftData(draft, Boolean(screenshotFile), Boolean(groupScreenshotFile));

  // A field is locked only when:
  //   1. A screenshot was successfully processed (screenshotPresent), AND
  //   2. The field has a value (non-empty), AND
  //   3. The user has NOT manually edited it (i.e. it came from OCR, not keyboard input)
  // This means: if OCR missed a field (value is empty), it stays editable.
  // If the user types into an empty field, dirtyFields[key] becomes true → not locked.
  type PowerDraftKey = 'structurePower' | 'techPower' | 'troopPower' | 'heroPower' | 'modVehiclePower';

  const screenshotPresent = draft.hasScreenshot;
  const fieldLocked = (fieldKey: PowerDraftKey, value: string) =>
    screenshotPresent && parseMagnitude(value) !== null && !draft.dirtyFields[fieldKey];
  // powerLocked is true only if ALL power fields are OCR-locked (drives section hint text)
  const powerKeys: PowerDraftKey[] = ['structurePower', 'techPower', 'troopPower', 'heroPower', 'modVehiclePower'];
  const powerLocked =
    screenshotPresent &&
    powerKeys.every((k) => {
      const v = String(draft[k] ?? '');
      return parseMagnitude(v) !== null && !draft.dirtyFields[k];
    });

  // Calculate live migration score preview based on entered powers and DB thresholds
  const rawStruct = parseMagnitude(draft.structurePower) || 0;
  const rawTech = parseMagnitude(draft.techPower) || 0;
  const rawHero = parseMagnitude(draft.heroPower) || 0;
  const rawVeh = parseMagnitude(draft.modVehiclePower) || 0;
  const scoreResult = calculateMigrationScoreFromRaw(rawStruct, rawTech, rawHero, rawVeh, thresholds);
  const displayScoreResult = scoreResult
    ? { ...scoreResult, score: Math.max(0, scoreResult.score) }
    : null;

  const processFile = (file: File) => {
    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type) && !/\.(png|jpe?g)$/i.test(file.name)) {
      setOcrError(t('wizard.power.invalidType'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setOcrError(t('wizard.power.tooLarge'));
      return;
    }

    abortRef.current?.abort();
    removeScreenshot();
    setScreenshotFile(file);
    setOcrDiagnostics(null);
    setOcrError('');
    setOcrSuccess(false);
    setOcrUncertain(false);
    setProcessing(true);
    setOcrProgress({ status: t('wizard.power.reading'), progress: 0 });

    const controller = new AbortController();
    abortRef.current = controller;

    import('../../lib/ocr')
      .then(({ recognizeScreenshot }) =>
        recognizeScreenshot(file, setOcrProgress, controller.signal),
      )
      .then((result) => {
        setOcrDiagnostics(result.diagnostics);
        const requiredFields = [
          result.extracted.playerName,
          result.extracted.structurePower,
          result.extracted.techPower,
          result.extracted.troopPower,
          result.extracted.heroPower,
          result.extracted.modVehiclePower,
        ];
        const capturedCount = requiredFields.filter((val) => Boolean(val && val.trim())).length;
        const totalRequired = requiredFields.length;
        const missingCount = totalRequired - capturedCount;

        if (capturedCount < 5) {
          setScreenshotFile(null);
          setOcrError(
            t('wizard.power.invalidFields', { capturedCount, totalRequired })
          );
          setOcrUncertain(false);
          setOcrSuccess(false);
        } else {
          applyOcrResults(result.extracted, file);
          showOcrAccuracyNotice();
          if (result.confidence < 55 || missingCount > 0) {
            setOcrUncertain(true);
          } else {
            setOcrSuccess(true);
          }
        }
      })
      .catch((error) => {
        if ((error as Error)?.name !== 'AbortError') {
          setOcrError(t('wizard.power.readFailed'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setProcessing(false);
        }
      });
  };

  const handleCancelOcr = () => {
    abortRef.current?.abort();
    setProcessing(false);
    setOcrProgress(null);
    setOcrError(t('wizard.power.cancelled'));
  };

  const handleReplaceClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = () => {
    removeScreenshot();
    setOcrDiagnostics(null);
    setOcrSuccess(false);
    setOcrUncertain(false);
    setOcrError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleContinue = () => {
    const errors = validateStep('character');
    setStepErrors(errors);
    setNavigationNotice(Object.values(errors)[0] || '');
    if (Object.keys(errors).length === 0) {
      if (!scoreResult || scoreResult.score < 10 || scoreResult.score > 1000) {
        setNavigationNotice('wizard.power.invalidScore');
        setScoreErrorToast(
          t('wizard.power.invalidScore'),
        );
        return;
      }
      if (scoreResult?.tier) {
        setDraftField('tier', scoreResult.tier, false);
      }
      nextStep();
    }
  };

  const handleClearDraft = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setProcessing(false);
    setOcrProgress(null);
    setOcrError('');
    setOcrSuccess(false);
    setOcrUncertain(false);
    setOcrDiagnostics(null);
    setStepErrors({});
    setScoreErrorToast('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    clearDraft();
    setClearConfirmationOpen(false);
  };

  return (
    <>
      <DismissibleToast message={scoreErrorToast} onDismiss={() => setScoreErrorToast('')} />
      <StepLayout
        navigationProps={{
          onContinue: handleContinue,
          continueLabel: t('wizard.power.continue'),
          onClear: hasDraftData ? () => setClearConfirmationOpen(true) : undefined,
          clearLabel: t('wizard.power.clearForm'),
          disabled: processing,
        }}
      >
      <PowerDetailsUploadSection
        t={t}
        hasScreenshot={draft.hasScreenshot}
        processing={processing}
        dragging={dragging}
        ocrProgress={ocrProgress}
        ocrError={ocrError}
        ocrSuccess={ocrSuccess}
        ocrUncertain={ocrUncertain}
        setDragging={setDragging}
        onBrowse={() => fileInputRef.current?.click()}
        onFileSelected={processFile}
        onCancelOcr={handleCancelOcr}
        onReplaceClick={handleReplaceClick}
        onRemove={handleRemove}
        inputRef={fileInputRef}
      />

      <PowerCharacterStatsSection
        t={t}
        draft={{
          playerName: draft.playerName,
          highestPowerOnRecord: draft.highestPowerOnRecord,
          kills: draft.kills,
        }}
        stepErrors={stepErrors}
        onPlayerNameChange={(value) => setDraftField('playerName', value, true)}
        onKillsChange={(value) => setDraftField('kills', value, true)}
        clearError={(field) => setStepErrors((old) => ({ ...old, [field]: '' }))}
      />

      <PowerBreakdownSection
        t={t}
        screenshotPresent={screenshotPresent}
        powerLocked={powerLocked}
        draft={{
          structurePower: draft.structurePower,
          techPower: draft.techPower,
          troopPower: draft.troopPower,
          heroPower: draft.heroPower,
          modVehiclePower: draft.modVehiclePower,
        }}
        stepErrors={stepErrors}
        thresholds={thresholds}
        scoreResult={scoreResult}
        displayScoreResult={displayScoreResult}
        fieldLocked={fieldLocked}
        onFieldChange={(field, value) => {
          setDraftField(field, value, true);
        }}
        clearError={(field) => setStepErrors((old) => ({ ...old, [field]: '' }))}
      />
      </StepLayout>
      {clearConfirmationOpen && (
        <Modal
          title={t('wizard.power.clearFormTitle')}
          onClose={() => setClearConfirmationOpen(false)}
          actions={
            <>
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setClearConfirmationOpen(false)}
              >
                {t('common.actions.cancel')}
              </button>
              <button
                type="button"
                className="button button-primary"
                onClick={handleClearDraft}
              >
                {t('wizard.power.clearForm')}
              </button>
            </>
          }
          showCloseButton
        >
          <p>{t('wizard.power.clearFormConfirmation')}</p>
        </Modal>
      )}
    </>
  );
}
