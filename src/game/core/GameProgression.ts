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
import { getArenaTheme } from '../arena/ArenaSystem';
import {
  PLAYER_MOVEMENT_SPEED,
  PLAYER_STARTING_DAMAGE,
  PLAYER_STARTING_SHOTS_PER_SECOND,
  WAVE_ONE_ENEMY_BUDGET,
} from './GameConfig';
import type {
  GameItemType,
} from './GameState';
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
  STANDARD_ATTRIBUTE_DEFINITIONS,
  type StandardAttributeId,
  type RareUpgradeId,
} from '../upgrades/ProgressionSystem';
import {
  getWaveModifierForWave,
  WAVE_MODIFIER_CONFIG,
  type WaveModifierId,
} from '../modifiers/WaveModifiers';

export const GAME_PROGRESSION_CONFIG = {
  baseEnemyBudget: WAVE_ONE_ENEMY_BUDGET,
  baseSpawnDurationSeconds: 60,
  additionalSpawnDurationPerWaveSeconds: 10,
  baseSpawnIntervalSeconds: 1,
  spawnIntervalDecreasePerWaveSeconds: 0.02,
  minimumSpawnIntervalSeconds: 0.5,
  itemLifetimeSeconds: 12,
  maximumActiveItems: 3,
  maximumBombInventory: 5,
  maximumTurretInventory: 5,
  killsPerOrbDrop: 2,
  orbPickupRadius: 28,
  healthOrbRestore: 25,
  damageEffectSeconds: 10,
  rapidFireEffectSeconds: 8,
  shieldEffectSeconds: 12,
  shieldAmount: 60,
  bombRadius: 175,
  bombDamage: 100,
  damageMultiplier: 2,
  rapidFireMultiplier: 2,
} as const;

export const WAVE_MILESTONE_RARE_POINT_REWARDS: Readonly<Record<number, number>> = {
  20: 1,
  30: 1,
  40: 1,
};

export const ORB_DROP_SEQUENCE: readonly GameItemType[] = [
  'health',
  'damage',
  'rapidFire',
  'shield',
  'bomb',
  'magnet',
  'turret',
  'cursed',
];

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
  return Math.ceil(targetSpawnDuration / getWaveSpawnInterval(waveNumber)) + 1;
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

export function startWave(state: GameState, waveNumber: number): void {
  state.wave.currentWave = waveNumber;
  state.wave.activeModifier = getWaveModifierForWave(waveNumber);
  state.arenaTheme = getArenaTheme(waveNumber).id;
  state.wave.phase = 'combat';
  state.wave.enemyBudget = getWaveEnemyBudget(waveNumber, state.gameMode);
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
  state.wave.announcement = `Wave ${waveNumber}`;
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
  const awarded = awardStandardWavePoint(state.progression, `wave-clear:${clearedWave}`);
  if (awarded) {
    state.statistics.upgradePoints = state.progression.standard.available;
    state.statistics.standardCurrency = { ...state.progression.standard };
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

  startWave(state, clearedWave + 1);
  state.wave.announcement =
    `Wave ${clearedWave} complete - Wave ${state.wave.currentWave} starting (+1 stat point)`;
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
        damage: PLAYER_STARTING_DAMAGE,
        shotsPerSecond: PLAYER_STARTING_SHOTS_PER_SECOND,
        maxHealth: PLAYER_STARTING_MAX_HEALTH,
        movementSpeed: PLAYER_MOVEMENT_SPEED,
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
