import { ARENA_OBSTACLES, type ArenaObstacle } from '../core/GameConfig';

export interface ArenaObstacleEntity extends ArenaObstacle {
  health?: number;
  readonly maxHealth?: number;
}

export interface ExplosiveBarrelEntity {
  readonly id: string;
  readonly xFraction: number;
  readonly yFraction: number;
  readonly radius: number;
  health: number;
  readonly maxHealth: number;
}

export type ArenaThemeId =
  | 'military'
  | 'industrial'
  | 'contaminated'
  | 'urban'
  | 'bunker';

export interface ArenaTheme {
  readonly id: ArenaThemeId;
  readonly floor: string;
  readonly grid: string;
  readonly boundary: string;
  readonly innerBoundary: string;
  readonly marking: string;
  readonly accent: string;
}

export const ARENA_THEME_CYCLE: readonly ArenaTheme[] = [
  {
    id: 'military',
    floor: '#142328',
    grid: 'rgba(157, 191, 173, 0.055)',
    boundary: '#42636a',
    innerBoundary: 'rgba(7, 17, 20, 0.62)',
    marking: 'rgba(164, 185, 181, 0.1)',
    accent: '#819a99',
  },
  {
    id: 'industrial',
    floor: '#202321',
    grid: 'rgba(198, 169, 119, 0.07)',
    boundary: '#77664d',
    innerBoundary: 'rgba(12, 14, 13, 0.68)',
    marking: 'rgba(214, 183, 127, 0.14)',
    accent: '#d6b77f',
  },
  {
    id: 'contaminated',
    floor: '#1b251e',
    grid: 'rgba(155, 190, 113, 0.065)',
    boundary: '#617b55',
    innerBoundary: 'rgba(8, 17, 10, 0.66)',
    marking: 'rgba(163, 195, 115, 0.12)',
    accent: '#a3c373',
  },
  {
    id: 'urban',
    floor: '#252324',
    grid: 'rgba(188, 156, 148, 0.06)',
    boundary: '#765b58',
    innerBoundary: 'rgba(16, 11, 12, 0.66)',
    marking: 'rgba(208, 164, 153, 0.12)',
    accent: '#c99486',
  },
  {
    id: 'bunker',
    floor: '#1b2229',
    grid: 'rgba(135, 168, 188, 0.065)',
    boundary: '#536b7d',
    innerBoundary: 'rgba(8, 12, 17, 0.68)',
    marking: 'rgba(142, 175, 194, 0.12)',
    accent: '#8eafc2',
  },
];

export const ARENA_INTERACTION_CONFIG = {
  barricadeHealth: 180,
  barrelHealth: 80,
  barrelRadius: 16,
  barrelExplosionRadius: 112,
  barrelExplosionDamage: 72,
  barrelExplosionDamagesPlayer: true,
  barrelExplosionDamagesEnemies: true,
} as const;

export function getArenaTheme(waveNumber: number): ArenaTheme {
  if (!Number.isInteger(waveNumber) || waveNumber < 1) {
    throw new RangeError('Wave number must be a positive integer.');
  }
  const themeIndex = Math.floor(waveNumber / 10) % ARENA_THEME_CYCLE.length;
  return ARENA_THEME_CYCLE[themeIndex]!;
}

export function createArenaObstacles(): ArenaObstacleEntity[] {
  return ARENA_OBSTACLES.map((obstacle) =>
    obstacle.kind === 'barricade'
      ? {
          ...obstacle,
          health: ARENA_INTERACTION_CONFIG.barricadeHealth,
          maxHealth: ARENA_INTERACTION_CONFIG.barricadeHealth,
        }
      : { ...obstacle },
  );
}

export function createExplosiveBarrels(): ExplosiveBarrelEntity[] {
  return [
    { id: 'north-west-barrel', xFraction: 0.5, yFraction: 0.18 },
    { id: 'north-east-barrel', xFraction: 0.61, yFraction: 0.18 },
  ].map((barrel) => ({
    ...barrel,
    radius: ARENA_INTERACTION_CONFIG.barrelRadius,
    health: ARENA_INTERACTION_CONFIG.barrelHealth,
    maxHealth: ARENA_INTERACTION_CONFIG.barrelHealth,
  }));
}

export function getArenaCollisionObstacles(
  obstacles: readonly ArenaObstacleEntity[],
  barrels: readonly ExplosiveBarrelEntity[],
): ArenaObstacle[] {
  return [
    ...obstacles.filter((obstacle) =>
      obstacle.health === undefined || obstacle.health > 0,
    ),
    ...barrels
      .filter((barrel) => barrel.health > 0)
      .map((barrel): ArenaObstacle => ({
        xFraction: barrel.xFraction,
        yFraction: barrel.yFraction,
        width: barrel.radius * 2,
        height: barrel.radius * 2,
        kind: 'barrel',
      })),
  ];
}
