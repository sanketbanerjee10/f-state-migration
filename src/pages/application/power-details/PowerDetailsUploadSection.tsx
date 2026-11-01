import type { RefObject } from 'react';
import type { TFunction } from 'i18next';
import { FileImage, RefreshCw, ShieldCheck, Trash2, Upload } from 'lucide-react';
import { FormSection } from '../../../components/Field';
import { ScreenshotRequirementsGuide } from '../../../components/ocr/ScreenshotRequirementsGuide';
import { OcrProgress } from '../../../components/ocr/OcrProgress';

export type PowerDetailsUploadSectionProps = {
  t: TFunction;
  hasScreenshot: boolean;
  processing: boolean;
  dragging: boolean;
  ocrProgress: { status: string; progress: number } | null;
  ocrError: string;
  ocrSuccess: boolean;
  ocrUncertain: boolean;
  setDragging: (value: boolean) => void;
  onBrowse: () => void;
  onFileSelected: (file: File) => void;
  onCancelOcr: () => void;
  onReplaceClick: () => void;
  onRemove: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
};

export function PowerDetailsUploadSection({
  t,
  hasScreenshot,
  processing,
  dragging,
  ocrProgress,
  ocrError,
  ocrSuccess,
  ocrUncertain,
  setDragging,
  onBrowse,
  onFileSelected,
  onCancelOcr,
  onReplaceClick,
  onRemove,
  inputRef,
}: PowerDetailsUploadSectionProps) {
  return (
    <FormSection number="01" title={t('wizard.power.screenshotOptional')}>
      <>
        <p className="hint" style={{ marginBottom: 10 }}>
          {t('wizard.power.intro')}
        </p>

          {!hasScreenshot && <ScreenshotRequirementsGuide />}

          <input
            ref={inputRef}
            hidden
            type="file"
            accept="image/png,image/jpeg,.jpg,.jpeg,.png"
            aria-label={t('wizard.power.title')}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileSelected(file);
            }}
            data-testid="screenshot-input"
          />

          {!hasScreenshot && !processing && (
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
                if (file) onFileSelected(file);
              }}
              onClick={onBrowse}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onBrowse();
                }
              }}
            >
              <div className="flex items-center gap-2">
                <div className="upload-icon">
                  <Upload size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: 12 }}>{t('wizard.power.uploadPrompt')}</strong>
                  <div className="upload-copy">
                    <span>{t('wizard.power.formats')}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="button button-quiet"
                onClick={(e) => {
                  e.stopPropagation();
                  onBrowse();
                }}
                data-testid="choose-screenshot"
              >
                <FileImage size={14} /> {t('wizard.power.choose')}
              </button>
            </div>
          )}

          <OcrProgress
            processing={processing}
            progress={ocrProgress?.progress || 0}
            error={ocrError}
            success={ocrSuccess}
            uncertain={ocrUncertain}
            onCancel={onCancelOcr}
            onRetry={onReplaceClick}
          />

          {hasScreenshot && !processing && (
            <div className="screenshot-actions-bar" data-testid="screenshot-actions-bar">
              <div className="screenshot-status-pill">
                <div className="flex align-center gap-1">
                  <ShieldCheck size={14} />
                  <div>{t('wizard.power.verified')}</div>
                </div>
                <div className="verified-badge-text">{t('wizard.power.locked')}</div>
              </div>
              <div className="screenshot-action-buttons">
                <button
                  type="button"
                  className="button button-quiet button-sm"
                  onClick={onReplaceClick}
                  data-testid="replace-screenshot"
                >
                  <RefreshCw size={13} /> {t('wizard.power.replace')}
                </button>
                <button
                  type="button"
                  className="button button-quiet button-sm button-danger-text"
                  onClick={onRemove}
                  data-testid="remove-screenshot"
                  aria-label={t('common.actions.remove')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )}
      </>
    </FormSection>
  );
}
