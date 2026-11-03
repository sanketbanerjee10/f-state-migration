export const GAME_VIEWPORT = {
  width: 960,
  height: 540,
} as const;

export interface ArenaObstacle {
  readonly xFraction: number;
  readonly yFraction: number;
  readonly width: number;
  readonly height: number;
  readonly kind: 'crate' | 'barricade' | 'wall' | 'cover' | 'barrel';
}

export const ARENA_OBSTACLES: readonly ArenaObstacle[] = [
  { xFraction: 0.24, yFraction: 0.34, width: 58, height: 48, kind: 'crate' },
  { xFraction: 0.73, yFraction: 0.67, width: 66, height: 54, kind: 'crate' },
  { xFraction: 0.73, yFraction: 0.3, width: 92, height: 24, kind: 'barricade' },
  { xFraction: 0.3, yFraction: 0.72, width: 82, height: 24, kind: 'barricade' },
  { xFraction: 0.42, yFraction: 0.55, width: 46, height: 20, kind: 'wall' },
  { xFraction: 0.58, yFraction: 0.45, width: 46, height: 20, kind: 'cover' },
];

export const MAX_DEVICE_PIXEL_RATIO = 2;
export const MAX_FRAME_DELTA_SECONDS = 0.05;
export const PLAYER_MOVEMENT_SPEED = 240;
export const PLAYER_STARTING_DAMAGE = 25;
export const PLAYER_STARTING_SHOTS_PER_SECOND = 2.5;
export const WAVE_ONE_ENEMY_BUDGET = 61;

export const GAME_SCORING_CONFIG = {
  walkerKillPoints: 100,
  runnerKillPoints: 150,
  eliteKillBonus: 500,
  bossKillBonus: 10_000,
  waveClearPoints: 250,
} as const;
