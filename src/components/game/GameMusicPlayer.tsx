import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Music2, Pause, Play } from 'lucide-react';

const TRACK_NAME_FADE_DURATION_MS = 180;

interface GameMusicPlayerProps {
  readonly trackName: string;
  readonly isPlaying: boolean;
  readonly musicEnabled: boolean;
  readonly onToggle: () => void;
  readonly floating?: boolean;
  readonly dimmed?: boolean;
}

export function GameMusicPlayer({
  trackName,
  isPlaying,
  musicEnabled,
  onToggle,
  floating = false,
  dimmed = false,
}: GameMusicPlayerProps) {
  const [displayedTrackName, setDisplayedTrackName] = useState(trackName);
  const [trackNameWidth, setTrackNameWidth] = useState<number | null>(null);
  const [trackNamePhase, setTrackNamePhase] = useState<
    'visible' | 'exiting' | 'entering'
  >('visible');
  const displayedTrackNameRef = useRef(trackName);
  const trackNameMeasureRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const measuredTitle = trackNameMeasureRef.current;
    if (measuredTitle) {
      setTrackNameWidth(measuredTitle.getBoundingClientRect().width);
    }
  }, [displayedTrackName]);

  useEffect(() => {
    if (trackName === displayedTrackNameRef.current) {
      setTrackNamePhase('visible');
      return;
    }

    setTrackNamePhase('exiting');
    const fadeTimeout = window.setTimeout(() => {
      displayedTrackNameRef.current = trackName;
      setDisplayedTrackName(trackName);
      setTrackNamePhase('entering');
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : TRACK_NAME_FADE_DURATION_MS);

    return () => window.clearTimeout(fadeTimeout);
  }, [trackName]);

  return (
    <div
      className={[
        'game-music-player-controls',
        floating ? 'game-music-player-controls-floating' : '',
        dimmed ? 'game-music-player-controls-dimmed' : '',
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
        <span
          className={`game-music-player-title is-${trackNamePhase}`}
          style={trackNameWidth === null ? undefined : { width: `${trackNameWidth}px` }}
        >
          {displayedTrackName}
        </span>
        <span
          ref={trackNameMeasureRef}
          className="game-music-player-title game-music-player-title-measure"
          aria-hidden="true"
        >
          {displayedTrackName}
        </span>
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
