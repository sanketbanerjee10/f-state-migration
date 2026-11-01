import { useWizardNavigation } from '../../hooks/useWizardNavigation';
import { useTranslation } from 'react-i18next';
import { useApplicationDraft } from '../../hooks/useApplicationDraft';

export function StepProgress() {
  const { steps, stepNumber, totalSteps, currentIndex, goToStep } = useWizardNavigation();
  const { t } = useTranslation();
  const { navigationNotice, setNavigationNotice } = useApplicationDraft();

  const handlePillClick = (stepParam: string) => {
    const result = goToStep(stepParam);
    if (!result.success) {
      const errKeys = Object.keys(result.errors);
      const firstMsg = result.errors[errKeys[0]];
      setNavigationNotice(firstMsg || 'wizard.progress.completeRequired');
    } else {
      setNavigationNotice('');
    }
  };

  return (
    <div className="wizard-progress-card" aria-label={t('wizard.progress.label')}>
      {/* Progress bar */}
      <div
        className="wizard-progress-track"
        role="progressbar"
        aria-valuenow={stepNumber}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={t('wizard.progress.progress', { stepNumber, totalSteps })}
        data-testid="step-progress-label"
      >
        <div
          className="wizard-progress-bar"
          style={{ width: `${Math.round((stepNumber / totalSteps) * 100)}%` }}
        />
      </div>
      
      {/* Clickable step pills */}
      <div className="wizard-step-pills" role="tablist" aria-label={t('wizard.progress.stepsLabel')}>
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          return (
            <button
              key={step.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={t('wizard.progress.stepLabel', { index: index + 1, title: step.title })}
              className={`wizard-step-pill-btn${isActive ? ' is-active' : ''}${isCompleted ? ' is-completed' : ''}`}
              onClick={() => handlePillClick(step.stepParam)}
              data-testid={`step-pill-${index + 1}`}
            >
              <span className="wizard-step-pill-num">{index + 1}</span>
              <span className="wizard-step-pill-label">{step.title}</span>
            </button>
          );
        })}
      </div>

      {/* Blocked navigation message if required fields are missing */}
      {navigationNotice && (
        <div className="wizard-validation-pill-notice" role="alert" data-testid="wizard-pill-blocked-notice">
          ⚠️ {t(navigationNotice)}
        </div>
      )}
    </div>
  );
}
