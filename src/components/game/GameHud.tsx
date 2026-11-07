import { useTranslation } from 'react-i18next';
import type { GameStateSnapshot } from '@/game/core/GameState';
import type { HudDensitySetting } from '@/game/core/GameSettings';
import { GameActiveEffects } from './GameActiveEffects';
import { WAVE_MODIFIER_CONFIG } from '@/game/core/GameConfig';

interface GameHudProps {
  readonly gameState: GameStateSnapshot;
  readonly density: HudDensitySetting;
  readonly highlighted?: boolean;
}

const pad2 = (value: number): string => String(value).padStart(2, '0');
const clampPercent = (value: number): number => Math.max(0, Math.min(100, value));

export function GameHud({
  gameState,
  density,
  highlighted = false,
}: GameHudProps) {
  const { t } = useTranslation();
  // ---- Derived values (unchanged game math) -------------------------------
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
  const bossIntroPercent = gameState.wave.bossIntroDurationSeconds > 0
    ? clampPercent(
        (1 - gameState.wave.bossIntroSeconds /
          gameState.wave.bossIntroDurationSeconds) * 100,
      )
    : 100;
  const activeModifier = gameState.wave.activeModifier
    ? {
        id: gameState.wave.activeModifier,
        ...WAVE_MODIFIER_CONFIG.definitions[gameState.wave.activeModifier],
      }
    : undefined;
  const bossName = gameState.wave.bossType
    ? t(`game.bosses.${gameState.wave.bossType}`)
    : t('game.hud.boss');

  // Presentation-only: drives bar colour + a text "LOW" flag (not colour alone).
  const healthLevel = healthPercent <= 25 ? 'low' : healthPercent <= 50 ? 'mid' : 'ok';

  return (
    <section
      className={`game-hud game-hud-${density}${highlighted ? ' game-hud-highlighted' : ''}`}
      aria-label={t('game.hud.runStatus')}
    >
      {/* Core status card: wave, health, score + secondary counters */}
      <div className="game-hud-main">
        <div className="game-hud-primary">
          <div className="game-hud-wave">
            <div className="game-hud-wave-heading">
              <span className="game-hud-label">{t('game.hud.wave')}</span>
              <strong>{pad2(gameState.wave.currentWave)}</strong>
            </div>
            <div
              className="game-hud-wave-progress"
              role="progressbar"
              aria-label={t('game.hud.waveProgress')}
              aria-valuemin={0}
              aria-valuemax={gameState.wave.enemyBudget}
              aria-valuenow={zombiesDefeatedThisWave}
            >
              <span style={{ width: `${waveProgressPercent}%` }} />
            </div>
          </div>

          <div className={`game-hud-health game-hud-health-${healthLevel}`}>
            <div className="game-hud-health-heading">
              <span className="game-hud-label">
                {t('game.hud.health')}
                {healthLevel === 'low' && (
                  <span className="game-hud-health-flag" aria-hidden="true">{t('game.hud.low')}</span>
                )}
              </span>
              <strong>
                {Math.ceil(gameState.player.health)}
                <span> / {gameState.player.maxHealth}</span>
              </strong>
            </div>
            <div
              className="game-hud-health-track"
              role="progressbar"
              aria-label={t('game.hud.playerHealth')}
              aria-valuemin={0}
              aria-valuemax={gameState.player.maxHealth}
              aria-valuenow={Math.ceil(gameState.player.health)}
            >
              <span style={{ width: `${healthPercent}%` }} />
            </div>
          </div>

          <div className="game-hud-stat game-hud-score">
            <span className="game-hud-label">{t('game.hud.score')}</span>
            <strong>{gameState.score.toLocaleString()}</strong>
          </div>
        </div>

        <div className="game-hud-stats">
          <div className="game-hud-stat game-hud-eliminated">
            <span className="game-hud-label">{t('game.hud.eliminated')}</span>
            <strong>{pad2(gameState.statistics.zombiesKilled)}</strong>
          </div>
          <div className="game-hud-stat game-hud-bombs">
            <span className="game-hud-label">{t('game.hud.bombs')}</span>
            <strong>{gameState.bombs}</strong>
          </div>
          <div className="game-hud-stat game-hud-turrets">
            <span className="game-hud-label">{t('game.hud.turrets')}</span>
            <strong>{gameState.turrets}</strong>
          </div>
        </div>
      </div>

      {(activeModifier || gameState.activeEffects.length > 0) && (
        <div className="game-hud-power-row">
          {activeModifier && (
            <div
              className="game-hud-modifier"
              role="status"
              aria-label={t('game.hud.customWavePower', {
                name: t(`game.modifiers.${activeModifier.id}.name`),
              })}
              title={t(`game.modifiers.${activeModifier.id}.description`)}
            >
              <span className="game-hud-label">{t('game.hud.power')}</span>
              <strong>{t(`game.modifiers.${activeModifier.id}.name`)}</strong>
            </div>
          )}
          <div className="game-hud-active-effects" aria-label={t('game.hud.activePlayerStats')}>
            <GameActiveEffects effects={gameState.activeEffects} />
          </div>
        </div>
      )}

      {/* Boss intro (can be active before the boss entity exists) */}
      {bossIntroActive && (
        <div className="game-boss-intro" role="status" aria-live="polite">
          <span className="game-hud-label">{t('game.hud.bossApproaching')}</span>
          <strong>{bossName}</strong>
          <div
            className="game-boss-intro-track"
            role="progressbar"
            aria-label={t('game.hud.bossIntroduction')}
            aria-valuemin={0}
            aria-valuemax={gameState.wave.bossIntroDurationSeconds}
            aria-valuenow={
              gameState.wave.bossIntroDurationSeconds -
              gameState.wave.bossIntroSeconds
            }
          >
            <span style={{ width: `${bossIntroPercent}%` }} />
          </div>
        </div>
      )}

      {/* Boss health (separate state, shown while a boss entity is alive) */}
      {activeBoss && (
        <div
          className={`game-boss-health${activeBoss.bossShielded ? ' game-boss-health-shielded' : ''}`}
          role="group"
          aria-label={t('game.hud.bossStatus')}
        >
          <div className="game-boss-health-label">
            <strong>{bossName}</strong>
            <span>
              {activeBoss.bossShielded && (
                <span className="game-boss-shield-icon" aria-hidden="true">◇ </span>
              )}
              {activeBoss.bossShielded ? t('game.hud.shielded') : t('game.hud.boss')}
              {' · '}
              {Math.ceil(activeBoss.health)} / {activeBoss.maxHealth}
            </span>
          </div>
          <div
            className="game-boss-health-track"
            role="progressbar"
            aria-label={t('game.hud.bossHealth', { name: bossName })}
            aria-valuemin={0}
            aria-valuemax={activeBoss.maxHealth}
            aria-valuenow={Math.ceil(activeBoss.health)}
          >
            <span style={{ width: `${bossHealthPercent}%` }} />
          </div>
        </div>
      )}
    </section>
  );
}
