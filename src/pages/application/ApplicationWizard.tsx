import { useEffect } from 'react';
import { ApplicationDraftProvider } from '../../hooks/useApplicationDraft';
import { useWizardNavigation } from '../../hooks/useWizardNavigation';
import { PowerDetailsStep } from './PowerDetailsStep';
import { CombatPowerStep } from './CombatPowerStep';
import { MigrationDetailsStep } from './MigrationDetailsStep';
import { GroupRosterStep } from './GroupRosterStep';
import { ApplicationReviewStep } from './ApplicationReviewStep';

function WizardContent() {
  const { currentStep, ensureCurrentStepAccessible } = useWizardNavigation();

  useEffect(() => {
    ensureCurrentStepAccessible();
  }, [ensureCurrentStepAccessible]);

  switch (currentStep.key) {
    case 'character':
      return <PowerDetailsStep />;
    case 'combat':
      return <CombatPowerStep />;
    case 'migration':
      return <MigrationDetailsStep />;
    case 'group-roster':
      return <GroupRosterStep />;
    case 'review':
      return <ApplicationReviewStep />;
    default:
      return <PowerDetailsStep />;
  }
}

export function ApplicationWizard() {
  return (
    <ApplicationDraftProvider>
      <WizardContent />
    </ApplicationDraftProvider>
  );
}
