import { Music2, Pause, Play } from 'lucide-react';

interface GameMusicPlayerProps {
  readonly trackName: string;
  readonly isPlaying: boolean;
  readonly musicEnabled: boolean;
  readonly onToggle: () => void;
  readonly floating?: boolean;
}

export function GameMusicPlayer({
  trackName,
  isPlaying,
  musicEnabled,
  onToggle,
  floating = false,
}: GameMusicPlayerProps) {
  return (
    <div
      className={[
        'game-music-player-controls',
        floating ? 'game-music-player-controls-floating' : '',
      ].filter(Boolean).join(' ')}
    >
      <button
        className="game-music-player"
        type="button"
        aria-label={`${isPlaying ? 'Pause' : 'Play'} music`}
        aria-pressed={isPlaying}
        disabled={!musicEnabled}
        onClick={onToggle}
      >
        <Music2 className="game-music-player-icon" aria-hidden="true" />
        <span className="game-music-player-title">{trackName}</span>
        <span
          className={`game-music-bars${isPlaying ? ' is-playing' : ''}`}
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
          <span />
        </span>
        {isPlaying
          ? <Pause className="game-music-player-toggle" aria-hidden="true" />
          : <Play className="game-music-player-toggle" aria-hidden="true" />}
      </button>
    </div>
  );
}
