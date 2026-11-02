import type { RefObject } from 'react';

interface GameTouchControlsProps {
  readonly active: boolean;
  readonly movementRef: RefObject<HTMLButtonElement | null>;
  readonly aimRef: RefObject<HTMLButtonElement | null>;
}

export function GameTouchControls({
  active,
  movementRef,
  aimRef,
}: GameTouchControlsProps) {
  return (
    <div
      className={`game-mobile-controls ${active ? '' : 'game-mobile-controls-hidden'}`}
      role="group"
      aria-label="Touch controls"
    >
      <div className="game-mobile-control">
        <span className="game-mobile-control-label" aria-hidden="true">
          MOVE
        </span>
        <button
          ref={movementRef}
          className="game-joystick game-joystick-movement"
          type="button"
          aria-label="Movement joystick. Drag in a direction to move. WASD or arrow keys also work when focused."
        >
          <span className="game-joystick-knob" aria-hidden="true" />
        </button>
      </div>
      <div className="game-mobile-control">
        <span className="game-mobile-control-label" aria-hidden="true">
          AIM
        </span>
        <button
          ref={aimRef}
          className="game-joystick game-joystick-aim"
          type="button"
          aria-label="Aim joystick. Drag in a direction to aim. Releasing keeps the last aim direction."
        >
          <span className="game-joystick-knob" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
