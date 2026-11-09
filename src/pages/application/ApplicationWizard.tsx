import { lazy, Suspense, useEffect } from 'react';
import { Spinner } from '../../components/ui/spinner';
import { ApplicationDraftProvider } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';

const PowerDetailsStep = lazy(() =>
  import('./PowerDetailsStep').then((module) => ({ default: module.PowerDetailsStep })),
);
const CombatPowerStep = lazy(() =>
  import('./CombatPowerStep').then((module) => ({ default: module.CombatPowerStep })),
);
const MigrationDetailsStep = lazy(() =>
  import('./MigrationDetailsStep').then((module) => ({ default: module.MigrationDetailsStep })),
);
const GroupRosterStep = lazy(() =>
  import('./GroupRosterStep').then((module) => ({ default: module.GroupRosterStep })),
);
const ApplicationReviewStep = lazy(() =>
  import('./ApplicationReviewStep').then((module) => ({ default: module.ApplicationReviewStep })),
);

function WizardContent() {
  const { currentStep, ensureCurrentStepAccessible } = useWizardNavigation();

  useEffect(() => {
    ensureCurrentStepAccessible();
  }, [ensureCurrentStepAccessible]);

  switch (currentStep.key) {
    case 'character':
      return <WizardStepFallback><PowerDetailsStep /></WizardStepFallback>;
    case 'combat':
      return <WizardStepFallback><CombatPowerStep /></WizardStepFallback>;
    case 'migration':
      return <WizardStepFallback><MigrationDetailsStep /></WizardStepFallback>;
    case 'group-roster':
      return <WizardStepFallback><GroupRosterStep /></WizardStepFallback>;
    case 'review':
      return <WizardStepFallback><ApplicationReviewStep /></WizardStepFallback>;
    default:
      return <WizardStepFallback><PowerDetailsStep /></WizardStepFallback>;
  }
}

function WizardStepFallback({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner className="size-8" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export function ApplicationWizard() {
  return (
    <ApplicationDraftProvider>
      <WizardContent />
    </ApplicationDraftProvider>
  );
}
