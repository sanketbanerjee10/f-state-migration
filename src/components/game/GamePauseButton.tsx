export function GamePauseButton({ onPause }: { readonly onPause: () => void }) {
  return (
    <button
      className="game-pause-button"
      type="button"
      onClick={onPause}
      aria-label="Pause game"
    >
      Pause
    </button>
  );
}
