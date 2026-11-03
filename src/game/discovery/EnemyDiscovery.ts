import type { ZombieType } from '@/game/core/GameState';

export const ENEMY_DISCOVERY_STORAGE_KEY = 'state-565.enemy-discoveries.v1';

export const ENEMY_DISCOVERY_LABELS: Record<ZombieType, string> = {
  walker: 'Walker',
  runner: 'Runner',
  brute: 'Brute',
  spitter: 'Spitter',
  swarm: 'Swarm',
  armoured: 'Armoured',
  screamer: 'Screamer',
  bloater: 'Bloater',
  splitter: 'Splitter',
};

export const ENEMY_GUIDE_DETAILS: Readonly<Record<ZombieType, {
  readonly description: string;
  readonly ability: string;
}>> = {
  walker: {
    description: 'A slow, steady pursuer that closes in and attacks at close range.',
    ability: 'No special attack. Keep moving so the horde cannot surround you.',
  },
  runner: {
    description: 'A fragile but fast zombie that can quickly catch a drifting survivor.',
    ability: 'After 6 seconds at normal speed, dashes at twice its base speed for 2 seconds. It gives no visible warning before charging.',
  },
  brute: {
    description: 'A slow, heavily built zombie with more health and a punishing melee hit.',
    ability: 'Heavy contact damage. Avoid letting it reach you.',
  },
  spitter: {
    description: 'A ranged attacker that tries to hold its ground away from you.',
    ability: 'Fires a fast acid projectile when you are within range.',
  },
  swarm: {
    description: 'Small, quick zombies that are easy to overlook in a crowded arena.',
    ability: 'Moves faster than a Runner and dodges incoming shots at double speed, with a 3-second cooldown. After each dodge, it slows to half speed and recovers to normal over 2 seconds.',
  },
  armoured: {
    description: 'A durable zombie that reduces the damage it deals when facing you.',
    ability: 'Deals less contact damage when its front faces you; avoid direct approaches.',
  },
  screamer: {
    description: 'A persistent pursuer that is most dangerous when the arena is crowded.',
    ability: 'Calls one walker reinforcement at a time; the Horde Caller summons twice as many.',
  },
  bloater: {
    description: 'A slow, tough zombie that leaves a dangerous parting gift.',
    ability: 'Bursts into a damaging acid hazard when defeated.',
  },
  splitter: {
    description: 'A tricky zombie that turns one threat into several.',
    ability: 'Splits into four smaller Swarm zombies when defeated.',
  },
};

export const ENEMY_DISCOVERY_TYPES: readonly ZombieType[] =
  Object.keys(ENEMY_DISCOVERY_LABELS) as ZombieType[];

function isZombieType(value: unknown): value is ZombieType {
  return typeof value === 'string' &&
    ENEMY_DISCOVERY_TYPES.includes(value as ZombieType);
}

export function getEnemyDisplayName(type: ZombieType): string {
  return ENEMY_DISCOVERY_LABELS[type];
}

export function getEnemyDiscoveryStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readDiscoveredEnemies(storage: Storage | null | undefined): Set<ZombieType> {
  if (!storage) return new Set();

  try {
    const rawValue = storage.getItem(ENEMY_DISCOVERY_STORAGE_KEY);
    if (!rawValue) return new Set();

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return new Set();

    return new Set(
      parsed.filter(isZombieType) as ZombieType[],
    );
  } catch {
    return new Set();
  }
}

export function writeDiscoveredEnemies(
  storage: Storage | null | undefined,
  discovered: Iterable<ZombieType>,
): void {
  if (!storage) return;

  try {
    const ordered = [...new Set(discovered)] as ZombieType[];
    storage.setItem(ENEMY_DISCOVERY_STORAGE_KEY, JSON.stringify(ordered));
  } catch {
    // Storage failures should never interrupt gameplay.
  }
}

export function recordEnemyDiscovery(
  storage: Storage | null | undefined,
  enemyTypes: Iterable<ZombieType>,
): ZombieType[] {
  const discovered = readDiscoveredEnemies(storage);
  const newlyDiscovered: ZombieType[] = [];

  for (const enemyType of enemyTypes) {
    if (discovered.has(enemyType)) continue;
    discovered.add(enemyType);
    newlyDiscovered.push(enemyType);
  }

  if (newlyDiscovered.length > 0) {
    writeDiscoveredEnemies(storage, discovered);
  }

  return newlyDiscovered;
}

export function notifyNewEnemyDiscoveries(
  storage: Storage | null | undefined,
  enemyTypes: Iterable<ZombieType>,
  onDiscovered: (enemyType: ZombieType) => void,
): ZombieType[] {
  const newlyDiscovered = recordEnemyDiscovery(storage, enemyTypes);
  for (const enemyType of newlyDiscovered) {
    onDiscovered(enemyType);
  }
  return newlyDiscovered;
}
