import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export type GameTutorialAction = 'movement' | 'aim' | 'orb';
export type GameTutorialHighlight =
  | 'player'
  | 'movement'
  | 'aim'
  | 'hud'
  | 'arena'
  | 'orb'
  | 'pause'
  | null;

export interface GameTutorialStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly action: GameTutorialAction | null;
  readonly highlight: GameTutorialHighlight;
  readonly simulate: boolean;
}

export const GAME_TUTORIAL_STEPS: readonly GameTutorialStep[] = [
  {
    id: 'intro',
    title: 'game.tutorial.steps.intro.title',
    description: 'game.tutorial.steps.intro.description',
    action: null,
    highlight: 'arena',
    simulate: false,
  },
  {
    id: 'player',
    title: 'game.tutorial.steps.player.title',
    description: 'game.tutorial.steps.player.description',
    action: null,
    highlight: 'player',
    simulate: false,
  },
  {
    id: 'movement',
    title: 'game.tutorial.steps.movement.title',
    description: 'game.tutorial.steps.movement.description',
    action: 'movement',
    highlight: 'movement',
    simulate: true,
  },
  {
    id: 'aim',
    title: 'game.tutorial.steps.aim.title',
    description: 'game.tutorial.steps.aim.description',
    action: 'aim',
    highlight: 'aim',
    simulate: true,
  },
  {
    id: 'hud',
    title: 'game.tutorial.steps.hud.title',
    description: 'game.tutorial.steps.hud.description',
    action: null,
    highlight: 'hud',
    simulate: false,
  },
  {
    id: 'enemies',
    title: 'game.tutorial.steps.enemies.title',
    description: 'game.tutorial.steps.enemies.description',
    action: null,
    highlight: 'arena',
    simulate: true,
  },
  {
    id: 'obstacles',
    title: 'game.tutorial.steps.obstacles.title',
    description: 'game.tutorial.steps.obstacles.description',
    action: null,
    highlight: 'arena',
    simulate: false,
  },
  {
    id: 'powerups',
    title: 'game.tutorial.steps.powerups.title',
    description: 'game.tutorial.steps.powerups.description',
    action: null,
    highlight: 'hud',
    simulate: false,
  },
  {
    id: 'collect-orb',
    title: 'game.tutorial.steps.collectOrb.title',
    description: 'game.tutorial.steps.collectOrb.description',
    action: 'orb',
    highlight: 'orb',
    simulate: true,
  },
  {
    id: 'waves',
    title: 'game.tutorial.steps.waves.title',
    description: 'game.tutorial.steps.waves.description',
    action: null,
    highlight: 'hud',
    simulate: false,
  },
  {
    id: 'stat-points',
    title: 'game.tutorial.steps.statPoints.title',
    description: 'game.tutorial.steps.statPoints.description',
    action: null,
    highlight: 'pause',
    simulate: false,
  },
  {
    id: 'pause',
    title: 'game.tutorial.steps.pause.title',
    description: 'game.tutorial.steps.pause.description',
    action: null,
    highlight: 'pause',
    simulate: false,
  },
  {
    id: 'completion',
    title: 'game.tutorial.steps.completion.title',
    description: 'game.tutorial.steps.completion.description',
    action: null,
    highlight: null,
    simulate: false,
  },
];

interface GameTutorialOverlayProps {
  readonly step: GameTutorialStep;
  readonly stepNumber: number;
  readonly totalSteps: number;
  readonly actionComplete: boolean;
  readonly confirmExit: boolean;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
  readonly onSkip: () => void;
  readonly onExitRequest: () => void;
  readonly onExitCancel: () => void;
  readonly onExitConfirm: () => void;
  readonly onReturnToMenu: () => void;
}

export function GameTutorialOverlay({
  step,
  stepNumber,
  totalSteps,
  actionComplete,
  confirmExit,
  onNext,
  onPrevious,
  onSkip,
  onExitRequest,
  onExitCancel,
  onExitConfirm,
  onReturnToMenu,
}: GameTutorialOverlayProps) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!confirmExit) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onExitCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmExit, onExitCancel]);

  return (
    <section
      className="game-tutorial"
      aria-label={t('game.tutorial.ariaLabel')}
      aria-live="polite"
    >
      <div className="game-tutorial-heading">
        <p className="game-panel-eyebrow">
          {t('game.tutorial.step', { current: stepNumber, total: totalSteps })}
        </p>
        <h2>{t(step.title)}</h2>
      </div>
      <p className="game-tutorial-description">{t(step.description)}</p>
      {step.action && (
        <p className={`game-tutorial-status ${actionComplete ? 'is-complete' : ''}`}>
          {actionComplete
            ? t('game.tutorial.exerciseComplete')
            : step.action === 'orb'
              ? t('game.tutorial.collectOrbOrSkip')
              : step.action === 'movement'
                ? t('game.tutorial.moveOrSkip')
                : t('game.tutorial.aimOrSkip')}
        </p>
      )}
      {confirmExit ? (
        <div className="game-tutorial-confirm" role="group" aria-label={t('game.tutorial.confirmExit')}>
          <p>{t('game.tutorial.exitPrompt')}</p>
          <button className="game-tutorial-secondary" type="button" onClick={onExitCancel}>
            {t('game.tutorial.keepPlaying')}
          </button>
          <button className="game-tutorial-danger" type="button" onClick={onExitConfirm}>
            {t('game.tutorial.exit')}
          </button>
        </div>
      ) : (
        <div className="game-tutorial-actions">
          {stepNumber > 1 && (
            <button
              className="game-tutorial-secondary"
              type="button"
              onClick={onPrevious}
            >
              {t('game.tutorial.previous')}
            </button>
          )}
          {step.id === 'completion' ? (
            <button
              className="game-tutorial-primary"
              type="button"
              onClick={onReturnToMenu}
            >
              {t('game.tutorial.returnToMenu')}
            </button>
          ) : step.action ? (
            actionComplete ? (
              <button
                className="game-tutorial-primary"
                type="button"
                onClick={onNext}
              >
                {t('game.tutorial.continue')}
              </button>
            ) : (
              <button
                className="game-tutorial-primary"
                type="button"
                onClick={onSkip}
              >
                {t('game.tutorial.skipExercise')}
              </button>
            )
          ) : (
            <button
              className="game-tutorial-primary"
              type="button"
              onClick={onNext}
            >
              {t('game.tutorial.continue')}
            </button>
          )}
          {step.id !== 'completion' && (
            <button
              className="game-tutorial-exit"
              type="button"
              onClick={onExitRequest}
            >
              {t('game.tutorial.exit')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
