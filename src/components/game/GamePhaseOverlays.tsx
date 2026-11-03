import type { GameStateSnapshot } from '@/game/core/GameState';
import { isLeaderboardEligibleGameMode } from '@/game/core/GameState';
import { getLevelDefinition } from '@/game/core/LevelCampaign';
import { GameLeaderboardPanel } from './GameLeaderboardPanel';
import { GameScoreSubmission } from './GameScoreSubmission';

interface GamePhaseOverlaysProps {
  readonly gameState: GameStateSnapshot | null;
  readonly onPlayAgain: () => void;
  readonly onNextLevel: () => void;
  readonly onLevelSelection: () => void;
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
  onNextLevel,
  onLevelSelection,
  onReturnToMenu,
  tutorialMode = false,
}: GamePhaseOverlaysProps) {
  if (!gameState) return null;

  return (
    <>
      {(gameState.wave.phase === 'gameOver' ||
        gameState.wave.phase === 'levelComplete') && (
        <div className="game-modal-backdrop" aria-hidden="true" />
      )}
      {(gameState.wave.phase === 'gameOver' ||
        gameState.wave.phase === 'levelComplete') && (
        <section
          className="game-phase-panel game-phase-panel-compact"
          role="dialog"
          aria-modal="true"
          aria-labelledby={gameState.wave.phase === 'levelComplete'
            ? 'level-complete-title'
            : 'game-over-title'}
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
          ) : gameState.gameMode === 'level' ? (
            gameState.wave.phase === 'levelComplete' ? (
              <>
                <p className="game-panel-eyebrow">Campaign clear</p>
                <h1 id="level-complete-title">LEVEL COMPLETED</h1>
                <p>
                  Stage {gameState.campaignLevelId}: {getLevelDefinition(gameState.campaignLevelId ?? 1)?.name}
                </p>
                {gameState.campaignLevelId !== null &&
                  gameState.campaignLevelId % 10 === 0 && (
                    <p className="game-score-success" role="status">Boss defeated</p>
                  )}
                <div className="game-result-score">
                  <span>PERSONAL LEVEL SCORE</span>
                  <strong>{gameState.score.toLocaleString()}</strong>
                </div>
                <dl className="game-run-summary">
                  <div>
                    <dt>Enemies eliminated</dt>
                    <dd>{gameState.statistics.zombiesKilled}</dd>
                  </div>
                  <div>
                    <dt>Completion time</dt>
                    <dd>{formatSeconds(gameState.statistics.survivalSeconds)}</dd>
                  </div>
                  <div>
                    <dt>Damage dealt</dt>
                    <dd>{Math.round(gameState.statistics.totalDamageDealt)}</dd>
                  </div>
                  <div>
                    <dt>Upgrades chosen</dt>
                    <dd>{gameState.statistics.upgradesSelected}</dd>
                  </div>
                </dl>
                <p className="game-score-success" role="status">
                  Level Mode is a campaign experience. Scores here don’t count toward the Survival leaderboard.
                </p>
                <div className="game-menu-actions game-result-actions">
                  {gameState.campaignLevelId !== null && gameState.campaignLevelId < 30 && (
                    <button className="game-menu-primary" type="button" onClick={onNextLevel}>
                      Next Level
                    </button>
                  )}
                  {gameState.campaignLevelId === 30 && (
                    <p className="game-campaign-complete" role="status">
                      Campaign complete. More levels may arrive in a future update.
                    </p>
                  )}
                  <button className="game-menu-secondary" type="button" onClick={onPlayAgain}>
                    Replay Level
                  </button>
                  <button className="game-menu-secondary" type="button" onClick={onLevelSelection}>
                    Level Selection
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="game-panel-eyebrow">Campaign attempt</p>
                <h1 id="game-over-title">Level failed</h1>
                <p>Stage {gameState.campaignLevelId}: {getLevelDefinition(gameState.campaignLevelId ?? 1)?.name}</p>
                <p>Your unlocked stages and previous records are safe.</p>
                <div className="game-menu-actions game-result-actions">
                  <button className="game-menu-primary" type="button" onClick={onPlayAgain}>
                    Retry Level
                  </button>
                  <button className="game-menu-secondary" type="button" onClick={onLevelSelection}>
                    Level Selection
                  </button>
                  <button className="game-menu-secondary" type="button" onClick={onReturnToMenu}>
                    Main Menu
                  </button>
                </div>
              </>
            )
          ) : (
            <>
              <p className="game-panel-eyebrow">Run summary</p>
              <h1 id="game-over-title">Run over</h1>
              <div className="game-result-score">
                <span>FINAL SCORE</span>
                <strong>{gameState.score.toLocaleString()}</strong>
              </div>
              {!isLeaderboardEligibleGameMode(gameState.gameMode) ? (
                <p className="game-score-success" role="status">
                  Level Mode is a campaign experience. Scores here don’t count toward the Survival leaderboard.
                </p>
              ) : (
                <GameScoreSubmission gameState={gameState} />
              )}
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
              {isLeaderboardEligibleGameMode(gameState.gameMode) && <GameLeaderboardPanel />}
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
