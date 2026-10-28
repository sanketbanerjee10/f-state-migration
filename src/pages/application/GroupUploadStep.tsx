import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, FileImage, Upload, Users, X } from 'lucide-react';
import { Field, FormSection } from '../../components/Field';
import { StepLayout } from '../../components/form/StepLayout';
import { useApplicationDraft } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

export function GroupUploadStep() {
  const { t } = useTranslation();
  const {
    draft,
    setGroupScreenshotFile,
    removeGroupScreenshot,
  } = useApplicationDraft();

  const { nextStep, prevStep } = useWizardNavigation();
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) && !/\.(png|jpe?g)$/i.test(file.name)) {
      setFileError(t('wizard.groupUpload.invalidType'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError(t('wizard.groupUpload.tooLarge'));
      return;
    }

    setFileError('');
    setGroupScreenshotFile(file);
  };

  const handleSkip = () => {
    nextStep();
  };

  const handleContinue = () => {
    nextStep();
  };

  return (
    <StepLayout
      navigationProps={{
        onContinue: handleContinue,
        onBack: prevStep,
        onSkip: handleSkip,
        showSkip: true,
        skipLabel: t('wizard.groupUpload.skip'),
        continueLabel: t('wizard.groupUpload.continue'),
        // backLabel: 'Back to Preferences',
      }}
    >
      <FormSection number="05" title={t('wizard.groupUpload.title')}>
        <div className="group-upload-info-card">
          <div className="group-upload-header">
            <Users size={18} className="group-icon" />
            <div>
              <h3 className="group-upload-title">{t('wizard.groupUpload.heading')}</h3>
              <p className="hint">
                {t('wizard.groupUpload.intro')}
              </p>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          hidden
          type="file"
          accept="image/png,image/jpeg,.jpg,.jpeg,.png"
          aria-label={t('wizard.groupUpload.screenshot')}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          data-testid="group-screenshot-input"
        />

        {!draft.hasGroupScreenshot ? (
          <div
            className={`upload-zone compact-upload-zone ${dragging ? 'is-dragging' : ''}`}
            data-testid="group-upload-dropzone"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
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
            <div className="upload-icon">
              <Upload size={20} />
            </div>
            <div className="upload-copy">
              <strong>{t('wizard.groupUpload.uploadPrompt')}</strong>
              <span>{t('wizard.groupUpload.formats')}</span>
            </div>
            <button
              type="button"
              className="button button-quiet"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              data-testid="choose-group-screenshot"
            >
              <FileImage size={14} /> {t('wizard.groupUpload.choose')}
            </button>
          </div>
        ) : (
          <div className="screenshot-actions-bar" data-testid="group-screenshot-ready">
            <span className="screenshot-status-pill">
              <CheckCircle2 size={14} /> {draft.groupScreenshotFileName || t('wizard.groupUpload.attached')}
            </span>
            <div className="screenshot-action-buttons">
              <button
                type="button"
                className="button button-quiet button-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                {t('wizard.groupUpload.change')}
              </button>
              <button
                type="button"
                className="button button-quiet button-sm button-danger-text"
                onClick={removeGroupScreenshot}
                data-testid="remove-group-screenshot"
              >
                <X size={13} /> {t('wizard.groupUpload.remove')}
              </button>
            </div>
          </div>
        )}

        {fileError && <p className="error-text" role="alert">{fileError}</p>}
      </FormSection>
    </StepLayout>
  );
}
