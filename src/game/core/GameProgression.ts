import {
  createZombie,
  getRunStatOptions,
  PLAYER_STARTING_MAX_HEALTH,
  type GameState,
  type GameMode,
  type RunStatAttribute,
  type ZombieType,
} from './GameState';
import {
  createValidSpawnPosition,
  WAVE_SPAWN_CONFIG,
} from '../waves/SpawnSystem';
import {
  DEV_ENEMY_GROUP_SIZE,
  DEV_BOSS_GROUP_SIZE,
  DEV_STANDARD_ENEMY_BUDGET,
  DEV_WAVE_ENEMY_BUDGET,
  getEnemyTypeForSpawn,
} from '../waves/WaveComposition';
import {
  makeElite,
  shouldSpawnElite,
} from '../enemies/elites/EliteSystem';
import {
  beginBossWave,
  BOSS_TYPES,
  spawnDevBoss,
} from '../bosses/BossSystem';
import {
  createArenaLayoutForWave,
  createArenaObstacles,
  createExplosiveBarrels,
  getArenaCollisionObstacles,
} from '../arena/ArenaSystem';
import { findCirclePositionInArena } from './ArenaGeometry';
import {
  ARENA_TRANSITION_SECONDS,
  ARENA_INTERACTION_CONFIG,
  GAME_PROGRESSION_CONFIG,
  ORB_DROP_SEQUENCE,
  PLAYER_CONFIG,
  STANDARD_POINTS_PER_CLEAR,
  STANDARD_ATTRIBUTE_DEFINITIONS,
  WAVE_MODIFIER_CONFIG,
  WAVE_MILESTONE_RARE_POINT_REWARDS,
} from './GameConfig';
import {
  awardStandardWavePoint,
  buyNormalAttribute,
  buyRareUpgrade,
  createRunProgressionState,
  getNormalAttributeCost,
  refundNormalAttribute,
  refundRareUpgrade,
  awardRareReward,
  getNormalAttributeValue,
  type StandardAttributeId,
  type RareUpgradeId,
} from '../upgrades/ProgressionSystem';
import {
  getWaveModifierForWave,
  type WaveModifierId,
} from '../modifiers/WaveModifiers';

export {
  GAME_PROGRESSION_CONFIG,
  ORB_DROP_SEQUENCE,
  WAVE_MILESTONE_RARE_POINT_REWARDS,
} from './GameConfig';

const LAST_ENEMY_RARE_POINT_CHANCE = 0.5;

export function getWaveEnemyBudget(
  waveNumber: number,
  gameMode: GameMode = 'standard',
): number {
  if (!Number.isInteger(waveNumber) || waveNumber < 1) {
    throw new RangeError('Wave number must be a positive integer.');
  }
  if (gameMode === 'dev') return DEV_WAVE_ENEMY_BUDGET;
  const targetSpawnDuration =
    GAME_PROGRESSION_CONFIG.baseSpawnDurationSeconds +
    (waveNumber - 1) *
      GAME_PROGRESSION_CONFIG.additionalSpawnDurationPerWaveSeconds;
  const originalBudget =
    Math.ceil(targetSpawnDuration / getWaveSpawnInterval(waveNumber)) + 1;
  return Math.round(originalBudget * GAME_PROGRESSION_CONFIG.enemyBudgetMultiplier);
}

export function getWaveSpawnInterval(
  waveNumber: number,
  activeModifier?: WaveModifierId | null,
): number {
  if (!Number.isInteger(waveNumber) || waveNumber < 1) {
    throw new RangeError('Wave number must be a positive integer.');
  }
  const baseInterval = Math.max(
    GAME_PROGRESSION_CONFIG.minimumSpawnIntervalSeconds,
    GAME_PROGRESSION_CONFIG.baseSpawnIntervalSeconds -
      (waveNumber - 1) *
        GAME_PROGRESSION_CONFIG.spawnIntervalDecreasePerWaveSeconds,
  );
  if (activeModifier !== 'overrun') return baseInterval;

  const overrun = WAVE_MODIFIER_CONFIG.definitions.overrun;
  return Math.max(
    overrun.minimumSpawnIntervalSeconds ?? 0,
    baseInterval * (overrun.spawnIntervalMultiplier ?? 1),
  );
}

function spawnWaveEnemy(state: GameState): boolean {
  if (state.zombies.length >= WAVE_SPAWN_CONFIG.maximumActiveEnemies) {
    return false;
  }
  const spawnIndex = state.wave.enemiesSpawned;
  if (
    state.gameMode === 'dev' &&
    spawnIndex >= DEV_STANDARD_ENEMY_BUDGET
  ) {
    const bossIndex = Math.floor(
      (spawnIndex - DEV_STANDARD_ENEMY_BUDGET) / DEV_BOSS_GROUP_SIZE,
    );
    const bossType = BOSS_TYPES[bossIndex];
    if (!bossType || !spawnDevBoss(state, bossType)) return false;
    state.wave.enemiesSpawned += 1;
    return true;
  }

  const type: ZombieType = getEnemyTypeForSpawn({
    wave: state.wave.currentWave,
    spawnIndex,
    enemyBudget: state.wave.enemyBudget,
    activeModifier: state.wave.activeModifier,
    devMode: state.gameMode === 'dev',
  });
  const position = createValidSpawnPosition(state, type);
  if (!position) return false;

  const context = {
    wave: state.wave.currentWave,
    spawnIndex,
    enemyBudget: state.wave.enemyBudget,
    activeModifier: state.wave.activeModifier,
    devMode: state.gameMode === 'dev',
  };
  const zombie = createZombie(
    state.nextEntityId++,
    type,
    position.x,
    position.y,
    state.wave.currentWave,
  );
  state.zombies.push(
    state.gameMode !== 'dev' && shouldSpawnElite(context)
      ? makeElite(zombie, context)
      : zombie,
  );
  state.wave.enemiesSpawned += 1;
  state.wave.lastSpawnCandidateIndex = position.candidateIndex;
  return true;
}

export function prepareArenaForWave(
  state: GameState,
  waveNumber: number,
  previousLayoutId?: string,
): void {
  const layout = createArenaLayoutForWave(
    waveNumber,
    previousLayoutId ?? state.wave.lastArenaLayoutId,
  );
  state.arenaTheme = layout.theme;
  state.wave.lastArenaLayoutId = layout.id;
  state.arenaObstacles = layout.obstacles.map((obstacle) =>
    obstacle.kind === 'barricade'
      ? {
          ...obstacle,
          health: ARENA_INTERACTION_CONFIG.barricadeHealth,
          maxHealth: ARENA_INTERACTION_CONFIG.barricadeHealth,
        }
      : { ...obstacle },
  );
  state.barrels = layout.barrels.map((barrel, index) => ({
    ...barrel,
    radius: ARENA_INTERACTION_CONFIG.barrelRadius,
    health: ARENA_INTERACTION_CONFIG.barrelHealth,
    maxHealth: ARENA_INTERACTION_CONFIG.barrelHealth,
    id: `${barrel.id}-${index}`,
  }));
  const playerSpawn = findCirclePositionInArena(
    state.player,
    state.player.radius,
    state.arenaWidth,
    state.arenaHeight,
    getArenaCollisionObstacles(state.arenaObstacles, state.barrels),
  );
  state.player.x = playerSpawn.x;
  state.player.y = playerSpawn.y;
  state.items = state.items.filter(
    (item) => item.type !== 'rareGold' || item.remainingSeconds > 0,
  );
  state.hazards = [];
  state.impacts = [];
  state.damageNumbers = [];
  state.collectionEffects = [];
}

export function startWave(state: GameState, waveNumber: number): void {
  state.wave.currentWave = waveNumber;
  state.wave.pendingWaveNumber = waveNumber;
  state.wave.activeModifier = getWaveModifierForWave(waveNumber);
  state.wave.phase = 'combat';
  state.wave.transitionCountdownSeconds = 0;
  state.arenaTransitionFrom = undefined;
  state.wave.enemyBudget = state.gameMode === 'level' && waveNumber % 10 === 0
    ? 0
    : getWaveEnemyBudget(waveNumber, state.gameMode);
  state.wave.enemiesSpawned = 0;
  state.wave.spawnCooldownSeconds = 0;
  state.wave.lastSpawnCandidateIndex = -1;
  state.wave.bossSummonsSpawned = 0;
  state.wave.bossSummonCooldownSeconds = 0;
  if (state.gameMode === 'dev') {
    state.wave.bossType = undefined;
    state.wave.bossName = undefined;
    state.wave.bossEncounterId = undefined;
    state.wave.bossSpawned = true;
    state.wave.requiredBossesRemaining = 0;
  } else {
    beginBossWave(state, waveNumber);
  }
  state.wave.announcement = state.gameMode === 'level'
    ? `Level ${waveNumber}${waveNumber % 10 === 0 ? ' · BOSS' : ''}`
    : `Wave ${waveNumber}`;
  state.wave.announcementSeconds = 3;
  state.statistics.highestWaveReached = Math.max(
    state.statistics.highestWaveReached,
    waveNumber,
  );
}

export function advanceWaveProgression(
  state: GameState,
  deltaSeconds: number,
): void {
  state.wave.announcementSeconds = Math.max(
    0,
    state.wave.announcementSeconds - deltaSeconds,
  );

  if (state.wave.phase === 'intermission') {
    state.wave.transitionCountdownSeconds = Math.max(
      0,
      state.wave.transitionCountdownSeconds - deltaSeconds,
    );
    if (state.wave.transitionCountdownSeconds <= 0) {
      const queuedWave = state.wave.pendingWaveNumber || state.wave.currentWave;
      state.wave.phase = 'combat';
      state.wave.transitionCountdownSeconds = 0;
      startWave(state, queuedWave);
    }
    return;
  }

  if (state.wave.phase !== 'combat') return;

  state.wave.spawnCooldownSeconds -= deltaSeconds;
  if (state.wave.bossType && !state.wave.bossSpawned) return;
  const waitingForDevGroupClear =
    state.gameMode === 'dev' &&
    state.wave.enemiesSpawned > 0 &&
    (state.wave.enemiesSpawned <= DEV_STANDARD_ENEMY_BUDGET
      ? state.wave.enemiesSpawned % DEV_ENEMY_GROUP_SIZE === 0
      : (state.wave.enemiesSpawned - DEV_STANDARD_ENEMY_BUDGET) %
        DEV_BOSS_GROUP_SIZE === 0) &&
    state.zombies.length > 0;
  if (
    state.wave.enemiesSpawned < state.wave.enemyBudget &&
    state.wave.spawnCooldownSeconds <= 0 &&
    !waitingForDevGroupClear &&
    state.zombies.length < WAVE_SPAWN_CONFIG.maximumActiveEnemies
  ) {
    const isSpawningDevBosses =
      state.gameMode === 'dev' &&
      state.wave.enemiesSpawned >= DEV_STANDARD_ENEMY_BUDGET;
    const devGroupSize = isSpawningDevBosses
      ? DEV_BOSS_GROUP_SIZE
      : DEV_ENEMY_GROUP_SIZE;
    const devGroupOffset = isSpawningDevBosses
      ? state.wave.enemiesSpawned - DEV_STANDARD_ENEMY_BUDGET
      : state.wave.enemiesSpawned;
    const remainingInDevGroup = devGroupSize -
      (devGroupOffset % devGroupSize);
    const batchSize = state.gameMode === 'dev'
      ? Math.min(
          remainingInDevGroup,
          state.wave.enemyBudget - state.wave.enemiesSpawned,
        )
      : 1;
    let spawnedInBatch = 0;
    while (
      spawnedInBatch < batchSize &&
      state.zombies.length < WAVE_SPAWN_CONFIG.maximumActiveEnemies &&
      spawnWaveEnemy(state)
    ) {
      spawnedInBatch += 1;
    }

    if (spawnedInBatch > 0) {
      state.wave.spawnCooldownSeconds = getWaveSpawnInterval(
        state.wave.currentWave,
        state.wave.activeModifier,
      );
    }
  }
}

export function getWaveSpawnAccounting(state: GameState): {
  readonly scheduled: number;
  readonly queued: number;
  readonly spawned: number;
  readonly living: number;
} {
  return {
    scheduled: state.wave.enemyBudget,
    queued: Math.max(0, state.wave.enemyBudget - state.wave.enemiesSpawned),
    spawned: state.wave.enemiesSpawned,
    living: state.zombies.length,
  };
}

export function registerRequiredWaveBoss(state: GameState): void {
  state.wave.requiredBossesRemaining += 1;
}

export function resolveRequiredWaveBoss(state: GameState): boolean {
  if (state.wave.requiredBossesRemaining <= 0) return false;
  state.wave.requiredBossesRemaining -= 1;
  return true;
}

function resolveStandardAttributeId(attribute: RunStatAttribute): StandardAttributeId {
  return attribute === 'shotsPerSecond' ? 'fireRate' : attribute;
}

function syncRunProgressionState(state: GameState): void {
  if (!state.progression) {
    state.progression = createRunProgressionState();
  }

  state.progression.standard.earned = state.statistics.standardCurrency?.earned ?? state.progression.standard.earned;
  state.progression.standard.available = state.statistics.standardCurrency?.available ?? state.progression.standard.available;
  state.progression.standard.spent = state.statistics.standardCurrency?.spent ?? state.progression.standard.spent;

  state.progression.rare.earned = state.statistics.rareCurrency?.earned ?? state.progression.rare.earned;
  state.progression.rare.available = state.statistics.rareCurrency?.available ?? state.progression.rare.available;
  state.progression.rare.spent = state.statistics.rareCurrency?.spent ?? state.progression.rare.spent;

  state.statistics.standardCurrency = { ...state.progression.standard };
  state.statistics.rareCurrency = { ...state.progression.rare };
  state.statistics.standardAttributeLevels = {
    ...state.progression.standardAttributeLevels,
  };
  state.statistics.standardAttributeCosts = {
    ...state.progression.standardAttributeCosts,
  };
  state.statistics.rareUpgradeLevels = {
    ...state.progression.rareUpgradeLevels,
  };
  state.statistics.rareUpgradeCosts = {
    ...state.progression.rareUpgradeCosts,
  };
  state.statistics.rareUpgradeUnlocked = {
    ...state.progression.rareUpgradeUnlocked,
  };
  state.statistics.upgradePoints = state.progression.standard.available;
}

export function completeWaveIfCleared(state: GameState): boolean {
  const accounting = getWaveSpawnAccounting(state);
  if (
    state.wave.phase !== 'combat' ||
    !state.player.alive ||
    state.player.health <= 0 ||
    accounting.queued > 0 ||
    accounting.spawned < accounting.scheduled ||
    accounting.living > 0 ||
    state.wave.requiredBossesRemaining > 0
  ) {
    return false;
  }

  const clearedWave = state.wave.currentWave;
  state.projectiles = [];
  state.statistics.highestWaveCleared = Math.max(
    state.statistics.highestWaveCleared,
    clearedWave,
  );

  if (!state.progression) {
    state.progression = createRunProgressionState();
  }
  const awarded = awardStandardWavePoint(
    state.progression,
    `wave-clear:${clearedWave}`,
    state.gameMode === 'dev'
      ? 1
      : state.gameMode === 'level' && !state.levelCompletionRewardEligible
        ? 0
        : STANDARD_POINTS_PER_CLEAR,
  );
  if (awarded) {
    state.statistics.upgradePoints = state.progression.standard.available;
    state.statistics.standardCurrency = { ...state.progression.standard };
  }
  if (
    state.gameMode !== 'dev' &&
    Math.random() < LAST_ENEMY_RARE_POINT_CHANCE &&
    awardRareReward(
      state.progression,
      `last-enemy-rare-point:${clearedWave}`,
      1,
    )
  ) {
    state.statistics.rareCurrency = { ...state.progression.rare };
  }
  const rareMilestoneReward = WAVE_MILESTONE_RARE_POINT_REWARDS[clearedWave];
  if (
    rareMilestoneReward &&
    awardRareReward(
      state.progression,
      `wave-milestone:${clearedWave}`,
      rareMilestoneReward,
    )
  ) {
    state.statistics.rareCurrency = { ...state.progression.rare };
  }
  if (clearedWave >= 5) {
    state.progression.rareUpgradeUnlocked.piercingRounds = true;
  }
  if (clearedWave >= 10) {
    state.progression.rareUpgradeUnlocked.secondWind = true;
  }
  state.statistics.rareUpgradeUnlocked = {
    ...state.progression.rareUpgradeUnlocked,
  };

  if (state.gameMode === 'level') {
    state.wave.phase = 'levelComplete';
    state.wave.transitionCountdownSeconds = 0;
    state.wave.announcement = 'LEVEL COMPLETE';
    state.wave.announcementSeconds = 4;
    return true;
  }

  const nextWave = clearedWave + 1;
  state.arenaTransitionFrom = {
    obstacles: state.arenaObstacles.map((obstacle) => ({ ...obstacle })),
    barrels: state.barrels.map((barrel) => ({ ...barrel })),
    theme: state.arenaTheme,
  };
  state.wave.currentWave = nextWave;
  state.wave.pendingWaveNumber = nextWave;
  state.wave.phase = 'intermission';
  state.wave.transitionCountdownSeconds = ARENA_TRANSITION_SECONDS;
  state.wave.announcement = 'NEW ARENA';
  state.wave.announcementSeconds = ARENA_TRANSITION_SECONDS;
  prepareArenaForWave(state, nextWave, state.wave.lastArenaLayoutId);
  return true;
}

export function adjustRunStat(
  state: GameState,
  attribute: RunStatAttribute,
  adjustment: -1 | 1,
): void {
  if (state.wave.phase !== 'combat') {
    throw new RangeError('Stats can only be adjusted during an active run.');
  }

  if (!state.progression) {
    state.progression = createRunProgressionState();
  }

  state.statistics.standardCurrency = { ...state.progression.standard };

  const standardAttribute = resolveStandardAttributeId(attribute);
  const option = getRunStatOptions(
    state.player,
    state.progression.standardAttributeLevels,
  ).find(
    (candidate) => candidate.attribute === attribute,
  );

  if (adjustment === 1) {
    if (!option) {
      throw new RangeError('Unknown stat attribute.');
    }

    const cost = getNormalAttributeCost(
      standardAttribute,
      state.progression.standardAttributeLevels[standardAttribute] ?? 0,
      STANDARD_ATTRIBUTE_DEFINITIONS[standardAttribute],
    );
    if (state.progression.standard.available < cost) {
      throw new RangeError('Earn a stat point before increasing a stat.');
    }

    if (!buyNormalAttribute(state.progression, standardAttribute, cost)) {
      throw new RangeError('That stat cannot be increased right now.');
    }

    applyStatValue(state, attribute, option.newValue);
    state.statistics.upgradePoints = state.progression.standard.available;
    state.statistics.standardCurrency = { ...state.progression.standard };
    state.statistics.standardAttributeLevels = {
      ...state.progression.standardAttributeLevels,
    };
    state.statistics.standardAttributeCosts = {
      ...state.progression.standardAttributeCosts,
    };
    state.statistics.statAllocations[attribute] =
      state.progression.standardAttributeLevels[standardAttribute] ?? 0;
    state.statistics.upgradesSelected += 1;
    return;
  }

  if ((state.progression.standardAttributeLevels[standardAttribute] ?? 0) < 1) {
    throw new RangeError('No stat point is allocated to that stat.');
  }

  const refundSucceeded = refundNormalAttribute(
    state.progression,
    standardAttribute,
  );
  if (!refundSucceeded) {
    throw new RangeError('No stat point is allocated to that stat.');
  }

  const nextLevel = (state.progression.standardAttributeLevels[standardAttribute] ?? 0);
  applyStatValue(
    state,
    attribute,
    getNormalAttributeValue(
      standardAttribute,
      {
        damage: PLAYER_CONFIG.startingDamage,
        shotsPerSecond: PLAYER_CONFIG.startingShotsPerSecond,
        maxHealth: PLAYER_STARTING_MAX_HEALTH,
        movementSpeed: PLAYER_CONFIG.movementSpeed,
      }[attribute],
      nextLevel,
    ),
  );

  state.statistics.upgradePoints = state.progression.standard.available;
  state.statistics.standardCurrency = { ...state.progression.standard };
  state.statistics.standardAttributeLevels = {
    ...state.progression.standardAttributeLevels,
  };
  state.statistics.standardAttributeCosts = {
    ...state.progression.standardAttributeCosts,
  };
  state.statistics.statAllocations[attribute] = nextLevel;
}

export function adjustRareUpgrade(
  state: GameState,
  upgradeId: RareUpgradeId,
  adjustment: -1 | 1,
): void {
  if (state.wave.phase !== 'combat') {
    throw new RangeError('Rare upgrades can only be adjusted during an active run.');
  }
  if (!state.progression) {
    state.progression = createRunProgressionState();
  }

  const succeeded = adjustment === 1
    ? buyRareUpgrade(state.progression, upgradeId)
    : refundRareUpgrade(state.progression, upgradeId);
  if (!succeeded) {
    throw new RangeError(
      adjustment === 1
        ? 'That rare upgrade is locked, unaffordable, or already at its maximum level.'
        : 'That rare upgrade cannot be refunded.',
    );
  }

  if (adjustment === 1) {
    state.statistics.upgradesSelected += 1;
  }
  state.statistics.rareCurrency = { ...state.progression.rare };
  state.statistics.rareUpgradeLevels = {
    ...state.progression.rareUpgradeLevels,
  };
  state.statistics.rareUpgradeCosts = {
    ...state.progression.rareUpgradeCosts,
  };
  state.statistics.rareUpgradeUnlocked = {
    ...state.progression.rareUpgradeUnlocked,
  };
}

function applyStatValue(
  state: GameState,
  attribute: RunStatAttribute,
  value: number,
): void {
  switch (attribute) {
    case 'damage':
      state.player.damage = value;
      state.statistics.highestDamage = Math.max(
        state.statistics.highestDamage,
        state.player.damage,
      );
      break;
    case 'shotsPerSecond':
      state.player.shotsPerSecond = value;
      state.statistics.highestShotsPerSecond = Math.max(
        state.statistics.highestShotsPerSecond,
        state.player.shotsPerSecond,
      );
      break;
    case 'maxHealth':
      state.player.maxHealth = value;
      state.player.health = Math.min(state.player.health, value);
      break;
    case 'movementSpeed':
      state.player.movementSpeed = value;
      break;
  }
}
