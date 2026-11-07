import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  adjustRareUpgrade,
  adjustRunStat,
  advanceWaveProgression,
  completeWaveIfCleared,
  GAME_PROGRESSION_CONFIG,
  getWaveEnemyBudget,
  getWaveSpawnInterval,
} from '@/game/core/GameProgression';
import {
  calculateDeterministicScore,
  createGameState,
  createZombie,
  getRunStatOptions,
} from '@/game/core/GameState';
import { PLAYER_CONFIG, PLAYER_PROJECTILE_RANGE } from '@/game/core/GameConfig';
import { circleOverlapsRectangle, getArenaObstacles } from '@/game/core/ArenaGeometry';
import { updateGameState } from '@/game/core/GameSimulation';
import {
  awardChallengeRareReward,
  buyNormalAttribute,
  createRunProgressionState,
  getNormalAttributeCost,
  getNormalAttributeValue,
  getRareUpgradeCost,
  getRareUpgradeNextEffectText,
  refundNormalAttribute,
  RARE_UPGRADE_DEFINITIONS,
} from '@/game/upgrades/ProgressionSystem';

function grantStandardPoints(
  state: ReturnType<typeof createGameState>,
  amount: number,
): void {
  state.progression.standard = {
    earned: amount,
    available: amount,
    spent: 0,
  };
  state.statistics.standardCurrency = { ...state.progression.standard };
  state.statistics.upgradePoints = amount;
}

describe('wave progression and stat points', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('spawns valid enemies faster while extending later wave durations', () => {
    const state = createGameState();
    expect(getWaveEnemyBudget(1)).toBe(37);
    expect(getWaveEnemyBudget(3)).toBeGreaterThan(getWaveEnemyBudget(1));
    expect(getWaveEnemyBudget(10)).toBeGreaterThan(getWaveEnemyBudget(3));
    expect(getWaveSpawnInterval(2)).toBeLessThan(getWaveSpawnInterval(1));
    expect(getWaveSpawnInterval(1)).toBe(1);
    expect(getWaveSpawnInterval(30)).toBe(
      GAME_PROGRESSION_CONFIG.minimumSpawnIntervalSeconds,
    );
    expect(
      (getWaveEnemyBudget(1) - 1) * getWaveSpawnInterval(1),
    ).toBe(36);
    expect(
      (getWaveEnemyBudget(3) - 1) * getWaveSpawnInterval(3),
    ).toBeGreaterThan(
      (getWaveEnemyBudget(1) - 1) * getWaveSpawnInterval(1),
    );
    expect(
      (getWaveEnemyBudget(13) - 1) * getWaveSpawnInterval(13),
    ).toBeCloseTo(180 * 0.6, 0);

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    expect(state.wave.enemiesSpawned).toBe(1);
    expect(state.zombies).toHaveLength(1);
    expect(state.zombies[0].type).toBe('walker');
    expect(state.zombies[0].x).toBeGreaterThanOrEqual(state.zombies[0].radius);
    expect(
      getArenaObstacles(state.arenaWidth, state.arenaHeight).some((obstacle) =>
        circleOverlapsRectangle(
          state.zombies[0],
          state.zombies[0].radius,
          obstacle,
        ),
      ),
    ).toBe(false);

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      1,
    );
    expect(state.wave.enemiesSpawned).toBe(2);

    const firstWaveZombie = createZombie(1, 'walker', 100, 100, 1);
    const fifthWaveZombie = createZombie(2, 'walker', 100, 100, 5);
    expect(firstWaveZombie.movementSpeed).toBe(26);
    expect(fifthWaveZombie.health).toBeGreaterThan(firstWaveZombie.health);
    expect(fifthWaveZombie.movementSpeed).toBeGreaterThan(firstWaveZombie.movementSpeed);
    expect(fifthWaveZombie.contactDamage).toBeGreaterThan(firstWaveZombie.contactDamage);
  });

  it('only clears after the full spawn budget is defeated', () => {
    const state = createGameState();
    state.wave.enemiesSpawned = state.wave.enemyBudget - 1;
    expect(completeWaveIfCleared(state)).toBe(false);
    expect(state.wave.phase).toBe('combat');

    state.wave.enemiesSpawned = state.wave.enemyBudget;
    state.zombies.push(createZombie(99, 'walker', 100, 100));
    expect(completeWaveIfCleared(state)).toBe(false);
    state.zombies = [];
    state.projectiles.push({
      id: 100,
      x: 200,
      y: 200,
      directionX: 1,
      directionY: 0,
      radius: 4,
      damage: 25,
      speed: 560,
      remainingSeconds: 1,
    });
    expect(completeWaveIfCleared(state)).toBe(true);
    expect(state.wave.phase).toBe('intermission');
    expect(state.wave.currentWave).toBe(2);
    expect(state.statistics.highestWaveCleared).toBe(1);
    expect(state.statistics.upgradePoints).toBe(3);
    expect(state.projectiles).toHaveLength(0);
    expect(state.wave.announcement).toBe('');
    expect(getRunStatOptions(state.player)).toHaveLength(4);
  });

  it('protects the player during a visible countdown before starting the next wave', () => {
    const state = createGameState();
    state.player.health = 50;
    state.wave.enemiesSpawned = state.wave.enemyBudget;
    completeWaveIfCleared(state);
    expect(state.wave).toMatchObject({
      currentWave: 2,
      phase: 'intermission',
      arenaTransitionRemainingSeconds: 1,
      transitionCountdownSeconds: 3,
      announcement: '',
      announcementSeconds: 0,
    });
    expect(state.player.spawnProtectionSeconds).toBe(6);
    expect(state.statistics.highestWaveReached).toBe(1);
    expect(state.statistics.highestWaveCleared).toBe(1);
    expect(state.statistics.upgradePoints).toBe(3);

    const intermissionZombie = createZombie(
      900,
      'walker',
      state.player.x + 10,
      state.player.y,
    );
    state.zombies = [intermissionZombie];
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    expect(state.player.health).toBe(50);
    state.zombies = [];

    advanceWaveProgression(state, 0.5);
    expect(state.wave.arenaTransitionRemainingSeconds).toBe(0.5);
    expect(state.wave.announcement).toBe('');
    advanceWaveProgression(state, 0.5);
    expect(state.wave.arenaTransitionRemainingSeconds).toBe(0);
    expect(state.wave.announcement).toBe('3');
    advanceWaveProgression(state, 1);
    expect(state.wave.announcement).toBe('2');
    expect(state.wave.phase).toBe('intermission');
    advanceWaveProgression(state, 1);
    expect(state.wave.announcement).toBe('1');
    expect(state.wave.phase).toBe('intermission');
    advanceWaveProgression(state, 1);
    expect(state.wave.phase).toBe('combat');
    expect(state.statistics.highestWaveReached).toBe(2);
    expect(state.wave.enemyBudget).toBe(getWaveEnemyBudget(2));
    expect(state.wave.enemiesSpawned).toBe(0);
    expect(state.player.spawnProtectionSeconds).toBeGreaterThan(0);
    state.zombies = [
      createZombie(901, 'walker', state.player.x + 10, state.player.y),
    ];
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    expect(state.player.health).toBe(50);
    state.zombies = state.zombies.filter((zombie) => zombie.id !== 901);

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    expect(state.wave.enemiesSpawned).toBe(1);
    expect(state.zombies).toHaveLength(1);
    expect(calculateDeterministicScore(state.statistics)).toBe(250);
  });

  it('awards three Standard Points for a level and keeps its initial campaign balance', () => {
    const state = createGameState(960, 540, 'level', 1, 5);
    state.wave.enemiesSpawned = state.wave.enemyBudget;
    vi.spyOn(Math, 'random').mockReturnValue(0.9);

    expect(completeWaveIfCleared(state)).toBe(true);

    expect(state.wave.phase).toBe('levelComplete');
    expect(state.statistics.upgradePoints).toBe(8);
    expect(state.statistics.standardCurrency).toMatchObject({
      earned: 8,
      available: 8,
    });
    expect(createGameState(960, 540, 'survival', null, 8).statistics.upgradePoints)
      .toBe(0);
  });

  it('does not award Standard Points for replaying a completed campaign level', () => {
    const state = createGameState(960, 540, 'level', 1, 4, false);
    state.wave.enemiesSpawned = state.wave.enemyBudget;
    vi.spyOn(Math, 'random').mockReturnValue(0.9);

    expect(completeWaveIfCleared(state)).toBe(true);

    expect(state.statistics.upgradePoints).toBe(4);
    expect(state.statistics.standardCurrency).toMatchObject({
      earned: 4,
      available: 4,
    });
  });

  it('exposes carried campaign points to stat controls', () => {
    const state = createGameState(960, 540, 'level', 2, 3);

    expect(state.statistics.upgradePoints).toBe(3);
    expect(getRunStatOptions(state.player).find(
      (option) => option.attribute === 'damage',
    )?.canIncrease).toBe(true);

    adjustRunStat(state, 'damage', 1);

    expect(state.player.damage).toBeGreaterThan(25);
    expect(state.statistics.upgradePoints).toBe(2);
    expect(state.statistics.standardCurrency?.available).toBe(2);
  });

  it('restores campaign stat upgrades and supports refunds in later levels', () => {
    const state = createGameState(
      960,
      540,
      'level',
      3,
      4,
      true,
      {
        damage: 1,
        fireRate: 1,
        maxHealth: 0,
        movementSpeed: 0,
      },
    );

    expect(state.player.damage).toBeGreaterThan(25);
    expect(state.player.shotsPerSecond).toBeGreaterThan(2);
    expect(state.statistics.statAllocations.damage).toBe(1);
    expect(state.statistics.standardCurrency).toMatchObject({
      earned: 6,
      available: 4,
      spent: 2,
    });

    adjustRunStat(state, 'damage', -1);

    expect(state.statistics.upgradePoints).toBe(5);
    expect(state.statistics.statAllocations.damage).toBe(0);
  });

  it('spends points on stats, allows refunds, and rejects unearned spending', () => {
    const state = createGameState();
    state.player.health = 60;
    expect(() => adjustRunStat(state, 'damage', 1)).toThrow(RangeError);

    grantStandardPoints(state, 1);
    adjustRunStat(state, 'maxHealth', 1);
    expect(state.player.maxHealth).toBe(110);
    expect(state.player.health).toBe(60);
    expect(state.statistics.upgradePoints).toBe(0);
    expect(state.statistics.statAllocations.maxHealth).toBe(1);

    adjustRunStat(state, 'maxHealth', -1);
    expect(state.player.maxHealth).toBe(100);
    expect(state.player.health).toBe(60);
    expect(state.statistics.upgradePoints).toBe(1);
    expect(state.statistics.statAllocations.maxHealth).toBe(0);
    expect(() => adjustRunStat(state, 'maxHealth', -1)).toThrow(RangeError);
  });

  it('keeps standard stat progression unlimited and refunds points when reduced', () => {
    const state = createGameState();
    grantStandardPoints(state, 9);
    for (let point = 0; point < 7; point += 1) {
      adjustRunStat(state, 'damage', 1);
    }
    expect(state.player.damage).toBeCloseTo(42.5);
    adjustRunStat(state, 'damage', 1);
    expect(state.player.damage).toBe(45);
    expect(getRunStatOptions(state.player).find(
      (option) => option.attribute === 'damage',
    )?.newValue).toBe(27.5);
    adjustRunStat(state, 'damage', 1);
    expect(state.player.damage).toBeCloseTo(47.5);
    expect(state.statistics.upgradePoints).toBe(0);
    adjustRunStat(state, 'damage', -1);
    expect(state.player.damage).toBe(45);
    expect(state.statistics.upgradePoints).toBe(1);
  });

  it('tracks invested fire-rate and movement-speed points', () => {
    const state = createGameState();
    grantStandardPoints(state, 2);
    adjustRunStat(state, 'shotsPerSecond', 1);
    expect(state.player.shotsPerSecond).toBe(2.16);
    expect(state.statistics.highestShotsPerSecond).toBe(2.16);
    adjustRunStat(state, 'movementSpeed', 1);
    expect(state.player.movementSpeed).toBeCloseTo(169.95);
    expect(state.statistics.upgradesSelected).toBe(2);
    expect(state.statistics.upgradePoints).toBe(0);
  });

  it('starts with the reduced firing rate and projectile range', () => {
    const state = createGameState();

    expect(PLAYER_CONFIG.startingShotsPerSecond).toBe(2);
    expect(state.player.shotsPerSecond).toBe(2);
    expect(PLAYER_PROJECTILE_RANGE).toBe(588);
  });

  it('uses base-relative formulas at unlimited levels and preserves active fire cooldown', () => {
    const state = createGameState();
    grantStandardPoints(state, 101);
    state.player.fireCooldownSeconds = 0.37;
    adjustRunStat(state, 'shotsPerSecond', 1);
    expect(state.player.shotsPerSecond).toBe(2.16);
    expect(state.player.fireCooldownSeconds).toBe(0.37);
    expect(getNormalAttributeValue('damage', 25, 10)).toBe(50);
    expect(getNormalAttributeValue('damage', 25, 50)).toBe(150);
    expect(getNormalAttributeValue('damage', 25, 100)).toBe(275);

    for (let level = 0; level < 100; level += 1) {
      adjustRunStat(state, 'damage', 1);
    }
    expect(state.progression.standardAttributeLevels.damage).toBe(100);
    expect(state.player.damage).toBe(275);
    expect(state.progression.standard).toEqual({
      earned: 101,
      available: 0,
      spent: 101,
    });

  });

  it('uses configured per-level costs and refunds the recorded amount', () => {
    const progression = createRunProgressionState();
    progression.standard = { earned: 5, available: 5, spent: 0 };
    const definition = {
      id: 'damage' as const,
      label: 'Damage',
      description: 'test',
      defaultCost: 1,
      costsByLevel: [2, 3],
      effectText: 'test',
      perLevelValue: (baseValue: number) => baseValue * 0.1,
    };

    expect(getNormalAttributeCost('damage', 0, definition)).toBe(2);
    expect(buyNormalAttribute(progression, 'damage', 2)).toBe(true);
    expect(progression.standard).toEqual({
      earned: 5,
      available: 3,
      spent: 2,
    });
    expect(refundNormalAttribute(progression, 'damage')).toBe(true);
    expect(progression.standard).toEqual({
      earned: 5,
      available: 5,
      spent: 0,
    });
  });

  it('deduplicates challenge-style rare rewards and exposes configured upgrade balance', () => {
    const progression = createRunProgressionState();
    expect(awardChallengeRareReward(
      progression,
      'no-damage',
      'run-1',
      2,
    )).toBe(true);
    expect(awardChallengeRareReward(
      progression,
      'no-damage',
      'run-1',
      2,
    )).toBe(false);
    expect(awardChallengeRareReward(
      progression,
      'no-damage',
      'run-2',
      1,
    )).toBe(true);
    expect(progression.rare).toEqual({
      earned: 3,
      available: 3,
      spent: 0,
    });
    expect(getRareUpgradeCost('lifesteal', 0)).toBe(1);
    expect(RARE_UPGRADE_DEFINITIONS.lifesteal.maxLevel).toBe(5);
    expect(getRareUpgradeCost('secondWind', 0)).toBe(2);
    expect(RARE_UPGRADE_DEFINITIONS.secondWind.maxLevel).toBe(3);
    expect(getRareUpgradeNextEffectText('criticalMastery', 0)).toBe(
      '+3% critical chance',
    );
  });

  it('spends and refunds rare points exactly and unlocks rare abilities by milestone', () => {
    const state = createGameState();
    state.progression.rare.earned = 2;
    state.progression.rare.available = 2;

    adjustRareUpgrade(state, 'lifesteal', 1);
    expect(state.progression.rare).toEqual({
      earned: 2,
      available: 1,
      spent: 1,
    });
    expect(state.progression.rareUpgradeLevels.lifesteal).toBe(1);
    adjustRareUpgrade(state, 'lifesteal', -1);
    expect(state.progression.rare).toEqual({
      earned: 2,
      available: 2,
      spent: 0,
    });

    expect(() => adjustRareUpgrade(state, 'piercingRounds', 1)).toThrow(
      RangeError,
    );
    state.wave.currentWave = 5;
    state.wave.enemyBudget = 1;
    state.wave.enemiesSpawned = 1;
    expect(completeWaveIfCleared(state)).toBe(true);
    expect(state.progression.rareUpgradeUnlocked.piercingRounds).toBe(true);

    state.progression.rare.earned = 4;
    state.progression.rare.available = 4;
    adjustRareUpgrade(state, 'piercingRounds', 1);
    expect(state.progression.rareUpgradeLevels.piercingRounds).toBe(1);
    expect(state.statistics.rareCurrency?.available).toBe(3);
  });

  it('allows unlimited free stat and rare upgrades in dev mode', () => {
    const state = createGameState(960, 540, 'dev');

    for (let level = 0; level < 110; level += 1) {
      adjustRunStat(state, 'damage', 1);
    }
    expect(state.progression.standardAttributeLevels.damage).toBe(110);
    expect(state.progression.standard.available).toBe(0);
    expect(state.player.damage).toBeGreaterThan(PLAYER_CONFIG.startingDamage);

    for (let level = 0; level < RARE_UPGRADE_DEFINITIONS.lifesteal.maxLevel + 2; level += 1) {
      adjustRareUpgrade(state, 'lifesteal', 1);
    }
    expect(state.progression.rareUpgradeLevels.lifesteal).toBe(
      RARE_UPGRADE_DEFINITIONS.lifesteal.maxLevel + 2,
    );
    expect(state.progression.rare.available).toBe(0);

    adjustRareUpgrade(state, 'piercingRounds', 1);
    expect(state.progression.rareUpgradeUnlocked.piercingRounds).toBe(true);
    expect(state.progression.rareUpgradeLevels.piercingRounds).toBe(1);
  });

  it('transitions to game over without awarding a wave point when the player dies', () => {
    const state = createGameState();
    state.player.alive = false;
    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0,
    );
    expect(state.wave.phase).toBe('gameOver');
    expect(state.statistics.upgradePoints).toBe(0);
  });

  it('calculates a deterministic, combat-weighted score', () => {
    const statistics = {
      highestWaveReached: 10,
      highestWaveCleared: 3,
      zombiesKilled: 3,
      walkerKills: 2,
      runnerKills: 1,
      totalDamageDealt: 500,
      totalDamageReceived: 0,
      survivalSeconds: 100_000,
      highestDamage: 25,
      highestShotsPerSecond: 4,
      orbsCollected: 0,
      upgradesSelected: 0,
      upgradePoints: 0,
      statAllocations: {
        damage: 0,
        shotsPerSecond: 0,
        maxHealth: 0,
        movementSpeed: 0,
      },
    };
    expect(calculateDeterministicScore(statistics)).toBe(1850);
    expect(calculateDeterministicScore(statistics)).toBe(
      calculateDeterministicScore(statistics),
    );
  });
});
