import type {
  GameStateSnapshot,
  RunUpgradeAttribute,
} from '@/game/core/GameState';

interface GamePhaseOverlaysProps {
  readonly gameState: GameStateSnapshot | null;
  readonly onChooseUpgrade: (attribute: RunUpgradeAttribute) => void;
  readonly onStartNextWave: () => void;
  readonly onSkipCappedUpgrades: () => void;
  readonly onPlayAgain: () => void;
  readonly onReturnToMenu: () => void;
}

function formatSeconds(seconds: number): string {
  const wholeSeconds = Math.floor(seconds);
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

export function GamePhaseOverlays({
  gameState,
  onChooseUpgrade,
  onStartNextWave,
  onSkipCappedUpgrades,
  onPlayAgain,
  onReturnToMenu,
}: GamePhaseOverlaysProps) {
  if (!gameState) return null;

  return (
    <>
      {['upgrade', 'intermission', 'gameOver'].includes(gameState.wave.phase) && (
        <div className="game-modal-backdrop" aria-hidden="true" />
      )}
      {gameState.wave.phase === 'upgrade' && (
        <section
          className="game-phase-panel game-upgrade-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-upgrade-title"
        >
          <p className="game-panel-eyebrow">
            Wave {gameState.wave.currentWave} complete
          </p>
          <h1 id="game-upgrade-title">Choose one upgrade</h1>
          <p>Take a moment. Pick a boost for the next round.</p>
          <div className="game-upgrade-options">
            {gameState.availableUpgrades.map((offer) => (
              <button
                key={offer.attribute}
                className="game-phase-button game-upgrade-button"
                type="button"
                onClick={() => onChooseUpgrade(offer.attribute)}
              >
                <strong>{offer.label}</strong>
                <span>{offer.description}</span>
                <span>
                  {offer.currentValue.toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  })}
                  {' to '}
                  {offer.newValue.toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  })}{' '}
                  {offer.unit}
                </span>
              </button>
            ))}
          </div>
          {gameState.availableUpgrades.length === 0 && (
            <button
              className="game-phase-button"
              type="button"
              onClick={onSkipCappedUpgrades}
            >
              Continue without upgrade
            </button>
          )}
        </section>
      )}
      {gameState.wave.phase === 'intermission' && (
        <section
          className="game-phase-panel game-phase-panel-compact"
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-intermission-title"
        >
          <p className="game-panel-eyebrow">Next encounter</p>
          <h1 id="game-intermission-title">
            Wave {gameState.wave.currentWave + 1}
          </h1>
          <p>
            Next wave begins in{' '}
            {Math.ceil(gameState.wave.intermissionSeconds)} seconds.
          </p>
          <button
            className="game-phase-button"
            type="button"
            onClick={onStartNextWave}
          >
            Start next wave
          </button>
        </section>
      )}
      {gameState.wave.phase === 'gameOver' && (
        <section
          className="game-phase-panel game-phase-panel-compact"
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-over-title"
        >
          <p className="game-panel-eyebrow">Run summary</p>
          <h1 id="game-over-title">Run over</h1>
          <div className="game-result-score">
            <span>FINAL SCORE</span>
            <strong>{gameState.score.toLocaleString()}</strong>
          </div>
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
