import { useCallback, useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useApplicationDraft, type StepErrors } from './useApplicationDraft';

export interface WizardStepDefinition {
  key: string;
  stepParam: string;
  title: string;
  subtitle: string;
  titleKey: string;
  subtitleKey: string;
}

type WizardStepTemplate = Omit<WizardStepDefinition, 'title' | 'subtitle'>;

export const BASE_STEPS: WizardStepTemplate[] = [
  {
    key: 'character',
    stepParam: '1',
    titleKey: 'wizard.navigation.character',
    subtitleKey: 'wizard.navigation.characterDescription',
  },
  {
    key: 'combat',
    stepParam: '2',
    titleKey: 'wizard.navigation.combat',
    subtitleKey: 'wizard.navigation.combatDescription',
  },
  {
    key: 'migration',
    stepParam: '3',
    titleKey: 'wizard.navigation.migration',
    subtitleKey: 'wizard.navigation.migrationDescription',
  },
];

export const GROUP_ROSTER_STEP: WizardStepTemplate = {
  key: 'group-roster',
  stepParam: '4',
  titleKey: 'wizard.navigation.roster',
  subtitleKey: 'wizard.navigation.rosterDescription',
};

export const REVIEW_STEP: WizardStepTemplate = {
  key: 'review',
  stepParam: 'review', // or '5' for group, '4' for individual
  titleKey: 'wizard.navigation.review',
  subtitleKey: 'wizard.navigation.reviewDescription',
};

export function useWizardNavigation() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { draft, validateStep } = useApplicationDraft();
  const { t } = useTranslation();

  const isGroup = draft.migrationType === 'Group';

  const steps = useMemo<WizardStepDefinition[]>(() => {
    const translateStep = (step: WizardStepTemplate): WizardStepDefinition => ({
      ...step,
      title: t(step.titleKey),
      subtitle: t(step.subtitleKey),
    });
    if (isGroup) {
      return [
        ...BASE_STEPS.map(translateStep),
        translateStep(GROUP_ROSTER_STEP),
        translateStep({ ...REVIEW_STEP, stepParam: '5' }),
      ];
    }
    return [
      ...BASE_STEPS.map(translateStep),
      translateStep({ ...REVIEW_STEP, stepParam: '4' }),
    ];
  }, [isGroup, t]);

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
  const stepProgressLabel = t('wizard.navigation.stepOf', { stepNumber, totalSteps });
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
