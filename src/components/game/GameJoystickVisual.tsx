interface GameJoystickVisualProps {
  readonly baseOpacity?: number;
  readonly thumbOpacity?: number;
}

export function GameJoystickVisual({
  baseOpacity,
  thumbOpacity,
}: GameJoystickVisualProps) {
  return (
    <>
      <span
        className="game-joystick-glow"
        aria-hidden="true"
        style={
          baseOpacity === undefined
            ? undefined
            : { opacity: baseOpacity / 100 }
        }
      />
      <span
        className="game-joystick-base"
        aria-hidden="true"
        style={
          baseOpacity === undefined
            ? undefined
            : { opacity: baseOpacity / 100 }
        }
      />
      <span
        className="game-joystick-knob"
        aria-hidden="true"
        style={
          thumbOpacity === undefined
            ? undefined
            : { opacity: thumbOpacity / 100 }
        }
      />
    </>
  );
}
