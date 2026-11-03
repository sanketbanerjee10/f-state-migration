import type { GameStateSnapshot } from '@/game/core/GameState';
import { GameLeaderboardPanel } from './GameLeaderboardPanel';
import { GameScoreSubmission } from './GameScoreSubmission';

interface GamePhaseOverlaysProps {
  readonly gameState: GameStateSnapshot | null;
  readonly onPlayAgain: () => void;
  readonly onReturnToMenu: () => void;
  readonly tutorialMode?: boolean;
}

function formatSeconds(seconds: number): string {
  const wholeSeconds = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

export function GamePhaseOverlays({
  gameState,
  onPlayAgain,
  onReturnToMenu,
  tutorialMode = false,
}: GamePhaseOverlaysProps) {
  if (!gameState) return null;

  return (
    <>
      {gameState.wave.phase === 'gameOver' && (
        <div className="game-modal-backdrop" aria-hidden="true" />
      )}
      {gameState.wave.phase === 'gameOver' && (
        <section
          className="game-phase-panel game-phase-panel-compact"
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-over-title"
        >
          {tutorialMode ? (
            <>
              <p className="game-panel-eyebrow">Practice session</p>
              <h1 id="game-over-title">Tutorial round over</h1>
              <p>This practice run is separate and will not be submitted to the leaderboard.</p>
              <div className="game-menu-actions game-result-actions">
                <button
                  className="game-menu-primary"
                  type="button"
                  onClick={onPlayAgain}
                >
                  Restart tutorial
                </button>
                <button
                  className="game-menu-secondary"
                  type="button"
                  onClick={onReturnToMenu}
                >
                  Exit tutorial
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="game-panel-eyebrow">Run summary</p>
              <h1 id="game-over-title">Run over</h1>
              <div className="game-result-score">
                <span>FINAL SCORE</span>
                <strong>{gameState.score.toLocaleString()}</strong>
              </div>
              <GameScoreSubmission gameState={gameState} />
              <dl className="game-run-summary">
                <div>
                  <dt>Wave reached</dt>
                  <dd>{gameState.statistics.highestWaveReached}</dd>
                </div>
                <div>
                  <dt>Waves cleared</dt>
                  <dd>{gameState.statistics.highestWaveCleared}</dd>
                </div>
                <div>
                  <dt>Zombies eliminated</dt>
                  <dd>{gameState.statistics.zombiesKilled}</dd>
                </div>
                <div>
                  <dt>Time survived</dt>
                  <dd>{formatSeconds(gameState.statistics.survivalSeconds)}</dd>
                </div>
                <div>
                  <dt>Damage dealt</dt>
                  <dd>{Math.round(gameState.statistics.totalDamageDealt)}</dd>
                </div>
                <div>
                  <dt>Damage received</dt>
                  <dd>{Math.round(gameState.statistics.totalDamageReceived)}</dd>
                </div>
                <div>
                  <dt>Peak damage</dt>
                  <dd>{gameState.statistics.highestDamage}</dd>
                </div>
                <div>
                  <dt>Peak fire rate</dt>
                  <dd>{gameState.statistics.highestShotsPerSecond.toFixed(1)}/s</dd>
                </div>
                <div>
                  <dt>Orbs collected</dt>
                  <dd>{gameState.statistics.orbsCollected}</dd>
                </div>
                <div>
                  <dt>Upgrades chosen</dt>
                  <dd>{gameState.statistics.upgradesSelected}</dd>
                </div>
              </dl>
              <div className="game-menu-actions game-result-actions">
                <button
                  className="game-menu-primary"
                  type="button"
                  onClick={onPlayAgain}
                >
                  Play again
                </button>
                <button
                  className="game-menu-secondary"
                  type="button"
                  onClick={onReturnToMenu}
                >
                  Main menu
                </button>
              </div>
              <GameLeaderboardPanel />
            </>
          )}
        </section>
      )}
      {gameState.wave.announcementSeconds > 0 && (
        <div className="game-wave-announcement" aria-live="polite">
          {gameState.wave.announcement}
        </div>
      )}
    </>
  );
}
