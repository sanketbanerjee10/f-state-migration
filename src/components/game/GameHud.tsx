import type { GameStateSnapshot } from '@/game/core/GameState';
import type { HudDensitySetting } from '@/game/core/GameSettings';

interface GameHudProps {
  readonly gameState: GameStateSnapshot;
  readonly density: HudDensitySetting;
}

export function GameHud({ gameState, density }: GameHudProps) {
  const zombiesDefeatedThisWave = Math.max(
    0,
    gameState.wave.enemiesSpawned - gameState.zombies.length,
  );
  const waveProgressPercent = gameState.wave.enemyBudget > 0
    ? Math.min(
        100,
        (zombiesDefeatedThisWave / gameState.wave.enemyBudget) * 100,
      )
    : 0;
  const remainingWaveEnemies = Math.max(
    0,
    gameState.wave.enemyBudget - zombiesDefeatedThisWave,
  );
  const healthPercent = gameState.player.maxHealth > 0
    ? Math.max(
        0,
        Math.min(
          100,
          (gameState.player.health / gameState.player.maxHealth) * 100,
        ),
      )
    : 0;

  return (
    <section
      className={`game-hud game-hud-${density}`}
      aria-label="Run status"
    >
      <div className="game-hud-topline">
        <div className="game-hud-wave">
          <span className="game-hud-label">WAVE</span>
          <strong>{String(gameState.wave.currentWave).padStart(2, '0')}</strong>
        </div>
        <div
          className="game-hud-wave-progress"
          role="progressbar"
          aria-label="Wave progress"
          aria-valuemin={0}
          aria-valuemax={gameState.wave.enemyBudget}
          aria-valuenow={zombiesDefeatedThisWave}
        >
          <span style={{ width: `${waveProgressPercent}%` }} />
        </div>
      </div>
      <div className="game-hud-stats">
        <div className="game-hud-health">
          <span className="game-hud-label">VITALS</span>
          <strong>
            {Math.ceil(gameState.player.health)}
            <span> / {gameState.player.maxHealth}</span>
          </strong>
          <div
            className="game-hud-health-track"
            role="progressbar"
            aria-label="Player health"
            aria-valuemin={0}
            aria-valuemax={gameState.player.maxHealth}
            aria-valuenow={Math.ceil(gameState.player.health)}
          >
            <span style={{ width: `${healthPercent}%` }} />
          </div>
        </div>
        <div className="game-hud-stat">
          <span className="game-hud-label">ELIMINATED</span>
          <strong>{String(gameState.statistics.zombiesKilled).padStart(2, '0')}</strong>
        </div>
        <div className="game-hud-stat game-hud-score">
          <span className="game-hud-label">SCORE</span>
          <strong>{gameState.score.toLocaleString()}</strong>
        </div>
        <div className="game-hud-stat game-hud-hostiles">
          <span className="game-hud-label">HOSTILES</span>
          <strong>{remainingWaveEnemies}</strong>
        </div>
      </div>
      {gameState.activeEffects.length > 0 && (
        <ul className="game-hud-effects" aria-label="Active effects">
          {gameState.activeEffects.map((effect) => (
            <li key={effect.type}>
              <span>
                {effect.type === 'rapidFire'
                  ? 'RAPID FIRE'
                  : effect.type === 'damage'
                    ? 'DAMAGE BOOST'
                    : `SHIELD · ${Math.ceil(effect.remainingShield ?? 0)}`}
              </span>
              <strong>{Math.ceil(effect.remainingSeconds)}s</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
