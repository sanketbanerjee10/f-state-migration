import {
  circleOverlapsRectangle,
  getArenaObstacles,
  findCirclePositionInArena,
} from './ArenaGeometry';
import { createZombie, getUpgradeOffers } from './GameState';
import { WAVE_ONE_ENEMY_BUDGET } from './GameConfig';
import type {
  GameItemType,
  GameState,
  RunUpgradeAttribute,
  UpgradeOffer,
  ZombieType,
} from './GameState';

export const GAME_PROGRESSION_CONFIG = {
  baseEnemyBudget: WAVE_ONE_ENEMY_BUDGET,
  additionalEnemiesPerWave: 2,
  maximumEnemyBudget: 24,
  baseSpawnIntervalSeconds: 0.9,
  minimumSpawnIntervalSeconds: 0.42,
  spawnIntervalReductionPerWave: 0.045,
  intermissionSeconds: 8,
  itemLifetimeSeconds: 12,
  maximumActiveItems: 3,
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

export const ORB_DROP_SEQUENCE: readonly GameItemType[] = [
  'health',
  'damage',
  'rapidFire',
  'shield',
  'bomb',
];

const SPAWN_FRACTIONS: readonly number[] = [
  0.1,
  0.24,
  0.38,
  0.5,
  0.62,
  0.76,
  0.9,
];

export function getWaveEnemyBudget(waveNumber: number): number {
  return Math.min(
    GAME_PROGRESSION_CONFIG.maximumEnemyBudget,
    GAME_PROGRESSION_CONFIG.baseEnemyBudget +
      (waveNumber - 1) * GAME_PROGRESSION_CONFIG.additionalEnemiesPerWave,
  );
}

export function getWaveSpawnInterval(waveNumber: number): number {
  return Math.max(
    GAME_PROGRESSION_CONFIG.minimumSpawnIntervalSeconds,
    GAME_PROGRESSION_CONFIG.baseSpawnIntervalSeconds -
      (waveNumber - 1) * GAME_PROGRESSION_CONFIG.spawnIntervalReductionPerWave,
  );
}

function getSpawnCandidates(state: GameState): readonly { x: number; y: number }[] {
  const radius = 15;
  const xInset = radius + 8;
  const yInset = radius + 8;
  const candidates: { x: number; y: number }[] = [];

  for (const fraction of SPAWN_FRACTIONS) {
    const y = Math.max(
      yInset,
      Math.min(state.arenaHeight - yInset, state.arenaHeight * fraction),
    );
    candidates.push(
      { x: xInset, y },
      { x: state.arenaWidth - xInset, y },
    );
  }
  for (const fraction of SPAWN_FRACTIONS) {
    const x = Math.max(
      xInset,
      Math.min(state.arenaWidth - xInset, state.arenaWidth * fraction),
    );
    candidates.push(
      { x, y: yInset },
      { x, y: state.arenaHeight - yInset },
    );
  }

  const obstacles = getArenaObstacles(state.arenaWidth, state.arenaHeight);
  return candidates.filter((candidate) =>
    !obstacles.some((obstacle) =>
      circleOverlapsRectangle(candidate, radius, obstacle),
    ) &&
    !state.zombies.some(
      (zombie) =>
        Math.hypot(candidate.x - zombie.x, candidate.y - zombie.y) <
        radius + zombie.radius + 8,
    ),
  );
}

function createSpawnPosition(state: GameState): { x: number; y: number } {
  const candidates = getSpawnCandidates(state);
  if (candidates.length === 0) {
    return findCirclePositionInArena(
      { x: state.arenaWidth / 2, y: state.arenaHeight / 2 },
      15,
      state.arenaWidth,
      state.arenaHeight,
    );
  }
  const offset = (state.wave.enemiesSpawned + state.wave.currentWave) % candidates.length;
  const ordered = [
    ...candidates.slice(offset),
    ...candidates.slice(0, offset),
  ];
  ordered.sort((left, right) =>
    Math.hypot(
      right.x - state.player.x,
      right.y - state.player.y,
    ) -
    Math.hypot(
      left.x - state.player.x,
      left.y - state.player.y,
    ),
  );
  return ordered[0];
}

function spawnWaveEnemy(state: GameState): void {
  const spawnIndex = state.wave.enemiesSpawned;
  const isRunner = state.wave.currentWave === 1
    ? spawnIndex % 2 === 1
    : (spawnIndex + state.wave.currentWave) % 3 === 0;
  const type: ZombieType = isRunner ? 'runner' : 'walker';
  const position = createSpawnPosition(state);
  state.zombies.push(
    createZombie(
      state.nextEntityId++,
      type,
      position.x,
      position.y,
      state.wave.currentWave,
    ),
  );
  state.wave.enemiesSpawned += 1;
}

export function startWave(state: GameState, waveNumber: number): void {
  state.wave.currentWave = waveNumber;
  state.wave.phase = 'combat';
  state.wave.enemyBudget = getWaveEnemyBudget(waveNumber);
  state.wave.enemiesSpawned = 0;
  state.wave.spawnCooldownSeconds = 0;
  state.wave.intermissionSeconds = 0;
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

  if (state.wave.phase === 'intermission') {
    state.wave.intermissionSeconds = Math.max(
      0,
      state.wave.intermissionSeconds - deltaSeconds,
    );
    if (state.wave.intermissionSeconds === 0) {
      startWave(state, state.wave.currentWave + 1);
    }
    return;
  }
  if (state.wave.phase !== 'combat') return;

  state.wave.spawnCooldownSeconds -= deltaSeconds;
  if (
    state.wave.enemiesSpawned < state.wave.enemyBudget &&
    state.wave.spawnCooldownSeconds <= 0
  ) {
    spawnWaveEnemy(state);
    state.wave.spawnCooldownSeconds = getWaveSpawnInterval(
      state.wave.currentWave,
    );
  }
}

export function completeWaveIfCleared(state: GameState): boolean {
  if (
    state.wave.phase !== 'combat' ||
    state.wave.enemiesSpawned < state.wave.enemyBudget ||
    state.zombies.length > 0
  ) {
    return false;
  }

  state.wave.phase = 'upgrade';
  state.wave.intermissionSeconds = 0;
  state.wave.announcement = `Wave ${state.wave.currentWave} cleared`;
  state.wave.announcementSeconds = 3;
  state.projectiles = [];
  state.statistics.highestWaveCleared = Math.max(
    state.statistics.highestWaveCleared,
    state.wave.currentWave,
  );
  return true;
}

export function selectRunUpgrade(
  state: GameState,
  attribute: RunUpgradeAttribute,
): UpgradeOffer {
  const offer = getUpgradeOffers(state.player, state.wave.phase).find(
    (candidate) => candidate.attribute === attribute,
  );
  if (!offer) {
    throw new RangeError('That upgrade is unavailable in the current game state.');
  }

  switch (attribute) {
    case 'damage':
      state.player.damage = offer.newValue;
      state.statistics.highestDamage = Math.max(
        state.statistics.highestDamage,
        state.player.damage,
      );
      break;
    case 'shotsPerSecond':
      state.player.shotsPerSecond = offer.newValue;
      state.statistics.highestShotsPerSecond = Math.max(
        state.statistics.highestShotsPerSecond,
        state.player.shotsPerSecond,
      );
      break;
    case 'maxHealth':
      state.player.maxHealth = offer.newValue;
      state.player.health = Math.min(
        state.player.maxHealth,
        state.player.health + offer.newValue - offer.currentValue,
      );
      break;
    case 'movementSpeed':
      state.player.movementSpeed = offer.newValue;
      break;
  }

  state.statistics.upgradesSelected += 1;
  state.wave.phase = 'intermission';
  state.wave.intermissionSeconds = GAME_PROGRESSION_CONFIG.intermissionSeconds;
  state.wave.announcement = `${offer.label} upgraded`;
  state.wave.announcementSeconds = 3;
  return offer;
}

export function confirmNextWave(state: GameState): void {
  if (state.wave.phase !== 'intermission') {
    throw new RangeError('Choose an upgrade before starting the next wave.');
  }
  startWave(state, state.wave.currentWave + 1);
}

export function skipCappedUpgrades(state: GameState): void {
  if (
    state.wave.phase !== 'upgrade' ||
    getUpgradeOffers(state.player, state.wave.phase).length > 0
  ) {
    throw new RangeError('An available upgrade must be chosen first.');
  }
  state.wave.phase = 'intermission';
  state.wave.intermissionSeconds = GAME_PROGRESSION_CONFIG.intermissionSeconds;
  state.wave.announcement = 'Upgrades maxed';
  state.wave.announcementSeconds = 3;
}
