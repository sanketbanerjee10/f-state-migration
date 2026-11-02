import {
  getArenaObstacles,
  moveCircleInArena,
  segmentIntersectsRectangle,
  findCirclePositionInArena,
  findNextPathWaypointInArena,
} from './ArenaGeometry';
import { GAME_VISUAL_CONFIG } from '../rendering/VisualConfig';
import { GAME_PALETTE } from '../rendering/GamePalette';
import {
  GAME_PROGRESSION_CONFIG,
  ORB_DROP_SEQUENCE,
  advanceWaveProgression,
  completeWaveIfCleared,
} from './GameProgression';
import {
  PLAYER_STARTING_DAMAGE,
  PLAYER_STARTING_SHOTS_PER_SECOND,
} from './GameConfig';
import type {
  ActiveTemporaryEffect,
  DamageNumberEntity,
  GameState,
  GameItemType,
  ImpactEffectEntity,
  ItemOrbEntity,
  ProjectileEntity,
  ZombieEntity,
} from './GameState';

export interface GameInputState {
  readonly movementX: number;
  readonly movementY: number;
  readonly aimAngle: number;
}

export const GAME_COMBAT_CONFIG = {
  projectileDamage: PLAYER_STARTING_DAMAGE,
  projectileSpeed: 560,
  projectileLifetimeSeconds: 1.5,
  shotsPerSecond: PLAYER_STARTING_SHOTS_PER_SECOND,
  playerHitCooldownSeconds: 0.65,
  zombieAttackCooldownSeconds: 0.8,
  impactDurationSeconds: 0.24,
  damageNumberDurationSeconds: 0.65,
  collectionEffectDurationSeconds: 0.36,
  muzzleFlashDurationSeconds: 0.075,
} as const;

function getEffect(
  state: GameState,
  type: ActiveTemporaryEffect['type'],
): ActiveTemporaryEffect | undefined {
  return state.activeEffects.find((effect) => effect.type === type);
}

function getProjectileDamage(state: GameState): number {
  return state.player.damage * (
    getEffect(state, 'damage')
      ? GAME_PROGRESSION_CONFIG.damageMultiplier
      : 1
  );
}

function getShotsPerSecond(state: GameState): number {
  return state.player.shotsPerSecond * (
    getEffect(state, 'rapidFire')
      ? GAME_PROGRESSION_CONFIG.rapidFireMultiplier
      : 1
  );
}

function updateShieldStrength(state: GameState): void {
  const shield = getEffect(state, 'shield');
  state.player.shieldStrength = shield?.remainingShield
    ? Math.min(1, shield.remainingShield / GAME_PROGRESSION_CONFIG.shieldAmount)
    : 0;
}

function spawnOrb(
  state: GameState,
  type: GameItemType,
  x: number,
  y: number,
): void {
  if (state.items.length >= GAME_PROGRESSION_CONFIG.maximumActiveItems) return;
  const radius = GAME_VISUAL_CONFIG.entity.orbRadius;
  const position = findCirclePositionInArena(
    { x, y },
    radius,
    state.arenaWidth,
    state.arenaHeight,
  );
  state.items.push({
    id: state.nextEntityId++,
    type,
    x: position.x,
    y: position.y,
    radius,
    durationSeconds: GAME_PROGRESSION_CONFIG.itemLifetimeSeconds,
    remainingSeconds: GAME_PROGRESSION_CONFIG.itemLifetimeSeconds,
  });
  state.impacts.push(createImpact(state, position.x, position.y, {
    kind: 'spawn',
    color: GAME_PALETTE.orbs[type],
    radius: 24,
  }));
}

function recordZombieKill(state: GameState, zombie: ZombieEntity): void {
  state.zombiesKilled += 1;
  state.statistics.zombiesKilled = state.zombiesKilled;
  if (zombie.type === 'walker') state.statistics.walkerKills += 1;
  else state.statistics.runnerKills += 1;

  if (
    state.zombiesKilled % GAME_PROGRESSION_CONFIG.killsPerOrbDrop === 0
  ) {
    const sequenceIndex =
      Math.floor(state.zombiesKilled / GAME_PROGRESSION_CONFIG.killsPerOrbDrop) - 1;
    const type =
      ORB_DROP_SEQUENCE[sequenceIndex % ORB_DROP_SEQUENCE.length];
    spawnOrb(state, type, zombie.x, zombie.y);
  }
}

function applyZombieDamage(
  state: GameState,
  zombie: ZombieEntity,
  damage: number,
): void {
  const damageDealt = Math.min(zombie.health, damage);
  zombie.health = Math.max(0, zombie.health - damage);
  zombie.hitFlashSeconds = 0.16;
  state.statistics.totalDamageDealt += damageDealt;
  state.impacts.push(createImpact(state, zombie.x, zombie.y, {
    critical: zombie.health === 0,
    kind: zombie.health === 0 ? 'death' : 'hit',
    ...(zombie.health === 0
      ? { color: GAME_PALETTE.enemies[zombie.type], radius: 28 }
      : {}),
  }));
  state.damageNumbers.push(
    createDamageNumber(state, zombie.x, zombie.y - zombie.radius, damageDealt),
  );

  if (zombie.health === 0) {
    const index = state.zombies.findIndex((candidate) => candidate.id === zombie.id);
    if (index >= 0) state.zombies.splice(index, 1);
    recordZombieKill(state, zombie);
  }
}

function collectOrb(
  state: GameState,
  type: GameItemType,
  x: number,
  y: number,
): void {
  const { player } = state;
  switch (type) {
    case 'health':
      player.health = Math.min(
        player.maxHealth,
        player.health + GAME_PROGRESSION_CONFIG.healthOrbRestore,
      );
      break;
    case 'damage':
    case 'rapidFire': {
      const durationSeconds = type === 'damage'
        ? GAME_PROGRESSION_CONFIG.damageEffectSeconds
        : GAME_PROGRESSION_CONFIG.rapidFireEffectSeconds;
      const existing = getEffect(state, type);
      if (existing) existing.remainingSeconds = durationSeconds;
      else {
        state.activeEffects.push({
          type,
          durationSeconds,
          remainingSeconds: durationSeconds,
        });
      }
      if (type === 'damage') {
        state.statistics.highestDamage = Math.max(
          state.statistics.highestDamage,
          getProjectileDamage(state),
        );
      } else {
        state.statistics.highestShotsPerSecond = Math.max(
          state.statistics.highestShotsPerSecond,
          getShotsPerSecond(state),
        );
      }
      break;
    }
    case 'shield': {
      const existing = getEffect(state, 'shield');
      if (existing) {
        existing.remainingSeconds = GAME_PROGRESSION_CONFIG.shieldEffectSeconds;
        existing.remainingShield = GAME_PROGRESSION_CONFIG.shieldAmount;
      } else {
        state.activeEffects.push({
          type,
          durationSeconds: GAME_PROGRESSION_CONFIG.shieldEffectSeconds,
          remainingSeconds: GAME_PROGRESSION_CONFIG.shieldEffectSeconds,
          remainingShield: GAME_PROGRESSION_CONFIG.shieldAmount,
        });
      }
      updateShieldStrength(state);
      break;
    }
    case 'bomb': {
      for (const zombie of [...state.zombies]) {
        const distance = Math.hypot(zombie.x - player.x, zombie.y - player.y);
        if (distance > GAME_PROGRESSION_CONFIG.bombRadius) continue;
        const blocked = getArenaObstacles(
          state.arenaWidth,
          state.arenaHeight,
        ).some((obstacle) =>
          segmentIntersectsRectangle(
            player,
            zombie,
            obstacle,
          ),
        );
        if (!blocked) {
          applyZombieDamage(
            state,
            zombie,
            GAME_PROGRESSION_CONFIG.bombDamage,
          );
        }
      }
      state.impacts.push(createImpact(state, player.x, player.y, {
        kind: 'bomb',
        critical: true,
        color: GAME_PALETTE.orbs.bomb,
        radius: GAME_PROGRESSION_CONFIG.bombRadius,
      }));
      break;
    }
  }
  state.statistics.orbsCollected += 1;
  state.collectionEffects.push({
    id: state.nextEntityId++,
    x,
    y,
    color: GAME_PALETTE.orbs[type],
    durationSeconds: GAME_COMBAT_CONFIG.collectionEffectDurationSeconds,
    remainingSeconds: GAME_COMBAT_CONFIG.collectionEffectDurationSeconds,
  });
}

function updateItems(state: GameState, deltaSeconds: number): void {
  const remainingItems: ItemOrbEntity[] = [];
  for (const item of state.items) {
    item.remainingSeconds -= deltaSeconds;
    if (item.remainingSeconds <= 0) {
      state.impacts.push(createImpact(state, item.x, item.y, {
        kind: 'orbExpiry',
        color: GAME_PALETTE.orbs[item.type],
        radius: 22,
      }));
      continue;
    }
    if (
      Math.hypot(item.x - state.player.x, item.y - state.player.y) <=
      item.radius + state.player.radius + GAME_PROGRESSION_CONFIG.orbPickupRadius
    ) {
      collectOrb(state, item.type, item.x, item.y);
      continue;
    }
    remainingItems.push(item);
  }
  state.items = remainingItems;
}

function updateTemporaryEffects(state: GameState, deltaSeconds: number): void {
  const remainingEffects: ActiveTemporaryEffect[] = [];
  for (const effect of state.activeEffects) {
    effect.remainingSeconds -= deltaSeconds;
    if (effect.remainingSeconds > 0) remainingEffects.push(effect);
  }
  state.activeEffects = remainingEffects;
  updateShieldStrength(state);
}

function createImpact(
  state: GameState,
  x: number,
  y: number,
  options: {
    readonly critical?: boolean;
    readonly kind?: ImpactEffectEntity['kind'];
    readonly color?: string;
    readonly radius?: number;
  } = {},
): ImpactEffectEntity {
  const durationSeconds = options.kind === 'bomb'
    ? 0.5
    : options.kind === 'death' || options.kind === 'orbExpiry'
      ? 0.4
      : GAME_COMBAT_CONFIG.impactDurationSeconds;
  return {
    id: state.nextEntityId++,
    x,
    y,
    durationSeconds,
    remainingSeconds: durationSeconds,
    kind: options.kind ?? 'hit',
    ...(options.color === undefined ? {} : { color: options.color }),
    ...(options.radius === undefined ? {} : { radius: options.radius }),
    critical: options.critical ?? false,
  };
}

function createDamageNumber(
  state: GameState,
  x: number,
  y: number,
  amount: number,
): DamageNumberEntity {
  return {
    id: state.nextEntityId++,
    x,
    y,
    amount,
    durationSeconds: GAME_COMBAT_CONFIG.damageNumberDurationSeconds,
    remainingSeconds: GAME_COMBAT_CONFIG.damageNumberDurationSeconds,
  };
}

function movePlayer(
  state: GameState,
  movementX: number,
  movementY: number,
  deltaSeconds: number,
): void {
  const magnitude = Math.hypot(movementX, movementY);
  const normalizedX = magnitude > 1 ? movementX / magnitude : movementX;
  const normalizedY = magnitude > 1 ? movementY / magnitude : movementY;
  const movement = moveCircleInArena(
    state.player,
    state.player.radius,
    normalizedX * state.player.movementSpeed * deltaSeconds,
    normalizedY * state.player.movementSpeed * deltaSeconds,
    state.arenaWidth,
    state.arenaHeight,
  );
  state.player.x = movement.x;
  state.player.y = movement.y;
  state.player.movementFactor = Math.min(1, Math.hypot(normalizedX, normalizedY));
}

function fireProjectile(state: GameState): void {
  const { player } = state;
  const directionX = Math.cos(player.aimAngle);
  const directionY = Math.sin(player.aimAngle);
  const radius = GAME_VISUAL_CONFIG.entity.projectileRadius;
  const spawnDistance = player.radius + radius + 2;
  const projectile: ProjectileEntity = {
    id: state.nextEntityId++,
    x: player.x + directionX * spawnDistance,
    y: player.y + directionY * spawnDistance,
    directionX,
    directionY,
    radius,
    damage: getProjectileDamage(state),
    speed: GAME_COMBAT_CONFIG.projectileSpeed,
    remainingSeconds: GAME_COMBAT_CONFIG.projectileLifetimeSeconds,
  };
  state.projectiles.push(projectile);
  player.muzzleFlashSeconds = GAME_COMBAT_CONFIG.muzzleFlashDurationSeconds;
}

function moveZombie(
  state: GameState,
  zombie: ZombieEntity,
  deltaSeconds: number,
): void {
  const deltaX = state.player.x - zombie.x;
  const deltaY = state.player.y - zombie.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance > 0) zombie.facingAngle = Math.atan2(deltaY, deltaX);

  const attackDistance = zombie.radius + state.player.radius + 2;
  if (distance <= attackDistance || distance === 0) return;
  const waypoint = findNextPathWaypointInArena(
    zombie,
    state.player,
    zombie.radius,
    state.arenaWidth,
    state.arenaHeight,
  );
  const waypointX = waypoint.x - zombie.x;
  const waypointY = waypoint.y - zombie.y;
  const waypointDistance = Math.hypot(waypointX, waypointY);
  if (waypointDistance === 0) return;

  const movement = moveCircleInArena(
    zombie,
    zombie.radius,
    (waypointX / waypointDistance) * zombie.movementSpeed * deltaSeconds,
    (waypointY / waypointDistance) * zombie.movementSpeed * deltaSeconds,
    state.arenaWidth,
    state.arenaHeight,
  );
  zombie.x = movement.x;
  zombie.y = movement.y;
}

function attackPlayer(state: GameState, zombie: ZombieEntity): void {
  const { player } = state;
  const distance = Math.hypot(player.x - zombie.x, player.y - zombie.y);
  if (distance > player.radius + zombie.radius + 2) return;
  if (zombie.attackCooldownSeconds > 0) return;
  zombie.attackCooldownSeconds = GAME_COMBAT_CONFIG.zombieAttackCooldownSeconds;
  if (!player.alive || player.damageCooldownSeconds > 0) return;

  state.statistics.totalDamageReceived += zombie.contactDamage;
  const shield = getEffect(state, 'shield');
  const shieldDamage = Math.min(
    shield?.remainingShield ?? 0,
    zombie.contactDamage,
  );
  if (shield && shield.remainingShield !== undefined) {
    shield.remainingShield -= shieldDamage;
  }
  const healthDamage = zombie.contactDamage - shieldDamage;
  player.health = Math.max(0, player.health - healthDamage);
  player.alive = player.health > 0;
  player.damageCooldownSeconds = GAME_COMBAT_CONFIG.playerHitCooldownSeconds;
  player.hitFlashSeconds = 0.22;
  updateShieldStrength(state);
  if (healthDamage > 0) {
    state.impacts.push(createImpact(state, player.x, player.y, {
      kind: 'playerDamage',
      critical: true,
      color: GAME_PALETTE.combat.damage,
      radius: 24,
    }));
    state.damageNumbers.push(
      createDamageNumber(state, player.x, player.y - player.radius, healthDamage),
    );
  } else {
    state.impacts.push(createImpact(state, player.x, player.y, {
      kind: 'playerDamage',
      color: GAME_PALETTE.player.shield,
      radius: 20,
    }));
  }
  if (!player.alive) {
    state.wave.phase = 'gameOver';
    state.wave.announcement = 'Run over';
    state.wave.announcementSeconds = 0;
  }
}

function segmentHitsZombie(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  zombie: ZombieEntity,
  projectileRadius: number,
): boolean {
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  const progress = lengthSquared === 0
    ? 0
    : Math.max(
        0,
        Math.min(
          1,
          ((zombie.x - startX) * segmentX + (zombie.y - startY) * segmentY) /
            lengthSquared,
        ),
      );
  const nearestX = startX + segmentX * progress;
  const nearestY = startY + segmentY * progress;
  const deltaX = zombie.x - nearestX;
  const deltaY = zombie.y - nearestY;
  const hitRadius = zombie.radius + projectileRadius;
  return deltaX * deltaX + deltaY * deltaY <= hitRadius * hitRadius;
}

function resolveProjectileHit(
  state: GameState,
  projectile: ProjectileEntity,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): boolean {
  if (isProjectileBlockedByObstacle(state, projectile, endX, endY)) {
    state.impacts.push(createImpact(state, endX, endY));
    return true;
  }

  const zombieIndex = state.zombies.findIndex((zombie) =>
    segmentHitsZombie(
      startX,
      startY,
      endX,
      endY,
      zombie,
      projectile.radius,
    ),
  );
  if (zombieIndex < 0) return false;

  const zombie = state.zombies[zombieIndex];
  applyZombieDamage(state, zombie, projectile.damage);
  return true;
}

function updateProjectiles(state: GameState, deltaSeconds: number): void {
  const surviving: ProjectileEntity[] = [];
  for (const projectile of state.projectiles) {
    const startX = projectile.x;
    const startY = projectile.y;
    const endX = startX + projectile.directionX * projectile.speed * deltaSeconds;
    const endY = startY + projectile.directionY * projectile.speed * deltaSeconds;
    projectile.remainingSeconds -= deltaSeconds;

    const outsideArena =
      endX < 0 ||
      endY < 0 ||
      endX > state.arenaWidth ||
      endY > state.arenaHeight;
    const hit = resolveProjectileHit(
      state,
      projectile,
      startX,
      startY,
      endX,
      endY,
    );
    if (hit || outsideArena || projectile.remainingSeconds <= 0) continue;

    projectile.x = endX;
    projectile.y = endY;
    surviving.push(projectile);
  }
  state.projectiles = surviving;
}

function updateEffects<T extends { remainingSeconds: number }>(
  effects: T[],
  deltaSeconds: number,
): T[] {
  const surviving: T[] = [];
  for (const effect of effects) {
    effect.remainingSeconds -= deltaSeconds;
    if (effect.remainingSeconds > 0) surviving.push(effect);
  }
  return surviving;
}

export function updateGameState(
  state: GameState,
  input: GameInputState,
  deltaSeconds: number,
): void {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
    throw new RangeError('Game delta time must be a non-negative finite number.');
  }
  if (
    !Number.isFinite(input.movementX) ||
    !Number.isFinite(input.movementY) ||
    !Number.isFinite(input.aimAngle)
  ) {
    throw new RangeError('Game input values must be finite numbers.');
  }

  state.elapsedSeconds += deltaSeconds;
  const { player } = state;
  player.aimAngle = input.aimAngle;
  player.damageCooldownSeconds = Math.max(
    0,
    player.damageCooldownSeconds - deltaSeconds,
  );
  player.hitFlashSeconds = Math.max(0, player.hitFlashSeconds - deltaSeconds);
  player.muzzleFlashSeconds = Math.max(0, player.muzzleFlashSeconds - deltaSeconds);

  if (player.alive && state.wave.phase === 'combat') {
    movePlayer(state, input.movementX, input.movementY, deltaSeconds);
    player.fireCooldownSeconds = Math.max(
      0,
      player.fireCooldownSeconds - deltaSeconds,
    );
    if (player.fireCooldownSeconds === 0) {
      fireProjectile(state);
      player.fireCooldownSeconds = 1 / getShotsPerSecond(state);
    }
  } else {
    player.movementFactor = 0;
  }

  if (state.wave.phase === 'gameOver') return;
  if (state.wave.phase === 'upgrade') {
    state.wave.announcementSeconds = Math.max(
      0,
      state.wave.announcementSeconds - deltaSeconds,
    );
    return;
  }
  if (state.wave.phase === 'intermission') {
    advanceWaveProgression(state, deltaSeconds);
    return;
  }

  state.statistics.survivalSeconds += deltaSeconds;
  updateTemporaryEffects(state, deltaSeconds);
  advanceWaveProgression(state, deltaSeconds);
  updateItems(state, deltaSeconds);

  for (const zombie of state.zombies) {
    zombie.hitFlashSeconds = Math.max(0, zombie.hitFlashSeconds - deltaSeconds);
    zombie.attackCooldownSeconds = Math.max(
      0,
      zombie.attackCooldownSeconds - deltaSeconds,
    );
    moveZombie(state, zombie, deltaSeconds);
  }
  for (const zombie of state.zombies) attackPlayer(state, zombie);

  updateProjectiles(state, deltaSeconds);
  state.impacts = updateEffects(state.impacts, deltaSeconds);
  state.damageNumbers = updateEffects(state.damageNumbers, deltaSeconds);
  state.collectionEffects = updateEffects(
    state.collectionEffects,
    deltaSeconds,
  );
  if (player.health <= 0 || !player.alive) {
    state.wave.phase = 'gameOver';
    state.wave.announcement = 'Run over';
    state.wave.announcementSeconds = 0;
    return;
  }
  completeWaveIfCleared(state);
}

export function isProjectileBlockedByObstacle(
  state: GameState,
  projectile: ProjectileEntity,
  endX: number,
  endY: number,
): boolean {
  const obstacles = getArenaObstacles(state.arenaWidth, state.arenaHeight);
  return obstacles.some((obstacle) =>
    segmentIntersectsRectangle(
      { x: projectile.x, y: projectile.y },
      { x: endX, y: endY },
      obstacle,
      projectile.radius,
    ),
  );
}
