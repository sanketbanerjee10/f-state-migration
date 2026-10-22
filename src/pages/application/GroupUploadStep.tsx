import { useRef, useState } from 'react';
import { CheckCircle2, FileImage, Upload, Users, X } from 'lucide-react';
import { Field, FormSection } from '../../components/Field';
import { StepLayout } from '../../components/form/StepLayout';
import { useApplicationDraft } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

export function GroupUploadStep() {
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
      setFileError('Please choose a PNG or JPG/JPEG image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError('The file is over the 10 MB limit.');
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
        skipLabel: 'Skip this step',
        continueLabel: 'Continue to Review',
        // backLabel: 'Back to Preferences',
      }}
    >
      <FormSection number="05" title="Group migration proof (optional)">
        <div className="group-upload-info-card">
          <div className="group-upload-header">
            <Users size={18} className="group-icon" />
            <div>
              <h3 className="group-upload-title">Group Roster & Proof</h3>
              <p className="hint">
                If you have a roster screenshot, group list, or team member summary, you can upload it here.
                This step is completely optional — you can also coordinate member placement directly with State 565 leadership.
              </p>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          hidden
          type="file"
          accept="image/png,image/jpeg,.jpg,.jpeg,.png"
          aria-label="Group roster screenshot"
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
              <strong>Upload group roster screenshot or proof</strong>
              <span>PNG or JPG, up to 10 MB · Optional</span>
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
              <FileImage size={14} /> Choose file
            </button>
          </div>
        ) : (
          <div className="screenshot-actions-bar" data-testid="group-screenshot-ready">
            <span className="screenshot-status-pill">
              <CheckCircle2 size={14} /> {draft.groupScreenshotFileName || 'Group roster attached'}
            </span>
            <div className="screenshot-action-buttons">
              <button
                type="button"
                className="button button-quiet button-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Change file
              </button>
              <button
                type="button"
                className="button button-quiet button-sm button-danger-text"
                onClick={removeGroupScreenshot}
                data-testid="remove-group-screenshot"
              >
                <X size={13} /> Remove
              </button>
            </div>
          </div>
        )}

        {fileError && <p className="error-text" role="alert">{fileError}</p>}
      </FormSection>
    </StepLayout>
  );
}
