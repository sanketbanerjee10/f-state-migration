import { useCallback, useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useApplicationDraft, type StepErrors } from './useApplicationDraft';

export interface WizardStepDefinition {
  key: string;
  stepParam: string;
  title: string;
  subtitle: string;
}

export const BASE_STEPS: WizardStepDefinition[] = [
  {
    key: 'character',
    stepParam: '1',
    title: 'Character Details',
    subtitle: 'Enter your stats or upload a screenshot to prefill',
  },
  {
    key: 'combat',
    stepParam: '2',
    title: 'Combat Power',
    subtitle: 'Enter your state, alliance, and arena formation powers',
  },
  {
    key: 'migration',
    stepParam: '3',
    title: 'Migration Details',
    subtitle: 'Preferences, destinations, tier, and migration reason',
  },
];

export const GROUP_ROSTER_STEP: WizardStepDefinition = {
  key: 'group-roster',
  stepParam: '4',
  title: 'Group Roster',
  subtitle: 'Bulk import profile screenshots for your group members',
};

export const REVIEW_STEP: WizardStepDefinition = {
  key: 'review',
  stepParam: 'review', // or '5' for group, '4' for individual
  title: 'Review & Submit',
  subtitle: 'Confirm all application data before submitting to leadership',
};

export function useWizardNavigation() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { draft, validateStep } = useApplicationDraft();

  const isGroup = draft.migrationType === 'Group';

  const steps = useMemo<WizardStepDefinition[]>(() => {
    if (isGroup) {
      return [
        BASE_STEPS[0],
        BASE_STEPS[1],
        BASE_STEPS[2],
        GROUP_ROSTER_STEP,
        { ...REVIEW_STEP, stepParam: '5' },
      ];
    }
    return [
      BASE_STEPS[0],
      BASE_STEPS[1],
      BASE_STEPS[2],
      { ...REVIEW_STEP, stepParam: '4' },
    ];
  }, [isGroup]);

  // Parse current ?step=... param
  const currentStepParam = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get('step') || '1';
  }, [searchString]);

  // Find step by stepParam or key or index
  const currentIndex = useMemo(() => {
    const idx = steps.findIndex((s) => s.stepParam === currentStepParam || s.key === currentStepParam);
    if (idx >= 0) return idx;
    // numeric fallback
    const num = parseInt(currentStepParam, 10);
    if (!isNaN(num) && num >= 1 && num <= steps.length) {
      return num - 1;
    }
    return 0;
  }, [steps, currentStepParam]);

  const currentStep = steps[currentIndex] || steps[0];
  const totalSteps = steps.length;
  const stepNumber = currentIndex + 1;
  const stepProgressLabel = `Step ${stepNumber} of ${totalSteps}`;
  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === totalSteps - 1;

  // Navigate without changing pathname, retaining path and using ?step=<param>
  const setStepParam = useCallback(
    (targetParam: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set('step', targetParam);
      setLocation(`${url.pathname}?${url.searchParams.toString()}`);

      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('[data-testid="wizard-step-shell"]');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    },
    [setLocation]
  );

  /**
   * Jump to step only if all preceding steps are valid.
   * If an earlier step is invalid, returns errors and blocks navigation.
   */
  const goToStep = useCallback(
    (targetStepParamOrKey: string): { success: boolean; errors: StepErrors } => {
      const targetIndex = steps.findIndex(
        (s) => s.stepParam === targetStepParamOrKey || s.key === targetStepParamOrKey
      );
      const safeTargetIndex = targetIndex >= 0 ? targetIndex : 0;

      // If jumping backwards, always allow
      if (safeTargetIndex <= currentIndex) {
        setStepParam(steps[safeTargetIndex].stepParam);
        return { success: true, errors: {} };
      }

      // If jumping forward, validate each intermediate step from currentIndex to safeTargetIndex - 1
      for (let i = currentIndex; i < safeTargetIndex; i++) {
        const stepToValidate = steps[i];
        const errors = validateStep(stepToValidate.key);
        if (Object.keys(errors).length > 0) {
          return { success: false, errors };
        }
      }

      setStepParam(steps[safeTargetIndex].stepParam);
      return { success: true, errors: {} };
    },
    [steps, currentIndex, validateStep, setStepParam]
  );

  const nextStep = useCallback((): { success: boolean; errors: StepErrors } => {
    const errors = validateStep(currentStep.key);
    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    if (currentIndex < totalSteps - 1) {
      const nextStepDef = steps[currentIndex + 1];
      setStepParam(nextStepDef.stepParam);
    }
    return { success: true, errors: {} };
  }, [currentIndex, totalSteps, steps, currentStep, validateStep, setStepParam]);

  const prevStep = useCallback(() => {
    if (currentIndex > 0) {
      const prevStepDef = steps[currentIndex - 1];
      setStepParam(prevStepDef.stepParam);
    }
  }, [currentIndex, steps, setStepParam]);

  return {
    steps,
    currentStep,
    currentIndex,
    stepNumber,
    totalSteps,
    stepProgressLabel,
    isFirstStep,
    isLastStep,
    isGroup,
    nextStep,
    prevStep,
    goToStep,
  };
}
