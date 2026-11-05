import { Pause } from 'lucide-react';

export function GamePauseButton({ onPause }: { readonly onPause: () => void }) {
  return (
    <button
      className="game-pause-button"
      type="button"
      onClick={onPause}
      aria-label="Pause game. Press Escape or P."
      title="Pause (Esc)"
    >
      <Pause aria-hidden="true" />
      <span aria-hidden="true">Pause (Esc)</span>
    </button>
  );
}
