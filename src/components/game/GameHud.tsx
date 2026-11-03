import type { GameStateSnapshot } from '@/game/core/GameState';
import {
  formatGameKeyCode,
  type HudDensitySetting,
} from '@/game/core/GameSettings';
import { GameActiveEffects } from './GameActiveEffects';
import { WAVE_MODIFIER_CONFIG } from '@/game/modifiers/WaveModifiers';

interface GameHudProps {
  readonly gameState: GameStateSnapshot;
  readonly density: HudDensitySetting;
  readonly bombKey: string;
  readonly turretKey: string;
  readonly turretPlacementArmed: boolean;
  readonly highlighted?: boolean;
}

export function GameHud({
  gameState,
  density,
  bombKey,
  turretKey,
  turretPlacementArmed,
  highlighted = false,
}: GameHudProps) {
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
  const healthPercent = gameState.player.maxHealth > 0
    ? Math.max(
        0,
        Math.min(
          100,
          (gameState.player.health / gameState.player.maxHealth) * 100,
        ),
      )
    : 0;
  const activeBoss = gameState.zombies.find((zombie) => zombie.isBoss);
  const bossIntroActive = Boolean(
    gameState.wave.bossType &&
    !gameState.wave.bossSpawned &&
    gameState.wave.bossIntroSeconds > 0,
  );
  const bossHealthPercent = activeBoss && activeBoss.maxHealth > 0
    ? Math.max(0, Math.min(100, activeBoss.health / activeBoss.maxHealth * 100))
    : 0;
  const activeModifier = gameState.wave.activeModifier
    ? WAVE_MODIFIER_CONFIG.definitions[gameState.wave.activeModifier]
    : undefined;

  return (
    <section
      className={`game-hud game-hud-${density}${highlighted ? ' game-hud-highlighted' : ''}`}
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
      {activeModifier && (
        <div
          className="game-hud-modifier"
          role="status"
          aria-label={`Wave modifier: ${activeModifier.name}`}
          title={activeModifier.description}
        >
          <span className="game-hud-label">WAVE MODIFIER</span>
          <strong>{activeModifier.name}</strong>
          <span>{activeModifier.description}</span>
        </div>
      )}
      {bossIntroActive && (
        <div className="game-boss-intro" role="status" aria-live="polite">
          <span className="game-hud-label">BOSS APPROACHING</span>
          <strong>{gameState.wave.bossName}</strong>
          <div
            className="game-boss-intro-track"
            role="progressbar"
            aria-label="Boss introduction"
            aria-valuemin={0}
            aria-valuemax={gameState.wave.bossIntroDurationSeconds}
            aria-valuenow={
              gameState.wave.bossIntroDurationSeconds -
              gameState.wave.bossIntroSeconds
            }
          >
            <span style={{
              width: `${gameState.wave.bossIntroDurationSeconds > 0
                ? (1 - gameState.wave.bossIntroSeconds /
                  gameState.wave.bossIntroDurationSeconds) * 100
                : 100}%`,
            }} />
          </div>
        </div>
      )}
      {activeBoss && (
        <div className="game-boss-health" role="group" aria-label="Boss status">
          <div className="game-boss-health-label">
            <strong>{gameState.wave.bossName ?? 'Boss'}</strong>
            <span>
              {activeBoss.bossShielded ? 'SHIELDED' : 'BOSS'}
              {' · '}
              {Math.ceil(activeBoss.health)} / {activeBoss.maxHealth}
            </span>
          </div>
          <div
            className="game-boss-health-track"
            role="progressbar"
            aria-label={`${gameState.wave.bossName ?? 'Boss'} health`}
            aria-valuemin={0}
            aria-valuemax={activeBoss.maxHealth}
            aria-valuenow={Math.ceil(activeBoss.health)}
          >
            <span style={{ width: `${bossHealthPercent}%` }} />
          </div>
        </div>
      )}
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
          <strong>{gameState.zombies.length}</strong>
        </div>
        <div className="game-hud-stat game-hud-bombs">
          <span className="game-hud-label">BOMBS ({formatGameKeyCode(bombKey)})</span>
          <strong>{gameState.bombs} / 5</strong>
        </div>
        <div className="game-hud-stat game-hud-turrets">
          <span className="game-hud-label">
            {turretPlacementArmed
              ? 'CLICK TO PLACE'
              : `TURRETS (${formatGameKeyCode(turretKey)})`}
          </span>
          <strong>{gameState.turrets} / 5</strong>
        </div>
      </div>
      <GameActiveEffects effects={gameState.activeEffects} />
    </section>
  );
}
