import { useEffect } from 'react';

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
    title: 'Welcome to the arena',
    description:
      'Survive as many waves as you can. Keep your survivor alive, clear the arena, and use every opening to reposition.',
    action: null,
    highlight: 'arena',
    simulate: false,
  },
  {
    id: 'player',
    title: 'Your survivor',
    description:
      'The glowing character is you. Your health is shown in the Vitals bar, so avoid contact with zombies.',
    action: null,
    highlight: 'player',
    simulate: false,
  },
  {
    id: 'movement',
    title: 'Move around',
    description:
      'Use your configured movement keys, or drag the left joystick on touchscreens. You can rebind keys in Settings. Move a short distance to practise.',
    action: 'movement',
    highlight: 'movement',
    simulate: true,
  },
  {
    id: 'aim',
    title: 'Aim and fire',
    description:
      'Point the mouse or drag the right joystick to change aim. Your weapon fires automatically in that direction. Try aiming somewhere new.',
    action: 'aim',
    highlight: 'aim',
    simulate: true,
  },
  {
    id: 'hud',
    title: 'Read the HUD',
    description:
      'Wave, Vitals, Eliminated, Score, Hostiles, and your bomb and turret inventories track the run. Use the bomb key or touch bomb button to use a bomb. Right-click or double-tap an open spot to deploy a turret. Collected temporary effects appear beneath the HUD.',
    action: null,
    highlight: 'hud',
    simulate: false,
  },
  {
    id: 'enemies',
    title: 'Know your enemies',
    description:
      'Walkers are slower and tougher. Runners are smaller, faster, and have less health. Keep moving and aim away from danger.',
    action: null,
    highlight: 'arena',
    simulate: true,
  },
  {
    id: 'obstacles',
    title: 'Use the arena',
    description:
      'Crates and barricades block movement and can interrupt shots. Steer around them to create a clear path.',
    action: null,
    highlight: 'arena',
    simulate: false,
  },
  {
    id: 'powerups',
    title: 'Power-up orbs',
    description:
      'Health restores up to 25 health; damage doubles shot damage for 10s; rapid fire doubles shots for 8s; shield absorbs 60 damage for 12s. Collect up to five bombs, then press the bomb key or touch bomb button to deal 100 damage to nearby unobstructed zombies. Collect up to five turrets, then right-click or double-tap an open spot to place one for 12 seconds.',
    action: null,
    highlight: 'hud',
    simulate: false,
  },
  {
    id: 'collect-orb',
    title: 'Collect an orb',
    description:
      'Walk over an orb to collect it. Orbs drop after every two zombie eliminations; follow a glowing orb and collect one to see its effect. Bombs are stored until you press the bomb key or touch bomb button.',
    action: 'orb',
    highlight: 'orb',
    simulate: true,
  },
  {
    id: 'waves',
    title: 'Clear the wave',
    description:
      'Enemies arrive in waves. Defeat every zombie to clear a wave and earn its score bonus.',
    action: null,
    highlight: 'hud',
    simulate: false,
  },
  {
    id: 'stat-points',
    title: 'Spend stat points',
    description:
      'Each cleared wave earns one stat point. Open the pause menu to spend points on weapon damage, fire rate, maximum health, or movement speed. Use minus to refund an allocated point.',
    action: null,
    highlight: 'pause',
    simulate: false,
  },
  {
    id: 'pause',
    title: 'Pause and review',
    description:
      'The pause menu shows run statistics and active effects. Pause with Escape or the Pause button; resume, adjust settings, restart, or return to the menu.',
    action: null,
    highlight: 'pause',
    simulate: false,
  },
  {
    id: 'completion',
    title: 'You are ready',
    description:
      'Move with WASD or arrow keys, aim with the mouse, and collect orbs while surviving each wave. Return to the main menu to start a fresh normal run.',
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
      aria-label="Interactive game tutorial"
      aria-live="polite"
    >
      <div className="game-tutorial-heading">
        <p className="game-panel-eyebrow">
          Step {stepNumber} of {totalSteps}
        </p>
        <h2>{step.title}</h2>
      </div>
      <p className="game-tutorial-description">{step.description}</p>
      {step.action && (
        <p className={`game-tutorial-status ${actionComplete ? 'is-complete' : ''}`}>
          {actionComplete
            ? 'Exercise complete.'
            : step.action === 'orb'
              ? 'Collect an orb, or skip this exercise.'
              : step.action === 'movement'
                ? 'Move your survivor, or skip this exercise.'
                : 'Change your aim direction, or skip this exercise.'}
        </p>
      )}
      {confirmExit ? (
        <div className="game-tutorial-confirm" role="group" aria-label="Confirm tutorial exit">
          <p>Exit the tutorial? This practice run will be discarded.</p>
          <button className="game-tutorial-secondary" type="button" onClick={onExitCancel}>
            Keep playing
          </button>
          <button className="game-tutorial-danger" type="button" onClick={onExitConfirm}>
            Exit tutorial
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
              Previous
            </button>
          )}
          {step.id === 'completion' ? (
            <button
              className="game-tutorial-primary"
              type="button"
              onClick={onReturnToMenu}
            >
              Return to main menu
            </button>
          ) : step.action ? (
            actionComplete ? (
              <button
                className="game-tutorial-primary"
                type="button"
                onClick={onNext}
              >
                Continue
              </button>
            ) : (
              <button
                className="game-tutorial-primary"
                type="button"
                onClick={onSkip}
              >
                Skip exercise
              </button>
            )
          ) : (
            <button
              className="game-tutorial-primary"
              type="button"
              onClick={onNext}
            >
              Continue
            </button>
          )}
          {step.id !== 'completion' && (
            <button
              className="game-tutorial-exit"
              type="button"
              onClick={onExitRequest}
            >
              Exit tutorial
            </button>
          )}
        </div>
      )}
    </section>
  );
}
