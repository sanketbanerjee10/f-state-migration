import type { RefObject } from 'react';

interface GameTouchControlsProps {
  readonly active: boolean;
  readonly highlightMovement?: boolean;
  readonly highlightAim?: boolean;
  readonly movementRef: RefObject<HTMLButtonElement | null>;
  readonly aimRef: RefObject<HTMLButtonElement | null>;
}

export function GameTouchControls({
  active,
  highlightMovement = false,
  highlightAim = false,
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
        <button
          ref={movementRef}
          className={`game-joystick game-joystick-movement${highlightMovement ? ' game-joystick-highlighted' : ''}`}
          type="button"
          aria-label="Movement joystick. Drag in a direction to move. WASD or arrow keys also work when focused."
        >
          <span className="game-joystick-knob" aria-hidden="true" />
        </button>
      </div>
      <div className="game-mobile-control">
        <button
          ref={aimRef}
          className={`game-joystick game-joystick-aim${highlightAim ? ' game-joystick-highlighted' : ''}`}
          type="button"
          aria-label="Aim joystick. Drag in a direction to aim. Releasing keeps the last aim direction."
        >
          <span className="game-joystick-knob" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
