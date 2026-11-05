import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import type { GameStateSnapshot } from '@/game/core/GameState';
import { isLeaderboardEligibleGameMode } from '@/game/core/GameState';
import { getLevelDefinition } from '@/game/core/LevelCampaign';
import { GameFranchiseWordmark } from './GameFranchiseWordmark';

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
  const isBossClear =
    !tutorialMode &&
    gameState?.gameMode === 'level' &&
    gameState.wave.phase === 'levelComplete' &&
    gameState.campaignLevelId !== null &&
    gameState.campaignLevelId % 10 === 0;
  const confettiFiredForBossClearRef = useRef(false);

  useEffect(() => {
    if (!isBossClear) {
      confettiFiredForBossClearRef.current = false;
      return;
    }

    if (confettiFiredForBossClearRef.current) return;
    confettiFiredForBossClearRef.current = true;

    const colors = ['#ffc987', '#f18bc9', '#d8c6ff', '#fff0d0'];
    confetti({
      particleCount: 70,
      angle: 60,
      spread: 58,
      startVelocity: 55,
      origin: { x: 0, y: 0.72 },
      colors,
      disableForReducedMotion: true,
    });
    confetti({
      particleCount: 70,
      angle: 120,
      spread: 58,
      startVelocity: 55,
      origin: { x: 1, y: 0.72 },
      colors,
      disableForReducedMotion: true,
    });
  }, [isBossClear]);

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
          className={`game-phase-panel game-phase-panel-compact${
            gameState.gameMode === 'level' && !tutorialMode
              ? ' afterhours-campaign-result'
              : !tutorialMode && gameState.gameMode !== 'level' && gameState.wave.phase === 'gameOver'
                ? ' afterhours-run-summary'
                : ''
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={
            gameState.wave.phase === 'levelComplete'
              ? 'level-complete-title'
              : !tutorialMode && gameState.gameMode !== 'level'
                ? 'afterhours-run-summary-brand'
                : 'game-over-title'
          }
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
                <div className="afterhours-campaign-result__ambient afterhours-campaign-result__ambient--clear" aria-hidden="true">
                  <span className="afterhours-campaign-result__orb afterhours-campaign-result__orb--one" />
                  <span className="afterhours-campaign-result__orb afterhours-campaign-result__orb--two" />
                  <span className="afterhours-campaign-result__stars" />
                </div>

                <div className="afterhours-campaign-result__content">
                  <header className="afterhours-campaign-result__header">
                    <p className="game-dialog-wordmark afterhours-campaign-result__brand">
                      <GameFranchiseWordmark />
                    </p>
                    <h1 id="level-complete-title" className="afterhours-campaign-result__title">
                      Stage {gameState.campaignLevelId ?? '—'} Completed
                    </h1>
                  </header>

                  <section className="afterhours-campaign-result__score" aria-label="Personal level score">
                    <div className="afterhours-campaign-result__score-topline">
                      <span aria-hidden="true">✦</span> LEVEL SCORE <span aria-hidden="true">✦</span>
                    </div>
                    <strong>{gameState.score.toLocaleString()}</strong>
                  </section>

                  {gameState.campaignLevelId !== null &&
                    gameState.campaignLevelId % 10 === 0 && (
                      <section className="afterhours-campaign-result__boss" role="status" aria-label="Boss defeated">
                        <span className="afterhours-campaign-result__boss-icon" aria-hidden="true">✧</span>
                        <div>
                          <strong>BOSS DEFEATED</strong>
                          <p>Another major threat has fallen.</p>
                        </div>
                        <span className="afterhours-campaign-result__boss-sparkle" aria-hidden="true">✦</span>
                      </section>
                    )}

                  <section className="afterhours-campaign-result__stats" aria-label="Stage statistics">
                    <dl className="afterhours-campaign-result__stat-grid">
                      <div className="afterhours-campaign-result__stat">
                        <dt>Enemies eliminated</dt>
                        <dd>{gameState.statistics.zombiesKilled.toLocaleString()}</dd>
                      </div>
                      <div className="afterhours-campaign-result__stat">
                        <dt>Completion time</dt>
                        <dd>{formatSeconds(gameState.statistics.survivalSeconds)}</dd>
                      </div>
                      <div className="afterhours-campaign-result__stat">
                        <dt>Damage dealt</dt>
                        <dd>{Math.round(gameState.statistics.totalDamageDealt).toLocaleString()}</dd>
                      </div>
                    </dl>
                  </section>

                  {gameState.campaignLevelId === 30 && (
                    <section className="afterhours-campaign-result__final" role="status">
                      <span aria-hidden="true">✦</span>
                      <div>
                        <strong>THE CAMPAIGN IS COMPLETE</strong>
                        <p>You've made it through all 30 stages. More levels may arrive in a future update.</p>
                      </div>
                      <span aria-hidden="true">✦</span>
                    </section>
                  )}

                  <footer className="afterhours-campaign-result__footer">
                    <p className="afterhours-campaign-result__footer-note">
                      <span aria-hidden="true">☾</span>
                      {gameState.campaignLevelId === 30 ? 'THANK YOU FOR SURVIVING THE NIGHT' : 'THE JOURNEY CONTINUES'}
                    </p>
                    <div className="game-menu-actions game-result-actions afterhours-campaign-result__actions afterhours-campaign-result__actions--clear">
                      <button className="game-pause-action game-pause-action-muted" type="button" onClick={onPlayAgain}>
                        <span className="game-pause-action-icon" aria-hidden="true">↻</span>
                        <span>Replay Level</span>
                      </button>
                      <button className="game-pause-action" type="button" onClick={onLevelSelection}>
                        <span className="game-pause-action-icon" aria-hidden="true">▤</span>
                        <span>Level Select</span>
                      </button>
                      {gameState.campaignLevelId !== null && gameState.campaignLevelId < 30 && (
                        <button className="game-pause-action afterhours-campaign-result__action-primary" type="button" onClick={onNextLevel}>
                          <span className="game-pause-action-icon" aria-hidden="true">→</span>
                          <span>Next</span>
                        </button>
                      )}
                    </div>
                  </footer>
                </div>
              </>
            ) : (
              <>
                <div className="afterhours-campaign-result__ambient" aria-hidden="true">
                  <span className="afterhours-campaign-result__orb afterhours-campaign-result__orb--one" />
                  <span className="afterhours-campaign-result__orb afterhours-campaign-result__orb--two" />
                  <span className="afterhours-campaign-result__stars" />
                </div>

                <div className="afterhours-campaign-result__content">
                  <header className="afterhours-campaign-result__header">
                    <p className="game-dialog-wordmark afterhours-campaign-result__brand">
                      <GameFranchiseWordmark />
                    </p>
                    <h1 id="game-over-title" className="afterhours-campaign-result__title">
                      Not this <span>time.</span>
                    </h1>
                  </header>

                  <section className="afterhours-campaign-result__stage" aria-label="Campaign stage">
                    <div className="afterhours-campaign-result__stage-symbol" aria-hidden="true">☾</div>
                    <div className="afterhours-campaign-result__stage-copy">
                      <span className="afterhours-campaign-result__stage-kicker">CURRENT STAGE</span>
                      <h2>Stage {gameState.campaignLevelId ?? '—'}</h2>
                      <p>{getLevelDefinition(gameState.campaignLevelId ?? 1)?.name ?? 'Campaign stage'}</p>
                    </div>
                    <span className="afterhours-campaign-result__stage-mark" aria-hidden="true">✳</span>
                  </section>

                  <section className="afterhours-campaign-result__reassurance" role="status">
                    <span className="afterhours-campaign-result__reassurance-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M12 3.5 19 6v5.4c0 4.2-2.8 7.3-7 9.1-4.2-1.8-7-4.9-7-9.1V6l7-2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div>
                      <strong>Your progress is safe.</strong>
                      <p>Your unlocked stages and previous records are still here. Nothing you've earned has been lost.</p>
                    </div>
                  </section>

                  <footer className="afterhours-campaign-result__footer">
                    <p className="afterhours-campaign-result__footer-note">
                      <span aria-hidden="true">☾</span> THE NEXT RUN IS YOURS TO WRITE
                    </p>
                    <div className="game-menu-actions game-result-actions afterhours-campaign-result__actions afterhours-campaign-result__actions--attempt">
                      <button className="game-pause-action afterhours-campaign-result__action-primary" type="button" onClick={onPlayAgain}>
                        <span className="game-pause-action-icon" aria-hidden="true">↻</span>
                        <span>Retry Level</span>
                      </button>
                      <button className="game-pause-action" type="button" onClick={onLevelSelection}>
                        <span className="game-pause-action-icon" aria-hidden="true">▤</span>
                        <span>Level Selection</span>
                      </button>
                      <button className="game-pause-action game-pause-action-muted" type="button" onClick={onReturnToMenu}>
                        <span className="game-pause-action-icon" aria-hidden="true">⌂</span>
                        <span>Main Menu</span>
                      </button>
                    </div>
                  </footer>
                </div>
              </>
            )
          ) : (
            <>
              <div className="afterhours-run-summary__ambient" aria-hidden="true">
                <span className="afterhours-run-summary__orb afterhours-run-summary__orb--one" />
                <span className="afterhours-run-summary__orb afterhours-run-summary__orb--two" />
                <span className="afterhours-run-summary__stars" />
              </div>

              <div className="afterhours-run-summary__content">
                <header className="afterhours-run-summary__header">
                  <p
                    id="afterhours-run-summary-brand"
                    className="game-dialog-wordmark afterhours-run-summary__brand"
                  >
                    <GameFranchiseWordmark />
                  </p>
                  <div className="game-pause-moon afterhours-run-summary__moon" aria-hidden="true">
                    <span className="game-pause-moon-halo" />
                    <span className="game-pause-moon-core">☾</span>
                    <span className="game-pause-moon-star game-pause-moon-star-one">✦</span>
                    <span className="game-pause-moon-star game-pause-moon-star-two">·</span>
                  </div>
                </header>

                <section className="afterhours-run-summary__score" aria-label="Final score">
                  <div className="afterhours-run-summary__score-topline">
                    <span className="afterhours-run-summary__score-icon" aria-hidden="true">✦</span>
                    <span>FINAL SCORE</span>
                    <span className="afterhours-run-summary__score-icon" aria-hidden="true">✦</span>
                  </div>
                  <strong>{gameState.score.toLocaleString()}</strong>
                </section>

                {!isLeaderboardEligibleGameMode(gameState.gameMode) && (
                  <p className="afterhours-run-summary__mode-note" role="status">
                    Campaign runs are kept separate from standard Survival records.
                  </p>
                )}

                <section
                  className="afterhours-run-summary__stats"
                >
                  <dl className="afterhours-run-summary__stat-grid">
                    <div className="afterhours-run-summary__stat">
                      <dt>Wave reached</dt>
                      <dd>{gameState.statistics.highestWaveReached}</dd>
                    </div>
                    <div className="afterhours-run-summary__stat">
                      <dt>Waves cleared</dt>
                      <dd>{gameState.statistics.highestWaveCleared}</dd>
                    </div>
                    <div className="afterhours-run-summary__stat">
                      <dt>Zombies eliminated</dt>
                      <dd>{gameState.statistics.zombiesKilled.toLocaleString()}</dd>
                    </div>
                    <div className="afterhours-run-summary__stat">
                      <dt>Time survived</dt>
                      <dd>{formatSeconds(gameState.statistics.survivalSeconds)}</dd>
                    </div>
                  </dl>
                </section>

                <footer className="afterhours-run-summary__footer">
                  <div className="game-menu-actions game-result-actions afterhours-run-summary__actions">
                    <button
                      className="game-menu-secondary afterhours-run-summary__menu"
                      type="button"
                      onClick={onReturnToMenu}
                    >
                      <span className="afterhours-run-summary__action-icon afterhours-run-summary__action-icon--muted" aria-hidden="true">⌂</span>
                      <span>Main menu</span>
                    </button>
                    <button
                      className="game-menu-primary afterhours-run-summary__play"
                      type="button"
                      onClick={onPlayAgain}
                    >
                      <span className="afterhours-run-summary__action-icon" aria-hidden="true">↻</span>
                      <span>Play again</span>
                    </button>
                  </div>
                </footer>
              </div>
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
