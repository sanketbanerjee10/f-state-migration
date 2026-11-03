import {
  circleOverlapsRectangle,
  getArenaObstacles,
} from '../core/ArenaGeometry';
import type { GameState, ZombieType } from '../core/GameState';
import { GAME_VISUAL_CONFIG } from '../rendering/VisualConfig';
import { getArenaCollisionObstacles } from '../arena/ArenaSystem';

export const WAVE_SPAWN_CONFIG = {
  maximumActiveEnemies: 36,
  minimumPlayerDistance: 120,
  enemySpacing: 8,
} as const;

const SPAWN_FRACTIONS: readonly number[] = [
  0.1,
  0.24,
  0.38,
  0.5,
  0.62,
  0.76,
  0.9,
];

type ZombieRadiusKey =
  | 'walkerRadius'
  | 'runnerRadius'
  | 'bruteRadius'
  | 'spitterRadius'
  | 'swarmRadius'
  | 'armouredRadius'
  | 'screamerRadius'
  | 'bloaterRadius'
  | 'splitterRadius';

const ZOMBIE_RADIUS_KEYS: Record<ZombieType, ZombieRadiusKey> = {
  walker: 'walkerRadius',
  runner: 'runnerRadius',
  brute: 'bruteRadius',
  spitter: 'spitterRadius',
  swarm: 'swarmRadius',
  armoured: 'armouredRadius',
  screamer: 'screamerRadius',
  bloater: 'bloaterRadius',
  splitter: 'splitterRadius',
};

function getZombieRadius(type: ZombieType): number {
  return GAME_VISUAL_CONFIG.entity[ZOMBIE_RADIUS_KEYS[type]];
}

interface SpawnCandidate {
  readonly index: number;
  readonly x: number;
  readonly y: number;
}

function getSpawnCandidates(
  state: GameState,
  radius: number,
): SpawnCandidate[] {
  const inset = radius + 8;
  const candidates: SpawnCandidate[] = [];

  for (const fraction of SPAWN_FRACTIONS) {
    const y = Math.max(
      inset,
      Math.min(state.arenaHeight - inset, state.arenaHeight * fraction),
    );
    candidates.push(
      { index: candidates.length, x: inset, y },
      { index: candidates.length + 1, x: state.arenaWidth - inset, y },
    );
  }
  for (const fraction of SPAWN_FRACTIONS) {
    const x = Math.max(
      inset,
      Math.min(state.arenaWidth - inset, state.arenaWidth * fraction),
    );
    candidates.push(
      { index: candidates.length, x, y: inset },
      { index: candidates.length + 1, x, y: state.arenaHeight - inset },
    );
  }
  return candidates;
}

export function isValidSpawnPosition(
  state: GameState,
  position: { readonly x: number; readonly y: number },
  radius: number,
): boolean {
  if (
    !Number.isFinite(position.x) ||
    !Number.isFinite(position.y) ||
    position.x < radius ||
    position.y < radius ||
    position.x > state.arenaWidth - radius ||
    position.y > state.arenaHeight - radius ||
    Math.hypot(position.x - state.player.x, position.y - state.player.y) <
      WAVE_SPAWN_CONFIG.minimumPlayerDistance + radius
  ) {
    return false;
  }

  if (
    getArenaObstacles(
      state.arenaWidth,
      state.arenaHeight,
      getArenaCollisionObstacles(state.arenaObstacles, state.barrels),
    ).some((obstacle) =>
      circleOverlapsRectangle(position, radius, obstacle),
    )
  ) {
    return false;
  }

  return state.zombies.every((zombie) =>
    Math.hypot(position.x - zombie.x, position.y - zombie.y) >=
      radius + zombie.radius + WAVE_SPAWN_CONFIG.enemySpacing,
  );
}

export function createValidSpawnPosition(
  state: GameState,
  type: ZombieType,
  radius = getZombieRadius(type),
): { readonly x: number; readonly y: number; readonly candidateIndex: number } | undefined {
  const candidates = getSpawnCandidates(state, radius).filter((candidate) =>
    isValidSpawnPosition(state, candidate, radius),
  );
  if (candidates.length === 0) return undefined;

  const withoutPrevious = candidates.filter(
    (candidate) => candidate.index !== state.wave.lastSpawnCandidateIndex,
  );
  const available = withoutPrevious.length > 0 ? withoutPrevious : candidates;
  const selected = available[Math.floor(Math.random() * available.length)];
  return {
    x: selected.x,
    y: selected.y,
    candidateIndex: selected.index,
  };
}
