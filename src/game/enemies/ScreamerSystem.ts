import {
  createZombie,
  type GameState,
  type ZombieEntity,
} from '../core/GameState';
import {
  createValidSpawnPosition,
  WAVE_SPAWN_CONFIG,
} from '../waves/SpawnSystem';
import { SCREAMER_CONFIG } from '../core/GameConfig';

export { SCREAMER_CONFIG } from '../core/GameConfig';

function spawnScreamerSupport(
  state: GameState,
  screamer: ZombieEntity,
): boolean {
  const activeSummons = state.zombies.filter(
    (zombie) => zombie.screamerSummonedBy === screamer.id,
  ).length;
  if (
    state.zombies.length >= WAVE_SPAWN_CONFIG.maximumActiveEnemies ||
    activeSummons >= SCREAMER_CONFIG.maximumActiveSummons
  ) {
    return false;
  }

  const position = createValidSpawnPosition(state, 'walker');
  if (!position) return false;

  const zombie = createZombie(
    state.nextEntityId++,
    'walker',
    position.x,
    position.y,
    state.wave.currentWave,
  );
  zombie.screamerSummonedBy = screamer.id;
  state.zombies.push(zombie);
  return true;
}

export function updateScreamerAbilities(
  state: GameState,
  deltaSeconds: number,
): void {
  for (const screamer of [...state.zombies]) {
    if (screamer.type !== 'screamer' || screamer.isBoss) continue;

    screamer.specialCooldownSeconds = Math.max(
      0,
      (screamer.specialCooldownSeconds ?? 0) - deltaSeconds,
    );
    if (screamer.specialCooldownSeconds > 0) continue;

    if (spawnScreamerSupport(state, screamer)) {
      screamer.specialCooldownSeconds = SCREAMER_CONFIG.summonIntervalSeconds;
      state.impacts.push({
        id: state.nextEntityId++,
        x: screamer.x,
        y: screamer.y,
        durationSeconds: 0.45,
        remainingSeconds: 0.45,
        kind: 'telegraph',
        critical: false,
        shieldAbsorbed: false,
        color: '#FFE6A8',
        radius: screamer.radius + 20,
      });
    } else {
      screamer.specialCooldownSeconds = SCREAMER_CONFIG.retryIntervalSeconds;
    }
  }
}
