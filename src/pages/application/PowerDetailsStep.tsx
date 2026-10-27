import { useRef, useState } from 'react';
import { FileImage, RefreshCw, ShieldCheck, Sofa, Trash2, Upload } from 'lucide-react';
import { Field, FormSection } from '../../components/Field';
import { CommaFormattedNumberInput } from '../../components/form/CommaFormattedNumberInput';
import { StepLayout } from '../../components/form/StepLayout';
import { ScreenshotRequirementsGuide } from '../../components/ocr/ScreenshotRequirementsGuide';
import { OcrProgress } from '../../components/ocr/OcrProgress';
import { recognizeScreenshot } from '../../lib/ocr';
import { parseMagnitude } from '../../lib/parsers';
import { calculateMigrationScoreFromRaw, TIER_COLORS, useLiveTierThresholds } from '../../lib/migrationScore';
import { MigrationScoreBadge, VerifiedBadge, MigrationScoringGuide } from '../../components/MigrationScoringGuide';
import { useApplicationDraft, type StepErrors, type ApplicationDraft } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';
import type { OcrDiagnostics } from '../../lib/ocr';

export function PowerDetailsStep() {
  const {
    draft,
    setDraftField,
    applyOcrResults,
    setScreenshotFile,
    removeScreenshot,
    validateStep,
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { thresholds } = useLiveTierThresholds();

  // A field is locked only when:
  //   1. A screenshot was successfully processed (screenshotPresent), AND
  //   2. The field has a value (non-empty), AND
  //   3. The user has NOT manually edited it (i.e. it came from OCR, not keyboard input)
  // This means: if OCR missed a field (value is empty), it stays editable.
  // If the user types into an empty field, dirtyFields[key] becomes true → not locked.
  type PowerDraftKey = 'structurePower' | 'techPower' | 'troopPower' | 'heroPower' | 'modVehiclePower';

  const screenshotPresent = draft.hasScreenshot;
  const fieldLocked = (fieldKey: PowerDraftKey, value: string) =>
    screenshotPresent && value.trim() !== '' && !draft.dirtyFields[fieldKey];
  // powerLocked is true only if ALL power fields are OCR-locked (drives section hint text)
  const powerKeys: PowerDraftKey[] = ['structurePower', 'techPower', 'troopPower', 'heroPower', 'modVehiclePower'];
  const powerLocked =
    screenshotPresent &&
    powerKeys.every((k) => {
      const v = String(draft[k] ?? '');
      return v.trim() !== '' && !draft.dirtyFields[k];
    });

  // Calculate live migration score preview based on entered powers and DB thresholds
  const rawStruct = parseMagnitude(draft.structurePower) || 0;
  const rawTech = parseMagnitude(draft.techPower) || 0;
  const rawHero = parseMagnitude(draft.heroPower) || 0;
  const rawVeh = parseMagnitude(draft.modVehiclePower) || 0;
  const scoreResult = calculateMigrationScoreFromRaw(rawStruct, rawTech, rawHero, rawVeh, thresholds);

  const processFile = (file: File) => {
    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type) && !/\.(png|jpe?g)$/i.test(file.name)) {
      setOcrError('Please upload a PNG or JPG/JPEG image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setOcrError('The image is over the 10 MB limit. Please choose a smaller image.');
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
    setOcrProgress({ status: 'Reading your screenshot…', progress: 0 });

    const controller = new AbortController();
    abortRef.current = controller;

    recognizeScreenshot(file, setOcrProgress, controller.signal)
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
            `Invalid image: only ${capturedCount} of ${totalRequired} required player fields could be detected. Please upload a clear Player Details screenshot or use the manual entry method below.`
          );
          setOcrUncertain(false);
          setOcrSuccess(false);
        } else {
          applyOcrResults(result.extracted, file);
          if (result.confidence < 55 || missingCount > 0) {
            setOcrUncertain(true);
          } else {
            setOcrSuccess(true);
          }
        }
      })
      .catch((error) => {
        if ((error as Error)?.name !== 'AbortError') {
          setOcrError("We couldn't read this screenshot. Try another image or enter the details manually.");
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
    setOcrError('Recognition cancelled. You can enter your details manually below.');
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
    if (Object.keys(errors).length === 0) {
      if (scoreResult?.tier) {
        setDraftField('tier', scoreResult.tier, false);
      }
      nextStep();
    }
  };

  return (
    <StepLayout
      navigationProps={{
        onContinue: handleContinue,
        continueLabel: 'Continue to Combat Power',
        disabled: processing,
      }}
    >
      {/* ── Section 1: Screenshot upload (optional) ── */}
      <FormSection number="01" title="Power details screenshot (optional)">
        <p className="hint" style={{ marginBottom: 10 }}>
          Upload a screenshot to automatically prefill the fields below — or skip this and enter them manually.
        </p>

        {!draft.hasScreenshot && <ScreenshotRequirementsGuide />}

        <input
          ref={fileInputRef}
          hidden
          type="file"
          accept="image/png,image/jpeg,.jpg,.jpeg,.png"
          aria-label="Power details screenshot"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
          data-testid="screenshot-input"
        />

        {/* Upload dropzone — shown before any screenshot is selected */}
        {!draft.hasScreenshot && !processing && (
          <div
            className={`upload-zone compact-upload-zone ${dragging ? 'is-dragging' : ''} flex items-center justify-between flex-wrap`}
            data-testid="screenshot-dropzone"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) processFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <div className="flex items-center gap-2">
              <div className="upload-icon">
                <Upload size={16} />
              </div>
              <div>
                <strong style={{fontSize: 12}}>Upload a screenshot of your player details</strong>
                <div className="upload-copy">
                  <span>PNG or JPG, up to 10 MB</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="button button-quiet"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              data-testid="choose-screenshot"
            >
              <FileImage size={14} /> Choose image
            </button>
          </div>
        )}

        {/* OCR Progress & feedback */}
        <OcrProgress
          processing={processing}
          progress={ocrProgress?.progress || 0}
          error={ocrError}
          success={ocrSuccess}
          uncertain={ocrUncertain}
          onCancel={handleCancelOcr}
          onRetry={handleReplaceClick}
        />

        {import.meta.env.DEV && ocrDiagnostics && (
          <details className="ocr-dev-tools" data-testid="ocr-dev-tools">
            <summary>OCR developer output</summary>
            <div className="ocr-dev-tools-grid">
              <section>
                <strong>Tesseract</strong>
                <p>Confidence: {ocrDiagnostics.tesseract.confidence.toFixed(1)}</p>
                <pre>{ocrDiagnostics.tesseract.fullText || '(no full-image text)'}</pre>
                <p>Header reads</p>
                <pre>{JSON.stringify(ocrDiagnostics.tesseract.headerReads, null, 2)}</pre>
                <p>Name reads</p>
                <pre>{JSON.stringify(ocrDiagnostics.tesseract.nameReads, null, 2)}</pre>
              </section>
              <section>
                <strong>PaddleOCR</strong>
                <p>Available: {ocrDiagnostics.paddleAvailable ? 'yes' : 'no'}</p>
                <p>Stats read</p>
                <pre>{ocrDiagnostics.paddle.statsText || '(no stats read)'}</pre>
                <p>Name reads</p>
                <pre>{JSON.stringify(ocrDiagnostics.paddle.nameReads, null, 2)}</pre>
              </section>
            </div>
          </details>
        )}

        {/* Replace / Remove actions after screenshot is loaded */}
        {draft.hasScreenshot && !processing && (
          <div className="screenshot-actions-bar" data-testid="screenshot-actions-bar">
            <div className="screenshot-status-pill">
              <div className="flex align-center gap-1">
                <ShieldCheck size={14} />
                <div>Screenshot Verified</div>
              </div>
              <div className="verified-badge-text">Power breakdown locked</div>
            </div>
            <div className="screenshot-action-buttons">
              <button
                type="button"
                className="button button-quiet button-sm"
                onClick={handleReplaceClick}
                data-testid="replace-screenshot"
              >
                <RefreshCw size={13} /> Replace
              </button>
              <button
                type="button"
                className="button button-quiet button-sm button-danger-text"
                onClick={handleRemove}
                data-testid="remove-screenshot"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )}
      </FormSection>

      {/* ── Section 2: Character stats ── */}
      <FormSection number="02" title="Character details">
        <div className="row-3">
          <Field
            id="playerName"
            label="In-game name"
            required
            error={stepErrors.playerName}
            hint="Your character name as shown in-game"
          >
            <input
              className="control"
              id="playerName"
              value={draft.playerName}
              maxLength={40}
              placeholder="e.g. GOD Sankeyyy"
              onChange={(e) => {
                setDraftField('playerName', e.target.value, true);
                setStepErrors((old) => ({ ...old, playerName: '' }));
              }}
              data-testid="ocr-player-name"
            />
          </Field>

          <Field
            id="highestPowerOnRecord"
            label="Power on Record"
            required
            error={stepErrors.highestPowerOnRecord}
            hint="Your actual player power"
          >
            <CommaFormattedNumberInput
              className="control"
              id="highestPowerOnRecord"
              value={draft.highestPowerOnRecord}
              placeholder="Calculated from the power breakdown"
              disabled
              onChange={() => undefined}
              data-testid="ocr-highest-power"
            />
          </Field>

          <Field
            id="kills"
            label="Kills"
            required
            error={stepErrors.kills}
            hint="From profile card skull icon"
          >
            <CommaFormattedNumberInput
              className="control"
              id="kills"
              value={draft.kills}
              placeholder="e.g. 5,453,196"
              onChange={(value) => {
                setDraftField('kills', value, true);
                setStepErrors((old) => ({ ...old, kills: '' }));
              }}
              data-testid="ocr-kills"
            />
          </Field>
        </div>
      </FormSection>

      {/* ── Section 3: Power breakdown ── */}
      <FormSection number="03" title="Power breakdown">
        <p className="hint" style={{ marginBottom: 12 }}>
          {screenshotPresent
            ? powerLocked
              ? 'These values were extracted from your screenshot and are locked. Remove the screenshot above to edit them.'
              : 'Some values were extracted from your screenshot. Fields that could not be read are still editable — please fill them in.'
            : 'Enter each power category from your player details screen. All fields are required.'}
        </p>

        <div className="row-3">
          <Field
            id="structurePower"
            label="Structure Power"
            required
            error={stepErrors.structurePower}
          >
            <CommaFormattedNumberInput
              className={`control${fieldLocked('structurePower', draft.structurePower) ? ' control-verified' : ''}`}
              id="structurePower"
              value={draft.structurePower}
              placeholder="e.g. 84,785,628"
              disabled={fieldLocked('structurePower', draft.structurePower)}
              onChange={(value) => {
                setDraftField('structurePower', value, true);
                setStepErrors((old) => ({ ...old, structurePower: '' }));
              }}
              data-testid="ocr-structure-power"
            />
          </Field>

          <Field
            id="techPower"
            label="Tech Power"
            required
            error={stepErrors.techPower}
          >
            <CommaFormattedNumberInput
              className={`control${fieldLocked('techPower', draft.techPower) ? ' control-verified' : ''}`}
              id="techPower"
              value={draft.techPower}
              placeholder="e.g. 19,187,725"
              disabled={fieldLocked('techPower', draft.techPower)}
              onChange={(value) => {
                setDraftField('techPower', value, true);
                setStepErrors((old) => ({ ...old, techPower: '' }));
              }}
              data-testid="ocr-tech-power"
            />
          </Field>

          <Field
            id="troopPower"
            label="Troop Power"
            required
            error={stepErrors.troopPower}
          >
            <CommaFormattedNumberInput
              className={`control${fieldLocked('troopPower', draft.troopPower) ? ' control-verified' : ''}`}
              id="troopPower"
              value={draft.troopPower}
              placeholder="e.g. 66,198,020"
              disabled={fieldLocked('troopPower', draft.troopPower)}
              onChange={(value) => {
                setDraftField('troopPower', value, true);
                setStepErrors((old) => ({ ...old, troopPower: '' }));
              }}
              data-testid="ocr-troop-power"
            />
          </Field>
        </div>

        <div className="row-3" style={{ marginTop: 12 }}>
          <Field
            id="heroPower"
            label="Hero Power"
            required
            error={stepErrors.heroPower}
          >
            <CommaFormattedNumberInput
              className={`control${fieldLocked('heroPower', draft.heroPower) ? ' control-verified' : ''}`}
              id="heroPower"
              value={draft.heroPower}
              placeholder="e.g. 62,634,222"
              disabled={fieldLocked('heroPower', draft.heroPower)}
              onChange={(value) => {
                setDraftField('heroPower', value, true);
                setStepErrors((old) => ({ ...old, heroPower: '' }));
              }}
              data-testid="ocr-hero-power"
            />
          </Field>

          <Field
            id="modVehiclePower"
            label="Mod Vehicle Power"
            required
            error={stepErrors.modVehiclePower}
          >
            <CommaFormattedNumberInput
              className={`control${fieldLocked('modVehiclePower', draft.modVehiclePower) ? ' control-verified' : ''}`}
              id="modVehiclePower"
              value={draft.modVehiclePower}
              placeholder="e.g. 9,436,786"
              disabled={fieldLocked('modVehiclePower', draft.modVehiclePower)}
              onChange={(value) => {
                setDraftField('modVehiclePower', value, true);
                setStepErrors((old) => ({ ...old, modVehiclePower: '' }));
              }}
              data-testid="ocr-mod-vehicle-power"
            />
          </Field>
        </div>

        {/* ── Live Migration Score Preview Card ── */}
        {scoreResult && (
          <div
            style={{
              marginTop: 18,
              padding: '14px 16px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
              border: `1px solid ${TIER_COLORS[scoreResult.tier].border}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
            data-testid="migration-score-preview"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sofa size={19} color={TIER_COLORS[scoreResult.tier].iconColor} strokeWidth={2.3} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>
                  Estimated Migration Score:
                </span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: TIER_COLORS[scoreResult.tier].text,
                    fontFamily: 'var(--app-font-mono)',
                  }}
                >
                  {scoreResult.score.toFixed(2)}
                </span>
                <MigrationScoreBadge scoreResult={scoreResult} size="sm" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: TIER_COLORS[scoreResult.tier].bg,
                    border: `1px solid ${TIER_COLORS[scoreResult.tier].border}`,
                    color: TIER_COLORS[scoreResult.tier].text,
                  }}
                >
                  {TIER_COLORS[scoreResult.tier].label} Tier
                </span>
                <span
                  style={{
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1',
                  }}
                >
                  {scoreResult.passesRequired} passes required
                </span>
              </div>
            </div>

            {/* <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px 14px',
                fontSize: 11,
                color: '#64748b',
                paddingTop: 8,
                borderTop: '1px dashed rgba(255, 255, 255, 0.07)',
              }}
            >
              <span>Base: <strong style={{ color: '#94a3b8' }}>{scoreResult.breakdown.baseComponent.toFixed(2)}</strong></span>
              <span>Tech & Vehicle Bonus: <strong style={{ color: '#94a3b8' }}>+{scoreResult.breakdown.techVehicleBonus.toFixed(2)}</strong></span>
              {scoreResult.breakdown.eliteTechBonus > 0 && (
                <span>Elite Tech Bonus: <strong style={{ color: '#fde047' }}>+{scoreResult.breakdown.eliteTechBonus.toFixed(2)}</strong></span>
              )}
            </div> */}
          </div>
        )}

        {/* ── Informative Guide on Migration Scoring and Tiers ── */}
        <MigrationScoringGuide
          currentTier={scoreResult?.tier}
          currentScore={scoreResult?.score}
          thresholds={thresholds}
        />
      </FormSection>
    </StepLayout>
  );
}
