import { useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, Sparkles } from 'lucide-react';
import type {
  GameStateSnapshot,
  RunStatAttribute,
} from '@/game/core/GameState';
import { PLAYER_PROJECTILE_RANGE } from '@/game/core/GameConfig';
import {
  getRareUpgradeCost,
  isRareUpgradeUnlocked,
  RARE_UPGRADE_DEFINITIONS,
  RARE_UPGRADE_ORDER,
  type RareUpgradeId,
} from '@/game/upgrades';
import type { GameMenuView } from './GameMenuTypes';

interface GamePauseMenuProps {
  readonly active: boolean;
  readonly gameState: GameStateSnapshot | null;
  readonly onViewChange: (view: GameMenuView) => void;
  readonly onResume: () => void;
  readonly onAdjustStat: (
    attribute: RunStatAttribute,
    adjustment: -1 | 1,
  ) => void;
  readonly onAdjustRareUpgrade: (
    upgradeId: RareUpgradeId,
    adjustment: -1 | 1,
  ) => void;
  readonly onRestart: () => void;
  readonly onReturnToMenu: () => void;
  readonly tutorialMode: boolean;
}

type PauseTab = 'stats' | 'rare';

const formatNumber = (value: number) =>
  value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export function GamePauseMenu({
  active,
  gameState,
  onViewChange,
  onResume,
  onAdjustStat,
  onAdjustRareUpgrade,
  onRestart,
  onReturnToMenu,
  tutorialMode,
}: GamePauseMenuProps) {
  const { t } = useTranslation();
  const [pauseTab, setPauseTab] = useState<PauseTab>('stats');
  const devMode = gameState?.gameMode === 'dev';

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: PauseTab,
  ) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;

    event.preventDefault();
    const nextTab = currentTab === 'stats' ? 'rare' : 'stats';
    setPauseTab(nextTab);
    document.getElementById(`game-pause-${nextTab}-tab`)?.focus();
  };

  if (!active) return null;

  const healthPercent = gameState
    ? Math.max(
        0,
        Math.min(
          100,
          (gameState.player.health / gameState.player.maxHealth) * 100,
        ),
      )
    : 0;

  return (
    <div className={`game-pause-ui${pauseTab === 'stats' ? ' game-pause-ui-stats' : ''}`}>
      <header className="game-pause-header">
        <div className="game-pause-heading-copy">
          <h1 id="game-paused-title">{t('game.pause.title')}<span>.</span></h1>
        </div>
        <div className="game-pause-moon" aria-hidden="true">
          <span className="game-pause-moon-halo" />
          <span className="game-pause-moon-core">☾</span>
          <span className="game-pause-moon-star game-pause-moon-star-one">✦</span>
          <span className="game-pause-moon-star game-pause-moon-star-two">·</span>
        </div>
      </header>

      {gameState && (
        <div className="game-pause-layout">
          <aside className="game-pause-sidebar">
            <section className="game-pause-quick-actions" aria-label={t('game.pause.actions')}>
              <div className="game-pause-section-kicker">
                <span className="game-pause-kicker-mark" />
                {t('game.pause.quickAccess')}
              </div>
              <button
                className="game-pause-resume"
                type="button"
                onClick={onResume}
                autoFocus
              >
                <span className="game-pause-resume-symbol" aria-hidden="true">▶</span>
                <span className="game-pause-resume-copy">
                  <strong>{t('game.pause.resumeRun')}</strong>
                  <small>{t('game.pause.jumpBack')}</small>
                </span>
                <span className="game-pause-resume-key" aria-hidden="true">↵</span>
              </button>

              <div className="game-pause-action-grid">
                <button
                  className="game-pause-action"
                  type="button"
                  onClick={() => onViewChange('settings')}
                >
                  <span className="game-pause-action-icon" aria-hidden="true">⚙</span>
                  <span>{t('game.pause.settings')}</span>
                </button>
                <button
                  className="game-pause-action"
                  type="button"
                  onClick={() => onViewChange('enemy-guide')}
                >
                  <span className="game-pause-action-icon" aria-hidden="true">▤</span>
                  <span>{t('game.pause.fieldGuide')}</span>
                </button>
                {!tutorialMode && (
                  <button
                    className="game-pause-action game-pause-action-muted"
                    type="button"
                    onClick={onRestart}
                  >
                    <span className="game-pause-action-icon" aria-hidden="true">↻</span>
                    <span>{t('game.pause.restartRun')}</span>
                  </button>
                )}
                <button
                  className="game-pause-action game-pause-action-muted"
                  type="button"
                  onClick={onReturnToMenu}
                >
                  <span className="game-pause-action-icon" aria-hidden="true">⌂</span>
                  <span>{t(tutorialMode ? 'game.pause.exitTutorial' : 'game.pause.mainMenu')}</span>
                </button>
              </div>
            </section>

            <section
              className="game-pause-run"
              aria-label={t('game.pause.runStats')}
            >
              <div className="game-pause-section-kicker">
                <span className="game-pause-kicker-mark" />
                {t('game.pause.currentRun')}
              </div>

              <div className="game-pause-hero-stats">
                <div className="game-pause-wave-block">
                  <span className="game-pause-stat-label">{t('game.hud.wave')}</span>
                  <strong>{String(gameState.wave.currentWave).padStart(2, '0')}</strong>
                  <span className="game-pause-stat-foot">{t('game.pause.nightContinues')}</span>
                </div>
                <div className="game-pause-score-block">
                  <span className="game-pause-stat-label">{t('game.pause.totalScore')}</span>
                  <strong>{gameState.score.toLocaleString()}</strong>
                  <span className="game-pause-stat-foot">{t('game.pause.pointsEarned')}</span>
                </div>
              </div>

              <div className="game-pause-vitals">
                <div className="game-pause-vitals-heading">
                  <span className="game-pause-stat-label">{t('game.pause.playerVitals')}</span>
                  <strong>
                    {Math.ceil(gameState.player.health)}{' '}
                    <span>/ {gameState.player.maxHealth}</span>
                  </strong>
                </div>
                <div
                  className="game-pause-health-track"
                  role="progressbar"
                  aria-label={t('game.hud.playerHealth')}
                  aria-valuemin={0}
                  aria-valuemax={gameState.player.maxHealth}
                  aria-valuenow={Math.max(
                    0,
                    Math.min(gameState.player.maxHealth, Math.ceil(gameState.player.health)),
                  )}
                >
                  <span style={{ width: `${healthPercent}%` }} />
                </div>
                <span className="game-pause-vitals-caption">
                  {healthPercent <= 25
                    ? t('game.pause.criticalCondition')
                    : healthPercent <= 55
                      ? t('game.pause.battered')
                      : t('game.pause.lookingGood')}
                </span>
              </div>

              <div className="game-pause-mini-stats">
                <div className="game-pause-mini-stat">
                  <span className="game-pause-mini-icon" aria-hidden="true">✕</span>
                  <span className="game-pause-mini-copy">
                    <small>{t('game.hud.eliminated')}</small>
                    <strong>{gameState.statistics.zombiesKilled.toLocaleString()}</strong>
                  </span>
                </div>
                <div className="game-pause-mini-stat">
                  <span className="game-pause-mini-icon game-pause-mini-icon-blue" aria-hidden="true">◷</span>
                  <span className="game-pause-mini-copy">
                    <small>{t('game.pause.survivalTime')}</small>
                    <strong>
                      {Math.floor(gameState.statistics.survivalSeconds / 60)}:
                      {String(Math.floor(gameState.statistics.survivalSeconds % 60)).padStart(2, '0')}
                    </strong>
                  </span>
                </div>
              </div>

            </section>
          </aside>

          <main className="game-pause-workspace">
            <section className="game-pause-upgrade-station">
              <div className="game-pause-workspace-heading">
                <div className="game-pause-section-kicker">
                  <span className="game-pause-kicker-mark" />
                  {t('game.pause.survivorDevelopment')}
                </div>
              </div>

              <div
                className={`game-pause-tabs${pauseTab === 'rare' ? ' game-pause-tabs-rare-selected' : ''}`}
                role="tablist"
                aria-label={t('game.pause.pauseDetails')}
              >
                <button
                  id="game-pause-stats-tab"
                  className="game-pause-tab"
                  type="button"
                  role="tab"
                  aria-selected={pauseTab === 'stats'}
                  aria-controls="game-pause-stats-panel"
                  tabIndex={pauseTab === 'stats' ? 0 : -1}
                  onClick={() => setPauseTab('stats')}
                  onKeyDown={(event) => handleTabKeyDown(event, 'stats')}
                >
                  <span className="game-pause-tab-symbol" aria-hidden="true">
                    <SlidersHorizontal />
                  </span>
                  <span className="game-pause-tab-copy">
                    <strong>{t('game.pause.coreAttributes')}</strong>
                    <small>{t('game.pause.fineTuneBuild')}</small>
                  </span>
                  <span
                    className="game-pause-tab-points"
                    aria-label={devMode
                      ? t('game.pause.unlimitedStatsDev')
                      : t('game.pause.unusedStatPoints', { count: gameState.progression.standard.available })}
                  >
                    {devMode ? '∞' : gameState.progression.standard.available}
                  </span>
                </button>
                <button
                  id="game-pause-rare-tab"
                  className="game-pause-tab"
                  type="button"
                  role="tab"
                  aria-selected={pauseTab === 'rare'}
                  aria-controls="game-pause-rare-panel"
                  tabIndex={pauseTab === 'rare' ? 0 : -1}
                  onClick={() => setPauseTab('rare')}
                  onKeyDown={(event) => handleTabKeyDown(event, 'rare')}
                >
                  <span className="game-pause-tab-symbol game-pause-tab-symbol-rare" aria-hidden="true">
                    <Sparkles />
                  </span>
                  <span className="game-pause-tab-copy">
                    <strong>{t('game.pause.rareAbilities')}</strong>
                    <small>{t('game.pause.rarePerks')}</small>
                  </span>
                  <span
                    className="game-pause-tab-points game-pause-tab-points-rare"
                    aria-label={devMode
                      ? t('game.pause.unlimitedRareDev')
                      : t('game.pause.unusedRarePoints', { count: gameState.progression.rare.available })}
                  >
                    {devMode ? '∞' : gameState.progression.rare.available}
                  </span>
                </button>
              </div>

              <div
                id={`game-pause-${pauseTab}-panel`}
                className={`game-pause-tab-panel${pauseTab === 'stats' ? ' game-pause-stats-panel' : ''}`}
                key={pauseTab}
                role="tabpanel"
                aria-labelledby={`game-pause-${pauseTab}-tab`}
                tabIndex={0}
              >
                {pauseTab === 'stats' ? (
                  <section className="game-pause-upgrades" aria-label={t('game.pause.spendStatPoints')}>
                    <div className="game-pause-upgrade-list">
                      <article className="game-pause-upgrade-row game-pause-stat-upgrade-row">
                        <div className="game-pause-upgrade-info">
                          <div className="game-pause-upgrade-title-line">
                            <strong>{t('game.pause.firingRange')}</strong>
                            <span className="game-pause-current-value">
                              {formatNumber(PLAYER_PROJECTILE_RANGE)} <small>{t('game.pause.rangeUnit')}</small>
                            </span>
                          </div>
                          <span className="game-pause-upgrade-description">
                            {t('game.pause.firingRangeDescription')}
                          </span>
                        </div>
                      </article>
                      {gameState.statOptions.map((option) => {
                        const allocated = gameState.statAllocations[option.attribute];
                        const currentValue = formatNumber(option.currentValue);

                        return (
                          <article
                            className="game-pause-upgrade-row game-pause-stat-upgrade-row"
                            key={option.attribute}
                          >
                            <div className="game-pause-upgrade-info">
                              <div className="game-pause-upgrade-title-line">
                                <strong>{t(`game.upgrades.attributes.${option.attribute}.name`)}</strong>
                                <span className="game-pause-current-value">
                                  {currentValue} <small>{t(`game.upgrades.attributes.${option.attribute}.unit`)}</small>
                                </span>
                              </div>
                              {allocated > 0 && (
                                <span className="game-pause-allocation">
                                  {t('game.pause.allocated', { count: allocated })}
                                </span>
                              )}
                              <span className="game-pause-upgrade-description">
                                {t(`game.upgrades.attributes.${option.attribute}.description`)}
                              </span>
                              <span className="game-pause-upgrade-next">
                                <span aria-hidden="true">↗</span> {t('game.pause.next', {
                                  effect: t(`game.upgrades.attributes.${option.attribute}.effect`),
                                })}
                                {devMode
                                  ? ` · ${t('game.pause.freeDev')}`
                                  : ` · ${t('game.pause.statPointsCost', { count: option.cost })}`}
                              </span>
                            </div>
                            <div className="game-pause-upgrade-controls">
                              <button
                                className="game-pause-upgrade-control"
                                type="button"
                                aria-label={t('game.pause.decrease', {
                                  name: t(`game.upgrades.attributes.${option.attribute}.name`),
                                })}
                                disabled={allocated === 0}
                                onClick={() => onAdjustStat(option.attribute, -1)}
                              >
                                −
                              </button>
                              <button
                                className="game-pause-upgrade-control game-pause-upgrade-increase"
                                type="button"
                                aria-label={t('game.pause.increase', {
                                  name: t(`game.upgrades.attributes.${option.attribute}.name`),
                                })}
                                disabled={!option.canIncrease || (!devMode && gameState.upgradePoints < option.cost)}
                                onClick={() => onAdjustStat(option.attribute, 1)}
                              >
                                +
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ) : (
                  <section className="game-pause-upgrades game-pause-rare-upgrades" aria-label={t('game.pause.rareUpgrades')}>
                    <div className="game-pause-upgrade-list">
                      {RARE_UPGRADE_ORDER.map((upgradeId: RareUpgradeId) => {
                        const definition = RARE_UPGRADE_DEFINITIONS[upgradeId];
                        const upgradeName = t(`game.upgrades.rare.${upgradeId}.name`);
                        const level = gameState.progression.rareUpgradeLevels[upgradeId];
                        const nextEffect = t(`game.upgrades.rare.${upgradeId}.effects.${level}`);
                        const unlocked = devMode || isRareUpgradeUnlocked(gameState.progression, upgradeId);
                        const atMaxLevel = !devMode && level >= definition.maxLevel;
                        const canIncreaseInDev = Number.isSafeInteger(level) && level < Number.MAX_SAFE_INTEGER;
                        const cost = atMaxLevel ? null : getRareUpgradeCost(upgradeId, level);
                        const canPurchase = devMode
                          ? canIncreaseInDev
                          : unlocked &&
                            !atMaxLevel &&
                            cost !== null &&
                            gameState.progression.rare.available >= cost;

                        return (
                          <article
                            className={[
                              'game-pause-upgrade-row',
                              'game-pause-rare-upgrade-row',
                              !unlocked ? 'is-locked' : '',
                              atMaxLevel ? 'is-maxed' : '',
                            ].filter(Boolean).join(' ')}
                            key={upgradeId}
                          >
                            <div className="game-pause-upgrade-info game-pause-rare-upgrade-details">
                              <div className="game-pause-upgrade-title-line">
                                <strong>{upgradeName}</strong>
                                <span className={`game-pause-upgrade-rarity game-pause-upgrade-rarity-${definition.rarity}`}>
                                  {t(`game.pause.rarity${definition.rarity[0]!.toUpperCase()}${definition.rarity.slice(1)}`)}
                                </span>
                              </div>
                              <span className="game-pause-upgrade-description">
                                {t(`game.upgrades.rare.${upgradeId}.description`)}
                              </span>
                              <span className="game-pause-rare-level">
                                {t('game.pause.level', {
                                  level,
                                  max: devMode ? '∞' : definition.maxLevel,
                                })}
                                {devMode
                                  ? ` · ${t('game.pause.unlimitedDev')}`
                                  : atMaxLevel
                                    ? ` · ${t('game.pause.maxLevel')}`
                                    : ` · ${t('game.pause.next', { effect: nextEffect })} · ${t('game.pause.rarePointsCost', { count: cost })}`}
                              </span>
                              {!unlocked && (
                                <span className="game-pause-upgrade-lock">
                                  <span aria-hidden="true">▣</span> {t('game.pause.locked', {
                                    reason: t(`game.upgrades.rare.${upgradeId}.unlock`),
                                  })}
                                </span>
                              )}
                              {atMaxLevel && (
                                <span className="game-pause-max-level">{t('game.pause.maximumLevelReached')}</span>
                              )}
                            </div>
                            <div className="game-pause-upgrade-controls">
                              <button
                                className="game-pause-upgrade-control"
                                type="button"
                                aria-label={t('game.pause.refund', { name: upgradeName })}
                                disabled={level === 0 || !definition.refundable}
                                onClick={() => onAdjustRareUpgrade(upgradeId, -1)}
                              >
                                −
                              </button>
                              <button
                                className="game-pause-upgrade-control game-pause-upgrade-increase"
                                type="button"
                                aria-label={t('game.pause.purchase', { name: upgradeName })}
                                disabled={!canPurchase}
                                onClick={() => onAdjustRareUpgrade(upgradeId, 1)}
                              >
                                +
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            </section>

          </main>
        </div>
      )}

      {!gameState && (
        <section className="game-pause-no-run" aria-label={t('game.pause.runUnavailable')}>
          <span aria-hidden="true">☾</span>
          <strong>{t('game.pause.nextChapter')}</strong>
          <p>{t('game.pause.resumeWhenReady')}</p>
        </section>
      )}

      {!gameState && (
        <div className="game-pause-null-actions">
          <button className="game-pause-resume" type="button" onClick={onResume} autoFocus>
            <span className="game-pause-resume-symbol" aria-hidden="true">▶</span>
            <span className="game-pause-resume-copy">
              <strong>{t('game.pause.resume')}</strong>
              <small>{t('game.pause.backToGame')}</small>
            </span>
          </button>
          <div className="game-pause-action-grid">
            <button className="game-pause-action" type="button" onClick={() => onViewChange('settings')}>
              <span className="game-pause-action-icon" aria-hidden="true">⚙</span>
              <span>{t('game.pause.settings')}</span>
            </button>
            <button className="game-pause-action" type="button" onClick={() => onViewChange('enemy-guide')}>
              <span className="game-pause-action-icon" aria-hidden="true">▤</span>
              <span>{t('game.pause.guides')}</span>
            </button>
            {!tutorialMode && (
              <button className="game-pause-action" type="button" onClick={onRestart}>
                <span className="game-pause-action-icon" aria-hidden="true">↻</span>
                <span>{t('game.pause.restartRun')}</span>
              </button>
            )}
            <button className="game-pause-action" type="button" onClick={onReturnToMenu}>
              <span className="game-pause-action-icon" aria-hidden="true">⌂</span>
              <span>{t(tutorialMode ? 'game.pause.exitTutorial' : 'game.pause.mainMenu')}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
