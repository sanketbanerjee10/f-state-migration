import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Bomb } from 'lucide-react';

interface GameTouchControlsProps {
  readonly active: boolean;
  readonly bombs: number;
  readonly highlightMovement?: boolean;
  readonly highlightAim?: boolean;
  readonly onUseBomb: () => void;
  readonly movementRef: RefObject<HTMLButtonElement | null>;
  readonly aimRef: RefObject<HTMLButtonElement | null>;
}

export function GameTouchControls({
  active,
  bombs,
  highlightMovement = false,
  highlightAim = false,
  onUseBomb,
  movementRef,
  aimRef,
}: GameTouchControlsProps) {
  const { t } = useTranslation();
  return (
    <div
      className={`game-mobile-controls ${active ? '' : 'game-mobile-controls-hidden'}`}
      role="group"
      aria-label={t('game.touch.controls')}
    >
      <div className="game-mobile-control">
        <button
          ref={movementRef}
          className={`game-joystick game-joystick-movement${highlightMovement ? ' game-joystick-highlighted' : ''}`}
          type="button"
          aria-label={t('game.touch.movement')}
        >
          <span className="game-joystick-knob" aria-hidden="true" />
        </button>
      </div>
      <div className="game-mobile-control game-mobile-control-aim">
        <button
          className="game-bomb-button"
          type="button"
          aria-label={t('game.touch.useBomb', { count: bombs })}
          disabled={bombs <= 0}
          onClick={onUseBomb}
        >
          <Bomb aria-hidden="true" />
        </button>
        <button
          ref={aimRef}
          className={`game-joystick game-joystick-aim${highlightAim ? ' game-joystick-highlighted' : ''}`}
          type="button"
          aria-label={t('game.touch.aim')}
        >
          <span className="game-joystick-knob" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
