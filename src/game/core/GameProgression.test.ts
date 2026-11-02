import { describe, expect, it } from 'vitest';
import {
  completeWaveIfCleared,
  confirmNextWave,
  GAME_PROGRESSION_CONFIG,
  getWaveEnemyBudget,
  getWaveSpawnInterval,
  selectRunUpgrade,
  skipCappedUpgrades,
} from './GameProgression';
import {
  calculateDeterministicScore,
  createGameState,
  createZombie,
  getUpgradeOffers,
} from './GameState';
import { circleOverlapsRectangle, getArenaObstacles } from './ArenaGeometry';
import { updateGameState } from './GameSimulation';

describe('wave progression and run upgrades', () => {
  it('spawns valid wave-one enemies in controlled intervals and scales threat', () => {
    const state = createGameState();
    expect(getWaveEnemyBudget(1)).toBe(4);
    expect(getWaveEnemyBudget(3)).toBe(8);
    expect(getWaveSpawnInterval(2)).toBeLessThan(getWaveSpawnInterval(1));

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
      0.9,
    );
    expect(state.wave.enemiesSpawned).toBe(2);

    const firstWaveZombie = createZombie(1, 'walker', 100, 100, 1);
    const fifthWaveZombie = createZombie(2, 'walker', 100, 100, 5);
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
    expect(state.wave.phase).toBe('upgrade');
    expect(state.statistics.highestWaveCleared).toBe(1);
    expect(state.projectiles).toHaveLength(0);
    expect(getUpgradeOffers(state.player, state.wave.phase)).toHaveLength(4);
  });

  it('shows current/new upgrade values, applies one choice, then starts the next wave', () => {
    const state = createGameState();
    state.wave.enemiesSpawned = state.wave.enemyBudget;
    expect(completeWaveIfCleared(state)).toBe(true);

    const offer = selectRunUpgrade(state, 'damage');
    expect(offer).toMatchObject({
      currentValue: 25,
      newValue: 35,
    });
    expect(state.player.damage).toBe(35);
    expect(state.statistics.upgradesSelected).toBe(1);
    expect(state.wave.phase).toBe('intermission');
    expect(() => selectRunUpgrade(state, 'damage')).toThrow(RangeError);

    confirmNextWave(state);
    expect(state.wave).toMatchObject({
      currentWave: 2,
      phase: 'combat',
      enemyBudget: 6,
      enemiesSpawned: 0,
    });
    expect(state.statistics.highestWaveReached).toBe(2);
    expect(state.statistics.highestWaveCleared).toBe(1);
    expect(calculateDeterministicScore(state.statistics)).toBe(250);
  });

  it('applies max-health upgrades with healing and prevents uncapped stat growth', () => {
    const state = createGameState();
    state.player.health = 60;
    state.wave.phase = 'upgrade';
    const healthOffer = selectRunUpgrade(state, 'maxHealth');
    expect(healthOffer).toMatchObject({ currentValue: 100, newValue: 120 });
    expect(state.player.maxHealth).toBe(120);
    expect(state.player.health).toBe(80);

    state.wave.phase = 'upgrade';
    state.player.damage = 95;
    const damageOffer = getUpgradeOffers(state.player, 'upgrade')
      .find((candidate) => candidate.attribute === 'damage');
    expect(damageOffer?.newValue).toBe(100);

    state.player.damage = 100;
    expect(
      getUpgradeOffers(state.player, 'upgrade').some(
        (candidate) => candidate.attribute === 'damage',
      ),
    ).toBe(false);
  });

  it('applies permanent fire-rate and movement-speed upgrades', () => {
    const state = createGameState();
    state.wave.phase = 'upgrade';
    selectRunUpgrade(state, 'shotsPerSecond');
    expect(state.player.shotsPerSecond).toBe(4.5);
    expect(state.statistics.highestShotsPerSecond).toBe(4.5);

    state.wave.phase = 'upgrade';
    selectRunUpgrade(state, 'movementSpeed');
    expect(state.player.movementSpeed).toBe(260);
    expect(state.statistics.upgradesSelected).toBe(2);
  });

  it('lets a fully capped run continue without awarding another upgrade', () => {
    const state = createGameState();
    state.wave.phase = 'upgrade';
    state.player.damage = 100;
    state.player.shotsPerSecond = 10;
    state.player.maxHealth = 200;
    state.player.movementSpeed = 360;

    expect(getUpgradeOffers(state.player, state.wave.phase)).toHaveLength(0);
    skipCappedUpgrades(state);
    expect(state.wave.phase).toBe('intermission');
    expect(state.statistics.upgradesSelected).toBe(0);
  });

  it('auto-starts the next wave after the intermission countdown', () => {
    const state = createGameState();
    state.wave.phase = 'intermission';
    state.wave.intermissionSeconds = 0.5;

    updateGameState(
      state,
      { movementX: 0, movementY: 0, aimAngle: 0 },
      0.5,
    );
    expect(state.wave.phase).toBe('combat');
    expect(state.wave.currentWave).toBe(2);
    expect(state.wave.intermissionSeconds).toBe(0);
    expect(GAME_PROGRESSION_CONFIG.intermissionSeconds).toBeGreaterThan(0);
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
    };
    expect(calculateDeterministicScore(statistics)).toBe(1850);
    expect(calculateDeterministicScore(statistics)).toBe(
      calculateDeterministicScore(statistics),
    );
  });
});
