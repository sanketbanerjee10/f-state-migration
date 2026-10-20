import { ArrowLeft, ArrowRight, LoaderCircle, Sparkles } from 'lucide-react';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

export interface StepNavigationProps {
  onContinue?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  continueLabel?: string;
  backLabel?: string;
  skipLabel?: string;
  showSkip?: boolean;
  submitting?: boolean;
  disabled?: boolean;
  submitMode?: boolean;
  /** When true renders a compact inline bar (used at the top of the form). */
  compact?: boolean;
}

export function StepNavigation({
  onContinue,
  onBack,
  onSkip,
  continueLabel = 'Continue',
  backLabel = 'Back',
  skipLabel = 'Skip this step',
  showSkip = false,
  submitting = false,
  disabled = false,
  submitMode = false,
  compact = false,
}: StepNavigationProps) {
  const { isFirstStep, prevStep } = useWizardNavigation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      prevStep();
    }
  };

  return (
    <div
      className={compact ? 'wizard-navigation-bar wizard-nav-top' : 'wizard-navigation-bar'}
      data-testid={compact ? 'wizard-navigation-top' : 'wizard-navigation'}
    >
      <div className="wizard-nav-left">
        {!isFirstStep && (
          <button
            type="button"
            className="button button-quiet"
            onClick={handleBack}
            disabled={submitting}
            data-testid={compact ? 'wizard-back-btn-top' : 'wizard-back-btn'}
          >
            <ArrowLeft size={15} /> {backLabel}
          </button>
        )}
      </div>

      <div className="wizard-nav-right">
        {showSkip && onSkip && (
          <button
            type="button"
            className="button button-quiet"
            onClick={onSkip}
            disabled={submitting}
            data-testid={compact ? 'wizard-skip-btn-top' : 'wizard-skip-btn'}
          >
            {skipLabel}
          </button>
        )}

        <button
          type={onContinue ? 'button' : 'submit'}
          className="button button-primary"
          onClick={onContinue}
          disabled={disabled || submitting}
          data-testid={compact ? 'wizard-continue-btn-top' : 'wizard-continue-btn'}
        >
          {submitting ? (
            <>
              <LoaderCircle size={15} className="spin" /> Sending…
            </>
          ) : submitMode ? (
            <>
              <Sparkles size={15} /> {continueLabel || 'Submit application'}
            </>
          ) : (
            <>
              {continueLabel} <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
