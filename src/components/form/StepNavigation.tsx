import { ArrowLeft, ArrowRight, LoaderCircle, Sparkles } from 'lucide-react';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';
import { useTranslation } from 'react-i18next';

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
  continueLabel,
  backLabel,
  skipLabel,
  showSkip = false,
  submitting = false,
  disabled = false,
  submitMode = false,
  compact = false,
}: StepNavigationProps) {
  const { isFirstStep, prevStep } = useWizardNavigation();
  const { t } = useTranslation();
  const translatedContinueLabel = continueLabel ?? t('wizard.navigation.continue');
  const translatedBackLabel = backLabel ?? t('wizard.navigation.back');
  const translatedSkipLabel = skipLabel ?? t('wizard.navigation.skip');

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
            <ArrowLeft size={15} /> {translatedBackLabel}
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
            {translatedSkipLabel}
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
              <LoaderCircle size={15} className="spin" /> {t('common.status.sending')}
            </>
          ) : submitMode ? (
            <>
              <Sparkles size={15} /> {continueLabel ?? t('common.actions.submitApplication')}
            </>
          ) : (
            <>
              {translatedContinueLabel} <ArrowRight size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
