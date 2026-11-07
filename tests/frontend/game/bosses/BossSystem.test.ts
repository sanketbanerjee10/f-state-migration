import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  completeWaveIfCleared,
  startWave,
} from '@/game/core/GameProgression';
import { GAME_SCORING_CONFIG } from '@/game/core/GameConfig';
import {
  calculateDeterministicScore,
  createGameState,
  createZombie,
} from '@/game/core/GameState';
import { updateGameState } from '@/game/core/GameSimulation';
import {
  BOSS_CONFIG,
  beginBossWave,
  getBossForWave,
  handleBossDefeat,
  moveBoss,
  updateBossAbilities,
  updateBossEncounter,
} from '@/game/bosses/BossSystem';

const INPUT = { movementX: 0, movementY: 0, aimAngle: 0 } as const;

describe('boss encounters', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('schedules a boss every ten waves and rotates through the three designs', () => {
    expect(getBossForWave(9)).toBeUndefined();
    expect(getBossForWave(10)).toEqual({
      type: 'charger',
      name: 'The Charger',
    });
    expect(getBossForWave(20)).toEqual({
      type: 'acidQueen',
      name: 'Acid Queen',
    });
    expect(getBossForWave(30)).toEqual({
      type: 'hordeCaller',
      name: 'Horde Caller',
    });
    expect(getBossForWave(40)?.type).toBe('charger');
    expect(() => getBossForWave(0)).toThrow(RangeError);
  });

  it('pauses scheduled spawns for the intro and spawns one required boss at a validated location', () => {
    const state = createGameState();
    startWave(state, 10);
    expect(state.wave).toMatchObject({
      bossName: 'The Charger',
      bossType: 'charger',
      bossSpawned: false,
      requiredBossesRemaining: 1,
      bossIntroSeconds: BOSS_CONFIG.introductionSeconds,
    });

    updateGameState(state, INPUT, 1);
    expect(state.wave.enemiesSpawned).toBe(0);
    expect(state.zombies).toHaveLength(0);

    updateGameState(state, INPUT, BOSS_CONFIG.introductionSeconds);
    expect(state.wave.bossSpawned).toBe(true);
    expect(state.wave.enemiesSpawned).toBe(0);
    expect(state.zombies.filter((zombie) => zombie.isBoss)).toHaveLength(1);
    expect(state.zombies[0]).toMatchObject({
      isBoss: true,
      bossType: 'charger',
      radius: BOSS_CONFIG.radius,
      maxHealth: expect.any(Number),
    });
    expect(state.zombies[0].maxHealth).toBeGreaterThan(1_000);
    expect(state.wave.announcement).toContain('The Charger');
  });

  it('leaves normal waves without a boss encounter', () => {
    const state = createGameState();
    beginBossWave(state, 9);
    expect(state.wave.bossType).toBeUndefined();
    expect(state.wave.bossSpawned).toBe(true);
    expect(state.wave.requiredBossesRemaining).toBe(0);
  });

  it('telegraphs the Charger direction, dashes, and enters a stun on wall impact', () => {
    const state = createGameState();
    const boss = createZombie(10, 'brute', 880, 270, 10);
    boss.radius = BOSS_CONFIG.radius;
    boss.isBoss = true;
    boss.bossType = 'charger';
    boss.bossAttackCooldownSeconds = 0;
    state.player.x = 940;
    state.player.y = 270;
    state.zombies = [boss];

    updateBossAbilities(state, 0);
    expect(boss.bossPhase).toBe('windup');
    expect(boss.bossChargeAngle).toBeCloseTo(0);
    expect(state.impacts.some((impact) => impact.kind === 'telegraph')).toBe(true);
    expect(moveBoss(state, boss, 0.1)).toBe(true);

    updateBossAbilities(state, BOSS_CONFIG.chargerWindupSeconds);
    expect(boss.bossPhase).toBe('charge');
    updateBossAbilities(state, 0.4);
    expect(boss.bossPhase).toBe('stunned');
    expect(boss.bossPhaseSeconds).toBe(BOSS_CONFIG.chargerStunSeconds);
  });

  it('gives Acid Queen a three-shot spread and telegraphed persistent acid pool', () => {
    const state = createGameState();
    const boss = createZombie(20, 'brute', 200, 200, 20);
    boss.isBoss = true;
    boss.bossType = 'acidQueen';
    boss.bossAttackCooldownSeconds = 0;
    state.zombies = [boss];

    updateBossAbilities(state, 0);
    expect(state.projectiles).toHaveLength(3);
    expect(state.projectiles.every((projectile) =>
      projectile.owner === 'enemy' && projectile.kind === 'acid',
    )).toBe(true);

    boss.bossAttackCooldownSeconds = 0;
    updateBossAbilities(state, 0);
    expect(state.impacts.some((impact) =>
      impact.kind === 'telegraph' &&
      impact.radius === BOSS_CONFIG.acidQueenPoolRadius,
    )).toBe(true);
    updateBossAbilities(state, BOSS_CONFIG.acidQueenPoolTelegraphSeconds);
    expect(state.hazards).toHaveLength(1);
    expect(state.hazards[0]).toMatchObject({
      kind: 'acid',
      damage: BOSS_CONFIG.acidQueenPoolDamage,
      durationSeconds: BOSS_CONFIG.acidQueenPoolDurationSeconds,
    });
    const healthBeforePoolTick = state.player.health;
    state.player.fireCooldownSeconds = 1_000;
    state.wave.spawnCooldownSeconds = 1_000;
    updateGameState(state, INPUT, 0.05);
    expect(state.player.health).toBeLessThan(healthBeforePoolTick);
    expect(state.hazards).toHaveLength(1);
  });

  it('shields Horde Caller while summons are alive and caps total support spawns', () => {
    const state = createGameState();
    const boss = createZombie(30, 'screamer', 200, 200, 30);
    boss.isBoss = true;
    boss.bossType = 'hordeCaller';
    boss.bossShielded = true;
    boss.bossSummonsSpawned = 0;
    boss.bossSummonCooldownSeconds = 0;
    state.zombies = [boss];

    updateBossAbilities(state, 0);
    expect(state.zombies.filter((zombie) => zombie.bossSummonedBy === boss.id))
      .toHaveLength(BOSS_CONFIG.summonGroupSize);
    expect(boss.bossShielded).toBe(true);

    state.zombies = [boss];
    updateBossAbilities(state, 0);
    expect(boss.bossShielded).toBe(false);

    while ((boss.bossSummonsSpawned ?? 0) < BOSS_CONFIG.maximumSummonsPerEncounter) {
      state.zombies = [boss];
      boss.bossSummonCooldownSeconds = 0;
      updateBossAbilities(state, 0);
      state.zombies = state.zombies.filter(
        (zombie) => zombie.bossSummonedBy === undefined,
      );
    }
    expect(boss.bossSummonsSpawned).toBe(BOSS_CONFIG.maximumSummonsPerEncounter);
    expect(state.zombies.length).toBeLessThanOrEqual(1);
  });

  it('prevents damage to Horde Caller until its required summons are defeated', () => {
    const state = createGameState();
    const boss = createZombie(35, 'screamer', 250, 250, 30);
    boss.isBoss = true;
    boss.bossType = 'hordeCaller';
    boss.bossShielded = true;
    boss.bossSummonsSpawned = 0;
    boss.bossSummonCooldownSeconds = 0;
    state.zombies = [boss];
    state.player.fireCooldownSeconds = 1_000;
    state.wave.spawnCooldownSeconds = 1_000;
    state.projectiles = [{
      id: 36,
      x: boss.x,
      y: boss.y,
      directionX: 0,
      directionY: 0,
      radius: 4,
      damage: 100,
      speed: 560,
      remainingSeconds: 1,
      owner: 'player',
      kind: 'standard',
    }];

    updateGameState(state, INPUT, 0);
    expect(boss.health).toBe(boss.maxHealth);
    expect(boss.bossShielded).toBe(true);

    state.zombies = [boss];
    state.projectiles = [{
      id: 37,
      x: boss.x,
      y: boss.y,
      directionX: 0,
      directionY: 0,
      radius: 4,
      damage: 100,
      speed: 560,
      remainingSeconds: 1,
      owner: 'player',
      kind: 'standard',
    }];
    updateGameState(state, INPUT, 0);
    expect(boss.bossShielded).toBe(false);
    expect(boss.health).toBeLessThan(boss.maxHealth);
  });

  it('deduplicates boss rewards and separates Rare Points from wave-clear Standard Points', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const state = createGameState();
    startWave(state, 10);
    const boss = createZombie(40, 'brute', 120, 120, 10);
    boss.isBoss = true;
    boss.bossType = 'charger';
    state.zombies = [boss];

    handleBossDefeat(state, boss);
    handleBossDefeat(state, boss);
    expect(state.statistics.bossKills).toBe(1);
    expect(state.statistics.rareCurrency?.earned).toBe(BOSS_CONFIG.rarePointReward);
    expect(state.statistics.upgradePoints).toBe(0);
    expect(calculateDeterministicScore(state.statistics)).toBe(
      GAME_SCORING_CONFIG.bossKillBonus,
    );

    state.zombies = [];
    state.wave.enemiesSpawned = state.wave.enemyBudget;
    expect(completeWaveIfCleared(state)).toBe(true);
    expect(state.statistics.upgradePoints).toBe(3);
    expect(state.statistics.rareCurrency?.earned).toBe(BOSS_CONFIG.rarePointReward);
    expect(completeWaveIfCleared(state)).toBe(false);
  });

  it('doubles the guaranteed two Rare Points for bosses on a successful roll', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.49);
    const state = createGameState();
    startWave(state, 10);
    const boss = createZombie(41, 'brute', 120, 120, 10);
    boss.isBoss = true;
    boss.bossType = 'charger';

    handleBossDefeat(state, boss);

    expect(state.statistics.rareCurrency?.available).toBe(4);
  });

  it('does not spawn a boss until a valid arena location is available', () => {
    const state = createGameState(100, 100);
    startWave(state, 10);
    state.wave.bossIntroSeconds = 0;

    updateBossEncounter(state, 0);
    expect(state.wave.bossSpawned).toBe(false);
    expect(state.wave.requiredBossesRemaining).toBe(1);
    expect(state.zombies).toHaveLength(0);

    state.arenaWidth = 960;
    state.arenaHeight = 540;
    updateBossEncounter(state, 0.25);
    expect(state.wave.bossSpawned).toBe(true);
    expect(state.zombies).toHaveLength(1);
  });
});
