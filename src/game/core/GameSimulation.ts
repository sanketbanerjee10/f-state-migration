import {
  circleOverlapsRectangle,
  getArenaObstacles,
  getArenaObstacleBounds,
  moveCircleInArena,
  segmentIntersectsRectangle,
  findCirclePositionInArena,
  findNextPathWaypointInArena,
} from './ArenaGeometry';
import { getArenaCollisionObstacles } from '../arena/ArenaSystem';
import type { MilitaryOutpostEntity } from '../arena/ArenaSystem';
import {
  createContaminatedPuddle,
  createToxicCloud,
  getContaminatedDamageKey,
  type ContaminatedArenaEntity,
  type ContaminatedPuddleEntity,
  type ToxicBarrelEntity,
  type ToxicCloudEntity,
  type ChemicalTankEntity,
  type MutagenContainerEntity,
  type BiohazardWasteBinEntity,
} from '../arena/ContaminatedArenaSystem';
import {
  getIndustrialGeneratorDangerRadius,
  getIndustrialGeneratorPhase,
  getIndustrialSteamDirection,
  getIndustrialSteamPhase,
  isPointInIndustrialSteam,
  updateIndustrialMovingWalls,
} from '../arena/IndustrialArenaSystem';
import { GAME_VISUAL_CONFIG } from '../rendering/VisualConfig';
import { GAME_PALETTE } from '../rendering/GamePalette';
import {
  advanceWaveProgression,
  completeWaveIfCleared,
} from './GameProgression';
import {
  ARENA_INTERACTION_CONFIG,
  CONTAMINATED_OBJECT_CONFIG,
  ELITE_CONFIG,
  ENEMY_ABILITY_CONFIG,
  GAME_COMBAT_CONFIG,
  GAME_PROGRESSION_CONFIG,
  MILITARY_OBJECT_CONFIG,
  ORB_DROP_SEQUENCE,
  ORB_SYSTEM_CONFIG,
  INDUSTRIAL_OBJECT_CONFIG,
  RARE_UPGRADE_EFFECT_CONFIG,
  WAVE_MODIFIER_CONFIG,
  WAVE_SPAWN_CONFIG,
} from './GameConfig';
import {
  createZombie,
} from './GameState';
import {
  absorbEliteShieldDamage,
  shouldDropRareGoldOrb,
  updateElite,
} from '../enemies/elites/EliteSystem';
import { awardRareReward } from '../upgrades/ProgressionSystem';
import {
  applyRareGoldReward,
  getOrbRarity,
  isCollectibleOrb,
} from '../orbs/OrbSystem';
import {
  handleBossDefeat,
  moveBoss,
  resolveBossDamage,
  updateBossAbilities,
  updateBossEncounter,
} from '../bosses/BossSystem';
import { updateScreamerAbilities } from '../enemies/ScreamerSystem';
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
import {
  incrementGamePerformanceEventCount,
  recordGamePerformanceEvent,
  type GamePerformanceEventCountName,
  type GamePerformanceEventName,
  type GamePerformanceTimings,
} from './GamePerformanceDiagnostics';

export interface GameInputState {
  readonly movementX: number;
  readonly movementY: number;
  readonly aimAngle: number;
  readonly useBomb?: boolean;
}

export { GAME_COMBAT_CONFIG } from './GameConfig';

const SPITTER_CONFIG = ENEMY_ABILITY_CONFIG.spitter;
const RUNNER_DASH_CONFIG = ENEMY_ABILITY_CONFIG.runnerDash;
const SWARM_DODGE_CONFIG = ENEMY_ABILITY_CONFIG.swarmDodge;
let activePerformanceTimings: GamePerformanceTimings | undefined;

function beginPerformanceEvent(): number | undefined {
  return activePerformanceTimings ? performance.now() : undefined;
}

function endPerformanceEvent(
  name: GamePerformanceEventName,
  startedAt: number | undefined,
): void {
  if (startedAt !== undefined) {
    recordGamePerformanceEvent(
      activePerformanceTimings,
      name,
      performance.now() - startedAt,
    );
  }
}

function countPerformanceEvent(
  name: GamePerformanceEventCountName,
  amount = 1,
): void {
  incrementGamePerformanceEventCount(activePerformanceTimings, name, amount);
}

function recordArenaObjectDestruction(startedAt: number | undefined): void {
  countPerformanceEvent('arenaObjectDestructionEvents');
  endPerformanceEvent('arenaObjectDestruction', startedAt);
}

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
  ) * (getEffect(state, 'cursed')
    ? ORB_SYSTEM_CONFIG.cursedDamageMultiplier
    : 1);
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

function getDeterministicRoll(firstId: number, secondId: number, salt: number): number {
  const value = Math.sin(firstId * 12.9898 + secondId * 78.233 + salt * 37.719) *
    43_758.5453;
  return value - Math.floor(value);
}

function getMilitaryObjectBounds(
  state: GameState,
  object: MilitaryOutpostEntity,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  return {
    x: state.arenaWidth * object.xFraction - object.width / 2,
    y: state.arenaHeight * object.yFraction - object.height / 2,
    width: object.width,
    height: object.height,
  };
}

function getMilitaryTurretWireBounds(
  state: GameState,
  turret: Extract<MilitaryOutpostEntity, { kind: 'abandoned-turret' }>,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const offset = MILITARY_OBJECT_CONFIG.abandonedTurret.wireOffset;
  return {
    x: state.arenaWidth * turret.xFraction - turret.width / 2 - offset,
    y: state.arenaHeight * turret.yFraction - turret.height / 2 - offset,
    width: turret.width + offset * 2,
    height: turret.height + offset * 2,
  };
}

function circleOverlapsRectangleBorder(
  circle: { readonly x: number; readonly y: number; readonly radius: number },
  rectangle: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  borderThickness = 2,
): boolean {
  const radius = circle.radius + borderThickness;
  const edges = [
    [rectangle.x, rectangle.y, rectangle.x + rectangle.width, rectangle.y],
    [rectangle.x + rectangle.width, rectangle.y, rectangle.x + rectangle.width, rectangle.y + rectangle.height],
    [rectangle.x + rectangle.width, rectangle.y + rectangle.height, rectangle.x, rectangle.y + rectangle.height],
    [rectangle.x, rectangle.y + rectangle.height, rectangle.x, rectangle.y],
  ] as const;
  return edges.some(([startX, startY, endX, endY]) => {
    const edgeX = endX - startX;
    const edgeY = endY - startY;
    const edgeLengthSquared = edgeX * edgeX + edgeY * edgeY;
    const progress = Math.max(0, Math.min(1,
      ((circle.x - startX) * edgeX + (circle.y - startY) * edgeY) /
        edgeLengthSquared,
    ));
    return Math.hypot(
      circle.x - (startX + edgeX * progress),
      circle.y - (startY + edgeY * progress),
    ) <= radius;
  });
}

function getMilitaryCollisionObstacles(state: GameState) {
  return getArenaCollisionObstacles(
    state.arenaObstacles,
    state.barrels,
    state.militaryObjects,
  );
}

function getMilitaryMovementMultiplier(
  state: GameState,
  actor: { readonly x: number; readonly y: number; readonly radius: number },
): number {
  let multiplier = 1;
  for (const object of state.militaryObjects) {
    if (object.kind === 'sandbag-barricade' && object.destroyed &&
        object.spillRemainingSeconds > 0) {
      const bounds = getMilitaryObjectBounds(state, object);
      const sandBounds = {
        x: bounds.x + (bounds.width - MILITARY_OBJECT_CONFIG.sandbag.sandWidth) / 2,
        y: bounds.y + (bounds.height - MILITARY_OBJECT_CONFIG.sandbag.sandHeight) / 2,
        width: MILITARY_OBJECT_CONFIG.sandbag.sandWidth,
        height: MILITARY_OBJECT_CONFIG.sandbag.sandHeight,
      };
      if (circleOverlapsRectangle(actor, actor.radius, sandBounds)) {
        multiplier = Math.min(multiplier, MILITARY_OBJECT_CONFIG.sandbag.slowMultiplier);
      }
    } else if (object.kind === 'razor-wire' && object.active &&
        circleOverlapsRectangle(
          actor,
          actor.radius,
          getMilitaryObjectBounds(state, object),
        )) {
      multiplier = Math.min(multiplier, MILITARY_OBJECT_CONFIG.razorWire.slowMultiplier);
    }
  }
  return multiplier;
}

function getContaminatedMovementMultiplier(
  state: GameState,
  actor: { readonly x: number; readonly y: number; readonly radius: number },
  isZombie: boolean,
): number {
  if (!isZombie || state.wave.phase !== 'combat') return 1;
  let multiplier = 1;
  for (const entity of state.contaminatedObjects) {
    if (entity.kind !== 'contaminated-puddle' || entity.remainingSeconds <= 0) continue;
    const horizontalRadius = entity.radiusX + actor.radius;
    const verticalRadius = entity.radiusY + actor.radius;
    const deltaX = (actor.x - entity.x) / horizontalRadius;
    const deltaY = (actor.y - entity.y) / verticalRadius;
    if (deltaX * deltaX + deltaY * deltaY <= 1) {
      multiplier = Math.min(multiplier, entity.slowMultiplier);
    }
  }
  return multiplier;
}

function isActorInPuddle(
  puddle: ContaminatedPuddleEntity,
  actor: { readonly x: number; readonly y: number; readonly radius: number },
): boolean {
  const horizontalRadius = puddle.radiusX + actor.radius;
  const verticalRadius = puddle.radiusY + actor.radius;
  const deltaX = (actor.x - puddle.x) / horizontalRadius;
  const deltaY = (actor.y - puddle.y) / verticalRadius;
  return deltaX * deltaX + deltaY * deltaY <= 1;
}

function getRareUpgradeLevelEffect(values: readonly number[], level: number): number {
  return values[Math.min(Math.max(0, level), values.length - 1)] ?? 0;
}

function resolveRareDefensiveTriggers(state: GameState): void {
  const { player, progression } = state;
  const secondWindLevel = progression.rareUpgradeLevels.secondWind;
  if (
    !player.alive &&
    secondWindLevel > 0 &&
    !progression.secondWindUsed
  ) {
    progression.secondWindUsed = true;
    player.health = Math.max(
      1,
      player.maxHealth *
        getRareUpgradeLevelEffect(
          RARE_UPGRADE_EFFECT_CONFIG.secondWindHealthPercentByLevel,
          secondWindLevel,
        ),
    );
    player.alive = true;
  }

  const shieldLevel = progression.rareUpgradeLevels.emergencyShield;
  if (
    !player.alive ||
    shieldLevel <= 0 ||
    progression.emergencyShieldCooldownSeconds > 0 ||
    player.health / player.maxHealth >=
      RARE_UPGRADE_EFFECT_CONFIG.emergencyShieldThreshold
  ) {
    return;
  }

  const durationSeconds = getRareUpgradeLevelEffect(
    RARE_UPGRADE_EFFECT_CONFIG.emergencyShieldDurationByLevel,
    shieldLevel,
  );
  const existingShield = getEffect(state, 'shield');
  if (existingShield) {
    existingShield.remainingSeconds = Math.max(
      existingShield.remainingSeconds,
      durationSeconds,
    );
    existingShield.remainingShield = Math.max(
      existingShield.remainingShield ?? 0,
      RARE_UPGRADE_EFFECT_CONFIG.emergencyShieldCapacity,
    );
  } else {
    state.activeEffects.push({
      type: 'shield',
      durationSeconds,
      remainingSeconds: durationSeconds,
      remainingShield: RARE_UPGRADE_EFFECT_CONFIG.emergencyShieldCapacity,
    });
    countPerformanceEvent('temporaryEffectsCreated');
  }
  progression.emergencyShieldCooldownSeconds =
    RARE_UPGRADE_EFFECT_CONFIG.emergencyShieldCooldownSeconds;
}

function applyPlayerDamage(
  state: GameState,
  damage: number,
): { readonly healthDamage: number; readonly shieldDamage: number } {
  const player = state.player;
  if (player.spawnProtectionSeconds > 0) {
    return { healthDamage: 0, shieldDamage: 0 };
  }
  const shield = getEffect(state, 'shield');
  const shieldDamage = Math.min(shield?.remainingShield ?? 0, damage);
  if (shield && shield.remainingShield !== undefined) {
    shield.remainingShield -= shieldDamage;
  }
  const healthDamage = damage - shieldDamage;
  player.health = Math.max(0, player.health - healthDamage);
  player.alive = player.health > 0;
  resolveRareDefensiveTriggers(state);
  updateShieldStrength(state);
  return { healthDamage, shieldDamage };
}

function spawnOrb(
  state: GameState,
  type: GameItemType,
  x: number,
  y: number,
  guaranteed = false,
): number | undefined {
  if (!guaranteed && state.items.length >= GAME_PROGRESSION_CONFIG.maximumActiveItems) {
    return undefined;
  }
  const startedAt = beginPerformanceEvent();
  const radius = GAME_VISUAL_CONFIG.entity.orbRadius;
  const id = state.nextEntityId++;
  const position = findCirclePositionInArena(
    { x, y },
    radius,
    state.arenaWidth,
    state.arenaHeight,
    getMilitaryCollisionObstacles(state),
  );
  state.items.push({
    id,
    type,
    rarity: type === 'rareGold' ? 'special' : getOrbRarity(id),
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
  countPerformanceEvent('orbsGenerated');
  endPerformanceEvent('orbGeneration', startedAt);
  return id;
}

function recordZombieKill(state: GameState, zombie: ZombieEntity): void {
  state.zombiesKilled += 1;
  state.statistics.zombiesKilled = state.zombiesKilled;
  if (zombie.isElite) {
    state.statistics.eliteKills = (state.statistics.eliteKills ?? 0) + 1;
  }

  switch (zombie.type) {
    case 'walker':
      state.statistics.walkerKills += 1;
      break;
    case 'runner':
      state.statistics.runnerKills += 1;
      break;
    case 'brute':
      state.statistics.bruteKills += 1;
      break;
    case 'spitter':
      state.statistics.spitterKills += 1;
      break;
    case 'swarm':
      state.statistics.swarmKills += 1;
      break;
    case 'armoured':
      state.statistics.armouredKills += 1;
      break;
    case 'screamer':
      state.statistics.screamerKills += 1;
      break;
    case 'bloater':
      state.statistics.bloaterKills += 1;
      break;
    case 'splitter':
      state.statistics.splitterKills += 1;
      break;
    default:
      state.statistics.walkerKills += 1;
      break;
  }

  const orbDropInterval = Math.max(
    1,
    Math.floor(
      GAME_PROGRESSION_CONFIG.killsPerOrbDrop *
        (state.wave.activeModifier
          ? WAVE_MODIFIER_CONFIG.definitions[state.wave.activeModifier]
            .orbDropIntervalMultiplier ?? 1
          : 1),
    ),
  );
  if (state.zombiesKilled % orbDropInterval === 0) {
    const sequenceIndex =
      Math.floor(state.zombiesKilled / GAME_PROGRESSION_CONFIG.killsPerOrbDrop) - 1;
    const type =
      ORB_DROP_SEQUENCE[sequenceIndex % ORB_DROP_SEQUENCE.length];
    spawnOrb(state, type, zombie.x, zombie.y);
  }

  if (zombie.isElite) {
    if (shouldDropRareGoldOrb(zombie.id)) {
      spawnOrb(state, 'rareGold', zombie.x, zombie.y);
    }
    if (
      zombie.eliteRarePointEligible &&
      awardRareReward(
        state.progression,
        `elite-rare-point:${zombie.id}`,
        ELITE_CONFIG.rarePointReward,
      )
    ) {
      state.statistics.rareCurrency = { ...state.progression.rare };
    }
  }
}

function defeatZombie(state: GameState, zombie: ZombieEntity): void {
  const startedAt = beginPerformanceEvent();
  const index = state.zombies.findIndex((candidate) => candidate.id === zombie.id);
  if (index >= 0) {
    state.zombies.splice(index, 1);
    countPerformanceEvent('enemyDeathEvents');
  }
  if (zombie.isBoss) handleBossDefeat(state, zombie);

  if (zombie.type === 'bloater') {
    const contamination = state.wave.activeModifier === 'contamination'
      ? WAVE_MODIFIER_CONFIG.definitions.contamination
      : undefined;
    const hazardRadius = (zombie.radius + 18) *
      (contamination?.hazardRadiusMultiplier ?? 1);
    createHazard(
      state,
      zombie.x,
      zombie.y,
      hazardRadius,
      Math.max(
        6,
        Math.ceil(
          zombie.contactDamage * 0.5 *
            (contamination?.hazardDamageMultiplier ?? 1),
        ),
      ),
      5,
    );
    state.impacts.push(createImpact(state, zombie.x, zombie.y, {
      kind: 'acid',
      color: '#F0FF9B',
      radius: hazardRadius,
    }));
  }

  if (zombie.type === 'splitter' && (zombie.spawnDepth ?? 0) < 1) {
    const splitterStartedAt = beginPerformanceEvent();
    const splitDirections = [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: 0, y: 1 },
    ];
    for (const direction of splitDirections) {
      const child = createZombie(
        state.nextEntityId++,
        'swarm',
        zombie.x + direction.x * (zombie.radius + 8),
        zombie.y + direction.y * (zombie.radius + 8),
        state.wave.currentWave,
      );
      child.spawnDepth = (zombie.spawnDepth ?? 0) + 1;
      child.health = Math.max(12, Math.round(child.health * 0.7));
      child.maxHealth = child.health;
      state.zombies.push(child);
      countPerformanceEvent('splitterOffspringCreated');
    }
    endPerformanceEvent('splitterOffspringCreation', splitterStartedAt);
  }

  recordZombieKill(state, zombie);
  endPerformanceEvent('enemyDeathRemoval', startedAt);
}

function applyZombieDamage(
  state: GameState,
  zombie: ZombieEntity,
  damage: number,
  fromEliteExplosion = false,
  source: 'weapon' | 'splash' | 'other' = 'other',
): number {
  const startedAt = beginPerformanceEvent();
  countPerformanceEvent('enemyDamageEvents');
  const damageDealt = applyZombieDamageCore(
    state,
    zombie,
    damage,
    fromEliteExplosion,
    source,
  );
  endPerformanceEvent('enemyDamage', startedAt);
  return damageDealt;
}

function applyZombieDamageCore(
  state: GameState,
  zombie: ZombieEntity,
  damage: number,
  fromEliteExplosion = false,
  source: 'weapon' | 'splash' | 'other' = 'other',
): number {
  if (zombie.eliteExplosionSeconds !== undefined && !fromEliteExplosion) return 0;

  const resolvedDamage = resolveBossDamage(state, zombie, damage);
  const { absorbed, healthDamage } = absorbEliteShieldDamage(
    zombie,
    resolvedDamage,
  );
  const damageDealt = Math.min(zombie.health, healthDamage);
  zombie.health = Math.max(0, zombie.health - healthDamage);
  if (source === 'weapon' && damageDealt > 0) {
    const lifestealLevel = state.progression.rareUpgradeLevels.lifesteal;
    const healRatio = getRareUpgradeLevelEffect(
      RARE_UPGRADE_EFFECT_CONFIG.lifestealPercentByLevel,
      lifestealLevel,
    );
    state.player.health = Math.min(
      state.player.maxHealth,
      state.player.health + damageDealt * healRatio,
    );
  }
  zombie.hitFlashSeconds = 0.16;
  state.statistics.totalDamageDealt += damageDealt;
  state.impacts.push(createImpact(state, zombie.x, zombie.y, {
    critical: zombie.health === 0 && zombie.eliteModifier !== 'explosive',
    kind: zombie.health === 0 && zombie.eliteModifier !== 'explosive'
      ? 'death'
      : 'hit',
    ...(zombie.health === 0 && zombie.eliteModifier !== 'explosive'
      ? { color: GAME_PALETTE.enemies[zombie.type], radius: 28 }
      : {}),
  }));
  state.damageNumbers.push(
    createDamageNumber(
      state,
      zombie.x,
      zombie.y - zombie.radius,
      damageDealt + absorbed,
    ),
  );

  if (zombie.health === 0) {
    if (zombie.isElite && zombie.eliteModifier === 'explosive' && !fromEliteExplosion) {
      zombie.health = 1;
      zombie.eliteExplosionSeconds = ELITE_CONFIG.explosionFuseSeconds;
      zombie.eliteExplosionDurationSeconds = ELITE_CONFIG.explosionFuseSeconds;
      state.impacts.push(createImpact(state, zombie.x, zombie.y, {
        kind: 'telegraph',
        color: GAME_PALETTE.enemies.elite,
        radius: ELITE_CONFIG.explosionRadius,
      }));
      return damageDealt;
    }

    defeatZombie(state, zombie);
  }
  return damageDealt;
}

function applyIndustrialPlayerDamage(
  state: GameState,
  damage: number,
  color: string,
  respectDamageCooldown = true,
): void {
  const startedAt = beginPerformanceEvent();
  const { player } = state;
  if (
    !player.alive ||
    player.spawnProtectionSeconds > 0 ||
    (respectDamageCooldown && player.damageCooldownSeconds > 0)
  ) return;

  const { healthDamage, shieldDamage } = applyPlayerDamage(state, damage);
  player.damageCooldownSeconds = GAME_COMBAT_CONFIG.playerHitCooldownSeconds;
  player.hitFlashSeconds = 0.22;
  state.statistics.totalDamageReceived += damage;
  state.impacts.push(createImpact(state, player.x, player.y, {
    kind: 'playerDamage',
    critical: healthDamage > 0,
    shieldAbsorbed: shieldDamage > 0,
    color: healthDamage > 0 ? color : GAME_PALETTE.player.shield,
    radius: 22,
  }));
  if (healthDamage > 0) {
    state.damageNumbers.push(
      createDamageNumber(state, player.x, player.y - player.radius, healthDamage),
    );
  }
  if (!player.alive) {
    state.wave.phase = 'gameOver';
    state.wave.announcement = 'Run over';
    state.wave.announcementSeconds = 0;
  }
}

function knockbackIndustrialActor(
  state: GameState,
  actor: { x: number; y: number; radius: number },
  directionX: number,
  directionY: number,
  deltaSeconds: number,
  strength: number,
): void {
  if (deltaSeconds <= 0) return;
  const movement = moveCircleInArena(
    actor,
    actor.radius,
    directionX * strength * deltaSeconds,
    directionY * strength * deltaSeconds,
    state.arenaWidth,
    state.arenaHeight,
    getMilitaryCollisionObstacles(state),
  );
  actor.x = movement.x;
  actor.y = movement.y;
}

function updateIndustrialHazards(state: GameState, deltaSeconds: number): void {
  if (state.arenaTheme !== 'industrial') return;

  updateIndustrialMovingWalls(
    state.arenaObstacles,
    state.barrels,
    [state.player, ...state.zombies],
    state.arenaWidth,
    state.arenaHeight,
    state.elapsedSeconds,
  );

  const player = state.player;
  for (let index = 0; index < state.arenaObstacles.length; index += 1) {
    const obstacle = state.arenaObstacles[index];
    if (!obstacle) continue;

    if (obstacle.kind === 'barricade') {
      const steam = getIndustrialSteamPhase(state.elapsedSeconds, index);
      if (steam.phase !== 'venting') continue;
      if (isPointInIndustrialSteam(
        player,
        player.radius,
        obstacle,
        index,
        state.arenaWidth,
        state.arenaHeight,
        state.elapsedSeconds,
      )) {
        applyIndustrialPlayerDamage(
          state,
          INDUSTRIAL_OBJECT_CONFIG.steamPipe.playerDamage,
          '#BFD4CE',
        );
        knockbackIndustrialActor(
          state,
          player,
          getIndustrialSteamDirection(index).x,
          getIndustrialSteamDirection(index).y,
          deltaSeconds,
          INDUSTRIAL_OBJECT_CONFIG.steamPipe.knockbackSpeed,
        );
      }
      for (const zombie of [...state.zombies]) {
        if (
          zombie.industrialHazardCooldownSeconds &&
          zombie.industrialHazardCooldownSeconds > 0
        ) continue;
        if (!isPointInIndustrialSteam(
          zombie,
          zombie.radius,
          obstacle,
          index,
          state.arenaWidth,
          state.arenaHeight,
          state.elapsedSeconds,
        )) continue;
        zombie.industrialHazardCooldownSeconds =
          INDUSTRIAL_OBJECT_CONFIG.steamPipe.zombiePulseCooldownSeconds;
        const direction = getIndustrialSteamDirection(index);
        knockbackIndustrialActor(
          state,
          zombie,
          direction.x,
          direction.y,
          deltaSeconds,
          INDUSTRIAL_OBJECT_CONFIG.steamPipe.knockbackSpeed,
        );
        applyZombieDamage(
          state,
          zombie,
          INDUSTRIAL_OBJECT_CONFIG.steamPipe.zombieDamage,
        );
      }
      continue;
    }

    if (obstacle.kind !== 'cover') continue;
    const generator = getIndustrialGeneratorPhase(state.elapsedSeconds, index);
    if (generator.phase !== 'discharging') continue;
    const radius = getIndustrialGeneratorDangerRadius(obstacle.width, obstacle.height);
    const centerX = state.arenaWidth * obstacle.xFraction;
    const centerY = state.arenaHeight * obstacle.yFraction;
    if (Math.hypot(player.x - centerX, player.y - centerY) <= radius + player.radius) {
      applyIndustrialPlayerDamage(
        state,
        INDUSTRIAL_OBJECT_CONFIG.generator.damagePerPulse,
        '#7CE4DC',
      );
    }
    for (const zombie of [...state.zombies]) {
      if (
        zombie.industrialHazardCooldownSeconds &&
        zombie.industrialHazardCooldownSeconds > 0
      ) continue;
      if (Math.hypot(zombie.x - centerX, zombie.y - centerY) > radius + zombie.radius) continue;
      zombie.industrialHazardCooldownSeconds =
        INDUSTRIAL_OBJECT_CONFIG.generator.pulseCooldownSeconds;
      applyZombieDamage(
        state,
        zombie,
        INDUSTRIAL_OBJECT_CONFIG.generator.zombieDamagePerPulse,
      );
    }
  }
  updateGasCylinders(state, deltaSeconds);
}

function detonateMilitaryAmmoCrate(
  state: GameState,
  object: Extract<MilitaryOutpostEntity, { kind: 'military-ammo-crate' }>,
): void {
  const startedAt = beginPerformanceEvent();
  const config = MILITARY_OBJECT_CONFIG.ammoCrate;
  const x = state.arenaWidth * object.xFraction;
  const y = state.arenaHeight * object.yFraction;
  object.explosionRemainingSeconds = config.explosionDurationSeconds;
  state.impacts.push(createImpact(state, x, y, {
    kind: 'bomb',
    critical: true,
    color: GAME_PALETTE.orbs.bomb,
    radius: config.explosionRadius,
  }));
  if (config.blastDamagesEnemies) {
    for (const zombie of [...state.zombies]) {
      if (Math.hypot(zombie.x - x, zombie.y - y) <= config.explosionRadius + zombie.radius) {
        applyZombieDamage(state, zombie, config.explosionDamage);
      }
    }
  }
  if (
    config.blastDamagesPlayer &&
    state.player.alive &&
    Math.hypot(state.player.x - x, state.player.y - y) <=
      config.explosionRadius + state.player.radius
  ) {
    applyIndustrialPlayerDamage(
      state,
      config.explosionDamage,
      GAME_PALETTE.orbs.bomb,
      false,
    );
  }
  for (const obstacle of state.arenaObstacles) {
    if (
      (obstacle.kind !== 'crate' && obstacle.kind !== 'barricade') ||
      obstacle.health === undefined ||
      obstacle.health <= 0
    ) continue;
    const bounds = getArenaObstacleBounds(obstacle, state.arenaWidth, state.arenaHeight);
    if (Math.hypot(bounds.x + bounds.width / 2 - x, bounds.y + bounds.height / 2 - y) <=
        config.explosionRadius) {
      damageArenaObstacle(state, obstacle, config.explosionDamage);
    }
  }
  endPerformanceEvent('explosionHazardCreation', startedAt);
}

function detonateMilitaryFuelDrum(
  state: GameState,
  object: Extract<MilitaryOutpostEntity, { kind: 'fuel-drum' }>,
): void {
  if (object.blastDamageApplied) return;
  const startedAt = beginPerformanceEvent();
  object.blastDamageApplied = true;
  object.phase = 'blast';
  object.phaseRemainingSeconds = MILITARY_OBJECT_CONFIG.fuelDrum.blastDurationSeconds;
  const x = state.arenaWidth * object.xFraction;
  const y = state.arenaHeight * object.yFraction;
  const { blastRadius, blastDamage } = MILITARY_OBJECT_CONFIG.fuelDrum;
  state.impacts.push(createImpact(state, x, y, {
    kind: 'bomb',
    critical: true,
    color: '#EF8A42',
    radius: blastRadius,
  }));
  for (const zombie of [...state.zombies]) {
    if (Math.hypot(zombie.x - x, zombie.y - y) <= blastRadius + zombie.radius) {
      applyZombieDamage(state, zombie, blastDamage);
    }
  }
  endPerformanceEvent('explosionHazardCreation', startedAt);
}

function applyMilitaryWireDamage(
  state: GameState,
  actor: {
    x: number;
    y: number;
    radius: number;
    militaryHazardCooldownSeconds?: number;
  },
  isPlayer: boolean,
): void {
  const wire = state.militaryObjects.find((object) =>
    object.kind === 'razor-wire' &&
    object.active &&
    circleOverlapsRectangle(
      actor,
      actor.radius,
      getMilitaryObjectBounds(state, object),
    ),
  );
  const turretWire = state.militaryObjects.find((object) =>
    object.kind === 'abandoned-turret' &&
    circleOverlapsRectangleBorder(
      actor,
      getMilitaryTurretWireBounds(state, object),
    ),
  );
  if (!wire && !turretWire) {
    actor.militaryHazardCooldownSeconds = 0;
    return;
  }
  if ((actor.militaryHazardCooldownSeconds ?? 0) > 0) return;
  actor.militaryHazardCooldownSeconds = turretWire
    ? MILITARY_OBJECT_CONFIG.abandonedTurret.wireDamageIntervalSeconds
    : MILITARY_OBJECT_CONFIG.razorWire.damageIntervalSeconds;
  const damage = turretWire
    ? MILITARY_OBJECT_CONFIG.abandonedTurret.wireDamage
    : MILITARY_OBJECT_CONFIG.razorWire.damage;
  if (isPlayer) {
    applyIndustrialPlayerDamage(
      state,
      damage,
      '#A9AA8C',
      false,
    );
  } else {
    const zombie = actor as ZombieEntity;
    applyZombieDamage(state, zombie, damage);
  }
}

function updateMilitaryOutpostObjects(
  state: GameState,
  deltaSeconds: number,
): void {
  if (state.arenaTheme !== 'military' || state.wave.phase !== 'combat') return;
  for (const object of state.militaryObjects) {
    if (object.kind === 'sandbag-barricade') {
      object.spillRemainingSeconds = Math.max(0, object.spillRemainingSeconds - deltaSeconds);
      continue;
    }
    if (object.kind === 'military-ammo-crate') {
      object.explosionRemainingSeconds = Math.max(
        0,
        object.explosionRemainingSeconds - deltaSeconds,
      );
      continue;
    }
    if (object.kind === 'fuel-drum') {
      if (object.phase === 'igniting') {
        object.phaseRemainingSeconds -= deltaSeconds;
        if (object.phaseRemainingSeconds <= 0) detonateMilitaryFuelDrum(state, object);
      } else if (object.phase === 'blast') {
        object.phaseRemainingSeconds -= deltaSeconds;
        if (object.phaseRemainingSeconds <= 0) {
          object.phase = 'aftermath';
          object.phaseRemainingSeconds =
            MILITARY_OBJECT_CONFIG.fuelDrum.aftermathDurationSeconds;
        }
      } else if (object.phase === 'aftermath') {
        object.phaseRemainingSeconds -= deltaSeconds;
        if (object.phaseRemainingSeconds <= 0) object.phase = 'finished';
      }
      continue;
    }
    if (object.kind === 'razor-wire') {
      if (object.active) {
        object.remainingSeconds = Math.max(0, object.remainingSeconds - deltaSeconds);
        if (object.remainingSeconds === 0) object.active = false;
      }
      continue;
    }
    if (object.kind === 'military-supply-crate') {
      object.destructionRemainingSeconds = Math.max(
        0,
        object.destructionRemainingSeconds - deltaSeconds,
      );
      continue;
    }
    if (object.kind === 'abandoned-turret') {
      object.muzzleFlashSeconds = Math.max(0, object.muzzleFlashSeconds - deltaSeconds);
      const x = state.arenaWidth * object.xFraction;
      const y = state.arenaHeight * object.yFraction;
      if (object.state === 'firing' && object.muzzleFlashSeconds === 0) {
        object.state = object.health / object.maxHealth < 0.5 ? 'damaged' : 'active';
      }
      const inRange = state.player.alive &&
        Math.hypot(state.player.x - x, state.player.y - y) <=
          MILITARY_OBJECT_CONFIG.abandonedTurret.reviveRange;
      if (inRange && object.state !== 'active' && object.state !== 'firing' &&
          object.state !== 'damaged') {
        const duration = object.health <= 0
          ? MILITARY_OBJECT_CONFIG.abandonedTurret.rebuildDurationSeconds
          : MILITARY_OBJECT_CONFIG.abandonedTurret.reviveDurationSeconds;
        object.reviveProgress = Math.min(
          1,
          object.reviveProgress + deltaSeconds / duration,
        );
        object.state = object.reviveProgress >= 1 ? 'active' : 'reviving';
        if (object.state === 'active') {
          object.health = object.maxHealth;
          for (const zombie of state.zombies) zombie.militaryTurretTargetChecked = false;
        }
      } else if (!inRange && object.state !== 'active' && object.state !== 'firing' &&
          object.state !== 'damaged') {
        object.reviveProgress = 0;
        object.state = object.health <= 0 ? 'destroyed' : 'broken';
      } else if (object.state !== 'firing') {
        object.state = object.health / object.maxHealth < 0.5 ? 'damaged' : 'active';
      }
    }
  }
  applyMilitaryWireDamage(state, state.player, true);
}

function detonateExplosiveRound(
  state: GameState,
  projectile: ProjectileEntity,
  target: ZombieEntity,
): void {
  const startedAt = beginPerformanceEvent();
  const radius = RARE_UPGRADE_EFFECT_CONFIG.explosiveRadius;
  state.impacts.push(createImpact(state, target.x, target.y, {
    kind: 'bomb',
    critical: projectile.kind === 'critical',
    color: GAME_PALETTE.combat.critical,
    radius,
  }));
  for (const zombie of [...state.zombies]) {
    if (
      zombie.id === target.id ||
      Math.hypot(zombie.x - target.x, zombie.y - target.y) >
        radius + zombie.radius
    ) {
      continue;
    }
    applyZombieDamage(
      state,
      zombie,
      projectile.damage *
        RARE_UPGRADE_EFFECT_CONFIG.explosiveDamageMultiplier,
      false,
      'splash',
    );
  }
}

function detonateBomb(state: GameState): void {
  if (
    state.bombs <= 0 ||
    !state.player.alive ||
    state.wave.phase !== 'combat'
  ) {
    return;
  }

  const startedAt = beginPerformanceEvent();
  state.bombs -= 1;
  for (const zombie of [...state.zombies]) {
    const distance = Math.hypot(
      zombie.x - state.player.x,
      zombie.y - state.player.y,
    );
    if (distance > GAME_PROGRESSION_CONFIG.bombRadius) continue;
    const blocked = getArenaObstacles(
      state.arenaWidth,
      state.arenaHeight,
      getMilitaryCollisionObstacles(state),
    ).some((obstacle) =>
      segmentIntersectsRectangle(state.player, zombie, obstacle),
    );
    if (!blocked) {
      applyZombieDamage(state, zombie, GAME_PROGRESSION_CONFIG.bombDamage);
    }
  }
  state.impacts.push(createImpact(state, state.player.x, state.player.y, {
    kind: 'bomb',
    critical: true,
    color: GAME_PALETTE.orbs.bomb,
    radius: GAME_PROGRESSION_CONFIG.bombRadius,
  }));
  endPerformanceEvent('explosionHazardCreation', startedAt);
}

export function placeSupportTurret(
  state: GameState,
  x: number,
  y: number,
): boolean {
  const radius = GAME_VISUAL_CONFIG.entity.supportTurretRadius;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    state.turrets <= 0 ||
    state.supportTurrets.length >=
      GAME_PROGRESSION_CONFIG.maximumTurretInventory ||
    !state.player.alive ||
    state.wave.phase !== 'combat' ||
    x < radius ||
    y < radius ||
    x > state.arenaWidth - radius ||
    y > state.arenaHeight - radius
  ) {
    return false;
  }

  const position = { x, y };
  const obstacles = getArenaObstacles(
    state.arenaWidth,
    state.arenaHeight,
    getMilitaryCollisionObstacles(state),
  );
  if (
    obstacles.some((obstacle) =>
      circleOverlapsRectangle(position, radius, obstacle),
    ) ||
    Math.hypot(x - state.player.x, y - state.player.y) <
      radius + state.player.radius ||
    state.zombies.some((zombie) =>
      Math.hypot(x - zombie.x, y - zombie.y) < radius + zombie.radius,
    ) ||
    state.items.some((item) =>
      Math.hypot(x - item.x, y - item.y) < radius + item.radius,
    ) ||
    state.supportTurrets.some((turret) =>
      Math.hypot(x - turret.x, y - turret.y) <
        radius + GAME_VISUAL_CONFIG.entity.supportTurretRadius,
    )
  ) {
    return false;
  }

  state.turrets -= 1;
  state.supportTurrets.push({
    id: state.nextEntityId++,
    x,
    y,
    aimAngle: 0,
    durationSeconds: ORB_SYSTEM_CONFIG.turretDurationSeconds,
    remainingSeconds: ORB_SYSTEM_CONFIG.turretDurationSeconds,
    attackCooldownSeconds: 0,
  });
  return true;
}

function collectOrb(
  state: GameState,
  itemId: number,
  type: GameItemType,
  x: number,
  y: number,
): void {
  const startedAt = beginPerformanceEvent();
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
        countPerformanceEvent('temporaryEffectsCreated');
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
        countPerformanceEvent('temporaryEffectsCreated');
      }
      updateShieldStrength(state);
      break;
    }
    case 'bomb':
      state.bombs = Math.min(
        GAME_PROGRESSION_CONFIG.maximumBombInventory,
        state.bombs + 1,
      );
      break;
    case 'magnet': {
      const effect = getEffect(state, 'magnet');
      if (effect) {
        effect.remainingSeconds = ORB_SYSTEM_CONFIG.magnetDurationSeconds;
      } else {
        state.activeEffects.push({
          type,
          durationSeconds: ORB_SYSTEM_CONFIG.magnetDurationSeconds,
          remainingSeconds: ORB_SYSTEM_CONFIG.magnetDurationSeconds,
        });
        countPerformanceEvent('temporaryEffectsCreated');
      }
      break;
    }
    case 'turret': {
      state.turrets = Math.min(
        GAME_PROGRESSION_CONFIG.maximumTurretInventory,
        state.turrets + 1,
      );
      break;
    }
    case 'cursed': {
      const effect = getEffect(state, 'cursed');
      if (effect) {
        effect.remainingSeconds = ORB_SYSTEM_CONFIG.cursedDurationSeconds;
      } else {
        state.activeEffects.push({
          type,
          durationSeconds: ORB_SYSTEM_CONFIG.cursedDurationSeconds,
          remainingSeconds: ORB_SYSTEM_CONFIG.cursedDurationSeconds,
        });
        countPerformanceEvent('temporaryEffectsCreated');
      }
      break;
    }
    case 'rareGold':
      if (applyRareGoldReward(state.progression, itemId)) {
        state.statistics.rareCurrency = { ...state.progression.rare };
        state.statistics.rareUpgradeUnlocked = {
          ...state.progression.rareUpgradeUnlocked,
        };
      }
      break;
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
  countPerformanceEvent('orbsCollected');
  countPerformanceEvent('collectionEffectsCreated');
  endPerformanceEvent('orbCollection', startedAt);
}

function getOrbAttractionRadius(state: GameState): number {
  const magnetLevel = state.progression.rareUpgradeLevels.orbMagnetism;
  const permanentRadius =
    RARE_UPGRADE_EFFECT_CONFIG.orbMagnetismRadiusByLevel[
      Math.min(
        magnetLevel,
        RARE_UPGRADE_EFFECT_CONFIG.orbMagnetismRadiusByLevel.length - 1,
      )
    ] ?? 0;
  return Math.max(
    permanentRadius,
    getEffect(state, 'magnet')
      ? ORB_SYSTEM_CONFIG.magnetAttractionRadius
      : 0,
  );
}

function updateOrbMagnetism(state: GameState, deltaSeconds: number): void {
  const attractionRadius = getOrbAttractionRadius(state);
  if (attractionRadius <= 0) return;

  const pickupDistance =
    GAME_VISUAL_CONFIG.entity.orbRadius +
    state.player.radius +
    GAME_PROGRESSION_CONFIG.orbPickupRadius;
  for (const item of state.items) {
    if (!isCollectibleOrb(item.type)) continue;
    const deltaX = state.player.x - item.x;
    const deltaY = state.player.y - item.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (
      distance <= pickupDistance ||
      distance > pickupDistance + attractionRadius ||
      distance === 0
    ) {
      continue;
    }

    const step = Math.min(
      distance - pickupDistance,
      ORB_SYSTEM_CONFIG.magnetAttractionSpeed * deltaSeconds,
    );
    const position = moveCircleInArena(
      item,
      item.radius,
      (deltaX / distance) * step,
      (deltaY / distance) * step,
      state.arenaWidth,
      state.arenaHeight,
      getMilitaryCollisionObstacles(state),
    );
    item.x = position.x;
    item.y = position.y;
  }
}

function updateItems(state: GameState, deltaSeconds: number): void {
  updateOrbMagnetism(state, deltaSeconds);
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
      (item.type === 'health' &&
        state.player.health >= state.player.maxHealth) ||
      (item.type === 'bomb' &&
        state.bombs >= GAME_PROGRESSION_CONFIG.maximumBombInventory) ||
      (item.type === 'turret' &&
        state.turrets >= GAME_PROGRESSION_CONFIG.maximumTurretInventory)
    ) {
      remainingItems.push(item);
      continue;
    }
    if (
      item.type === 'health' &&
      state.player.health >= state.player.maxHealth
    ) {
      remainingItems.push(item);
      continue;
    }
    if (
      Math.hypot(item.x - state.player.x, item.y - state.player.y) <=
      item.radius + state.player.radius + GAME_PROGRESSION_CONFIG.orbPickupRadius
    ) {
      collectOrb(state, item.id, item.type, item.x, item.y);
      continue;
    }
    remainingItems.push(item);
  }
  state.items = remainingItems;
}

function detonateElite(state: GameState, zombie: ZombieEntity): void {
  zombie.eliteExplosionSeconds = undefined;
  zombie.eliteExplosionDurationSeconds = undefined;
  state.impacts.push(createImpact(state, zombie.x, zombie.y, {
    kind: 'bomb',
    critical: true,
    color: '#d6b77f',
    radius: ELITE_CONFIG.explosionRadius,
  }));
  defeatZombie(state, zombie);

  if (ELITE_CONFIG.explosionDamagesEnemies) {
    for (const target of [...state.zombies]) {
      if (
        Math.hypot(target.x - zombie.x, target.y - zombie.y) <=
        ELITE_CONFIG.explosionRadius + target.radius
      ) {
        applyZombieDamage(
          state,
          target,
          ELITE_CONFIG.explosionDamage,
          true,
        );
      }
    }
  }

  const { player } = state;
  if (
    ELITE_CONFIG.explosionDamagesPlayer &&
    player.alive &&
    Math.hypot(player.x - zombie.x, player.y - zombie.y) <=
      ELITE_CONFIG.explosionRadius + player.radius
  ) {
    const damage = ELITE_CONFIG.explosionDamage;
    const { healthDamage, shieldDamage } = applyPlayerDamage(state, damage);
    player.damageCooldownSeconds = GAME_COMBAT_CONFIG.playerHitCooldownSeconds;
    player.hitFlashSeconds = 0.22;
    state.statistics.totalDamageReceived += damage;
    state.impacts.push(createImpact(state, player.x, player.y, {
      kind: 'playerDamage',
      critical: healthDamage > 0,
      shieldAbsorbed: shieldDamage > 0,
      color: healthDamage > 0
        ? GAME_PALETTE.combat.damage
        : GAME_PALETTE.player.shield,
      radius: 24,
    }));
    if (healthDamage > 0) {
      state.damageNumbers.push(
        createDamageNumber(
          state,
          player.x,
          player.y - player.radius,
          healthDamage,
        ),
      );
    }
    if (!player.alive) {
      state.wave.phase = 'gameOver';
      state.wave.announcement = 'Run over';
      state.wave.announcementSeconds = 0;
    }
  }
}

function updateElites(state: GameState, deltaSeconds: number): void {
  for (const zombie of [...state.zombies]) {
    if (updateElite(zombie, deltaSeconds)) {
      detonateElite(state, zombie);
    }
  }
}

function updateSupportTurrets(state: GameState, deltaSeconds: number): void {
  const activeTurrets = [];
  const obstacles = getArenaObstacles(
    state.arenaWidth,
    state.arenaHeight,
    getMilitaryCollisionObstacles(state),
  );
  for (const turret of state.supportTurrets) {
    turret.remainingSeconds -= deltaSeconds;
    turret.attackCooldownSeconds = Math.max(
      0,
      turret.attackCooldownSeconds - deltaSeconds,
    );
    if (turret.remainingSeconds <= 0) continue;

    if (turret.attackCooldownSeconds === 0) {
      const target = state.zombies
        .filter((zombie) => {
          const distance = Math.hypot(zombie.x - turret.x, zombie.y - turret.y);
          return distance <= ORB_SYSTEM_CONFIG.turretRange &&
            !obstacles.some((obstacle) =>
              segmentIntersectsRectangle(turret, zombie, obstacle),
            );
        })
        .sort(
          (left, right) =>
            Math.hypot(left.x - turret.x, left.y - turret.y) -
            Math.hypot(right.x - turret.x, right.y - turret.y),
        )[0];
      if (target) {
        const angle = Math.atan2(target.y - turret.y, target.x - turret.x);
        const directionX = Math.cos(angle);
        const directionY = Math.sin(angle);
        const radius = GAME_VISUAL_CONFIG.entity.projectileRadius;
        const muzzleDistance = 13 + radius;
        turret.aimAngle = angle;
        state.projectiles.push({
          id: state.nextEntityId++,
          x: turret.x + directionX * muzzleDistance,
          y: turret.y + directionY * muzzleDistance,
          directionX,
          directionY,
          radius,
          damage: ORB_SYSTEM_CONFIG.turretDamage,
          speed: GAME_COMBAT_CONFIG.projectileSpeed,
          remainingSeconds: GAME_COMBAT_CONFIG.projectileLifetimeSeconds,
          owner: 'turret',
          kind: 'turret',
        });
        turret.attackCooldownSeconds = 1 / ORB_SYSTEM_CONFIG.turretShotsPerSecond;
      }
    }
    activeTurrets.push(turret);
  }
  state.supportTurrets = activeTurrets;
}

function updateMilitaryTurrets(state: GameState, deltaSeconds: number): void {
  if (state.arenaTheme !== 'military') return;
  for (const turret of state.militaryObjects) {
    if (
      turret.kind !== 'abandoned-turret' ||
      (turret.state !== 'active' && turret.state !== 'damaged' && turret.state !== 'firing')
    ) continue;
    turret.attackCooldownSeconds = Math.max(0, turret.attackCooldownSeconds - deltaSeconds);
    if (turret.attackCooldownSeconds > 0) continue;

    const x = state.arenaWidth * turret.xFraction;
    const y = state.arenaHeight * turret.yFraction;
    const obstacles = getArenaObstacles(
      state.arenaWidth,
      state.arenaHeight,
      getMilitaryCollisionObstacles(state),
    );
    const target = state.zombies
      .filter((zombie) => {
        const distance = Math.hypot(zombie.x - x, zombie.y - y);
        return distance <= ORB_SYSTEM_CONFIG.turretRange &&
          !obstacles.some((obstacle) =>
            Math.hypot(
              obstacle.x + obstacle.width / 2 - x,
              obstacle.y + obstacle.height / 2 - y,
            ) > 1 &&
            segmentIntersectsRectangle({ x, y }, zombie, obstacle),
          );
      })
      .sort((left, right) =>
        Math.hypot(left.x - x, left.y - y) -
        Math.hypot(right.x - x, right.y - y),
      )[0];
    if (!target) continue;

    const angle = Math.atan2(target.y - y, target.x - x);
    const directionX = Math.cos(angle);
    const directionY = Math.sin(angle);
    const radius = GAME_VISUAL_CONFIG.entity.projectileRadius;
    const muzzleDistance = Math.max(turret.width, turret.height) * 0.5 + radius + 2;
    turret.facingAngle = angle;
    turret.muzzleFlashSeconds = GAME_COMBAT_CONFIG.muzzleFlashDurationSeconds;
    turret.state = 'firing';
    turret.attackCooldownSeconds = 1 / ORB_SYSTEM_CONFIG.turretShotsPerSecond;
    state.projectiles.push({
      id: state.nextEntityId++,
      x: x + directionX * muzzleDistance,
      y: y + directionY * muzzleDistance,
      directionX,
      directionY,
      radius,
      damage: ORB_SYSTEM_CONFIG.turretDamage,
      speed: GAME_COMBAT_CONFIG.projectileSpeed,
      remainingSeconds: GAME_COMBAT_CONFIG.projectileLifetimeSeconds,
      owner: 'turret',
      kind: 'turret',
    });
  }
}
function updateHazards(state: GameState, deltaSeconds: number): void {
  const remainingHazards: typeof state.hazards = [];
  for (const hazard of state.hazards) {
    hazard.remainingSeconds -= deltaSeconds;
    if (hazard.remainingSeconds <= 0) continue;

    const distanceToPlayer = Math.hypot(hazard.x - state.player.x, hazard.y - state.player.y);
    if (distanceToPlayer <= hazard.radius + state.player.radius) {
      const damage = Math.max(1, Math.ceil(hazard.damage * deltaSeconds * 2));
      applyPlayerDamage(state, damage);
      state.player.hitFlashSeconds = 0.16;
      if (!state.player.alive) {
        state.wave.phase = 'gameOver';
        state.wave.announcement = 'Run over';
        state.wave.announcementSeconds = 0;
      }
    }
    remainingHazards.push(hazard);
  }
  state.hazards = remainingHazards;
}

function updateDamageCooldowns(
  cooldowns: Record<string, number>,
  deltaSeconds: number,
): void {
  for (const key of Object.keys(cooldowns)) {
    cooldowns[key] = Math.max(0, cooldowns[key]! - deltaSeconds);
  }
}

function isWithinEllipse(
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  actor: { readonly x: number; readonly y: number; readonly radius: number },
): boolean {
  const horizontal = radiusX + actor.radius;
  const vertical = radiusY + actor.radius;
  const dx = (actor.x - x) / horizontal;
  const dy = (actor.y - y) / vertical;
  return dx * dx + dy * dy <= 1;
}

function applyContaminatedAreaDamage(
  state: GameState,
  x: number,
  y: number,
  radius: number,
  damage: number,
): void {
  const player = state.player;
  if (
    player.alive &&
    Math.hypot(player.x - x, player.y - y) <= radius + player.radius
  ) {
    applyIndustrialPlayerDamage(state, damage, '#86C66E', false);
  }
  for (const zombie of [...state.zombies]) {
    if (Math.hypot(zombie.x - x, zombie.y - y) <= radius + zombie.radius) {
      applyZombieDamage(state, zombie, damage);
    }
  }
}

function ruptureContaminatedObject(
  state: GameState,
  object: ToxicBarrelEntity | ChemicalTankEntity |
    MutagenContainerEntity | BiohazardWasteBinEntity,
): void {
  const startedAt = beginPerformanceEvent();
  const config = CONTAMINATED_OBJECT_CONFIG;
  object.destroyed = true;
  if (object.kind === 'toxic-barrel') {
    object.ruptureRemainingSeconds = object.ruptureDurationSeconds;
    object.puddleId = `${object.id}-puddle`;
    state.contaminatedObjects.push(createContaminatedPuddle(
      object.puddleId,
      object.x,
      object.y,
      config.toxicBarrel.puddleRadiusX,
      config.toxicBarrel.puddleRadiusY,
      config.toxicBarrel.puddleDurationSeconds,
      config.toxicBarrel.puddleDamage,
      config.toxicBarrel.puddleDamageIntervalSeconds,
      config.toxicBarrel.zombieSlowMultiplier,
      object.id.length,
    ));
    countPerformanceEvent('hazardsCreated');
    state.impacts.push(createImpact(state, object.x, object.y, {
      kind: 'acid',
      critical: true,
      color: '#86C66E',
      radius: config.toxicBarrel.burstRadius,
    }));
    applyContaminatedAreaDamage(
      state,
      object.x,
      object.y,
      config.toxicBarrel.burstRadius,
      config.toxicBarrel.burstDamage,
    );
    endPerformanceEvent('explosionHazardCreation', startedAt);
    return;
  }

  if (object.kind === 'chemical-tank') {
    object.ruptureRemainingSeconds = object.ruptureDurationSeconds;
    const angle = getDeterministicRoll(
      object.id.length,
      state.wave.currentWave,
      871,
    ) * Math.PI * 2;
    object.cloud = createToxicCloud(
      `${object.id}-cloud`,
      object.x,
      object.y,
      Math.cos(angle),
      Math.sin(angle),
    );
    countPerformanceEvent('hazardsCreated');
    state.impacts.push(createImpact(state, object.x, object.y, {
      kind: 'acid',
      critical: true,
      color: '#86C66E',
      radius: config.chemicalTank.cloudRadiusX,
    }));
    endPerformanceEvent('explosionHazardCreation', startedAt);
    return;
  }

  if (object.kind === 'mutagen-container') {
    object.ruptureRemainingSeconds = object.ruptureDurationSeconds;
    object.spawnBurstRemainingSeconds = object.spawnBurstDurationSeconds;
    object.spill = {
      ageSeconds: 0,
      remainingSeconds: config.mutagenContainer.spillDurationSeconds,
      durationSeconds: config.mutagenContainer.spillDurationSeconds,
      radius: config.mutagenContainer.spillRadius,
      radiusX: config.mutagenContainer.spillRadiusX,
      radiusY: config.mutagenContainer.spillRadiusY,
    };
    countPerformanceEvent('hazardsCreated');
    const spawnTypes = ['armoured', 'brute', 'runner'] as const;
    const spawnCount = Math.min(
      config.mutagenContainer.spawnCount,
      config.maximumMutagenSpawnsPerRupture,
      Math.max(0, WAVE_SPAWN_CONFIG.maximumActiveEnemies - state.zombies.length),
    );
    for (let index = 0; index < spawnCount; index += 1) {
      const angle = (index / spawnCount) * Math.PI * 2;
      const spawn = findCirclePositionInArena(
        {
          x: object.x + Math.cos(angle) * 34,
          y: object.y + Math.sin(angle) * 34,
        },
        GAME_VISUAL_CONFIG.entity.armouredRadius,
        state.arenaWidth,
        state.arenaHeight,
        getMilitaryCollisionObstacles(state),
      );
      const zombie = createZombie(
        state.nextEntityId++,
        spawnTypes[index % spawnTypes.length]!,
        spawn.x,
        spawn.y,
        state.wave.currentWave,
      );
      zombie.mutagenSpawnBuff = true;
      state.zombies.push(zombie);
    }
    state.impacts.push(createImpact(state, object.x, object.y, {
      kind: 'spawn',
      critical: true,
      color: '#B4D987',
      radius: config.mutagenContainer.spillRadius,
    }));
    endPerformanceEvent('explosionHazardCreation', startedAt);
    return;
  }

  object.ruptureRemainingSeconds = object.ruptureDurationSeconds;
  object.puddleId = `${object.id}-puddle`;
  state.contaminatedObjects.push(createContaminatedPuddle(
    object.puddleId,
    object.x,
    object.y,
    config.biohazardWasteBin.puddleRadiusX,
    config.biohazardWasteBin.puddleRadiusY,
    config.biohazardWasteBin.puddleDurationSeconds,
    config.biohazardWasteBin.puddleDamage,
    config.biohazardWasteBin.puddleDamageIntervalSeconds,
    config.biohazardWasteBin.zombieSlowMultiplier,
    object.id.length,
  ));
  countPerformanceEvent('hazardsCreated');
  state.impacts.push(createImpact(state, object.x, object.y, {
    kind: 'acid',
    critical: true,
    color: '#86C66E',
    radius: config.biohazardWasteBin.splashRadius,
  }));
  applyContaminatedAreaDamage(
    state,
    object.x,
    object.y,
    config.biohazardWasteBin.splashRadius,
    config.biohazardWasteBin.splashDamage,
  );
  endPerformanceEvent('explosionHazardCreation', startedAt);
}

function damageContaminatedObject(
  state: GameState,
  entity: ContaminatedArenaEntity,
  damage: number,
): void {
  if (
    !('health' in entity) ||
    entity.destroyed ||
    !Number.isFinite(damage) ||
    damage <= 0
  ) return;
  const destructionStartedAt = beginPerformanceEvent();
  const dealt = Math.min(entity.health, damage);
  entity.health = Math.max(0, entity.health - damage);
  const destroyed = entity.health === 0;
  state.impacts.push(createImpact(state, entity.x, entity.y, {
    kind: destroyed ? 'acid' : 'hit',
    critical: destroyed,
    color: '#86C66E',
    radius: destroyed ? 44 : 16,
  }));
  state.damageNumbers.push(
    createDamageNumber(state, entity.x, entity.y - entity.height * 0.6, dealt),
  );
  if (destroyed) {
    countPerformanceEvent('arenaObjectDestructionEvents');
    ruptureContaminatedObject(
      state,
      entity as ToxicBarrelEntity | ChemicalTankEntity |
        MutagenContainerEntity | BiohazardWasteBinEntity,
    );
    endPerformanceEvent('arenaObjectDestruction', destructionStartedAt);
  } else if (entity.kind === 'chemical-tank') {
    entity.pressure = Math.min(
      1,
      0.2 + (1 - entity.health / entity.maxHealth) * 0.78,
    );
  }
}

function applyPuddleContactEffects(
  state: GameState,
  puddle: ContaminatedPuddleEntity,
): void {
  const playerKey = getContaminatedDamageKey('player');
  if (
    state.player.alive &&
    isActorInPuddle(puddle, state.player) &&
    (puddle.damageCooldowns[playerKey] ?? 0) <= 0
  ) {
    applyIndustrialPlayerDamage(state, puddle.damage, '#86C66E', false);
    puddle.damageCooldowns[playerKey] = puddle.damageIntervalSeconds;
  }
  for (const zombie of [...state.zombies]) {
    const key = getContaminatedDamageKey(zombie.id);
    if (isActorInPuddle(puddle, zombie)) {
      puddle.damageCooldowns[key] = Math.max(
        puddle.damageCooldowns[key] ?? 0,
        0.12,
      );
    } else if ((puddle.damageCooldowns[key] ?? 0) <= 0) {
      delete puddle.damageCooldowns[key];
    }
  }
}

function damageCloudContacts(
  state: GameState,
  cloud: ToxicCloudEntity,
  deltaSeconds: number,
): void {
  updateDamageCooldowns(cloud.damageCooldowns, deltaSeconds);
  const playerKey = getContaminatedDamageKey('player');
  if (
    state.player.alive &&
    isWithinEllipse(
      cloud.x,
      cloud.y,
      cloud.radiusX,
      cloud.radiusY,
      state.player,
    ) &&
    (cloud.damageCooldowns[playerKey] ?? 0) <= 0
  ) {
    applyIndustrialPlayerDamage(state, cloud.damage, '#86C66E', false);
    cloud.damageCooldowns[playerKey] = cloud.damageIntervalSeconds;
  }
  for (const zombie of [...state.zombies]) {
    const key = getContaminatedDamageKey(zombie.id);
    if (
      isWithinEllipse(
        cloud.x,
        cloud.y,
        cloud.radiusX,
        cloud.radiusY,
        zombie,
      ) &&
      (cloud.damageCooldowns[key] ?? 0) <= 0
    ) {
      applyZombieDamage(state, zombie, cloud.damage);
      cloud.damageCooldowns[key] = cloud.damageIntervalSeconds;
    }
  }
}

function getPipeActorsInSpray(
  pipe: Extract<ContaminatedArenaEntity, { kind: 'leaking-pipe' }>,
  actor: { readonly x: number; readonly y: number; readonly radius: number },
): boolean {
  const cosine = Math.cos(pipe.rotation);
  const sine = Math.sin(pipe.rotation);
  const leakX = pipe.x + pipe.leakX * cosine - pipe.leakY * sine;
  const leakY = pipe.y + pipe.leakX * sine + pipe.leakY * cosine;
  const dx = actor.x - leakX;
  const dy = actor.y - leakY;
  const along = dx * pipe.directionX + dy * pipe.directionY;
  const across = Math.abs(dx * pipe.directionY - dy * pipe.directionX);
  return along >= -actor.radius &&
    along <= CONTAMINATED_OBJECT_CONFIG.leakingPipe.sprayLength + actor.radius &&
    across <= CONTAMINATED_OBJECT_CONFIG.leakingPipe.sprayWidth / 2 + actor.radius;
}

function updateLeakingPipe(
  state: GameState,
  pipe: Extract<ContaminatedArenaEntity, { kind: 'leaking-pipe' }>,
  deltaSeconds: number,
): void {
  const config = CONTAMINATED_OBJECT_CONFIG.leakingPipe;
  updateDamageCooldowns(pipe.damageCooldowns, deltaSeconds);
  pipe.phaseRemainingSeconds -= deltaSeconds;
  if (pipe.phaseRemainingSeconds <= 0) {
    if (pipe.phase === 'idle') {
      pipe.phase = 'warning';
      pipe.phaseRemainingSeconds = config.warningDurationSeconds;
    } else if (pipe.phase === 'warning') {
      pipe.phase = 'spraying';
      pipe.phaseRemainingSeconds = config.sprayDurationSeconds;
    } else if (pipe.phase === 'spraying') {
      pipe.phase = 'cooldown';
      pipe.phaseRemainingSeconds = config.cooldownDurationSeconds;
    } else {
      pipe.phase = 'warning';
      pipe.phaseRemainingSeconds = config.warningDurationSeconds;
    }
  }
  const phaseDuration = pipe.phase === 'warning'
    ? config.warningDurationSeconds
    : pipe.phase === 'spraying'
      ? config.sprayDurationSeconds
      : pipe.phase === 'cooldown'
        ? config.cooldownDurationSeconds
        : 1;
  pipe.phaseProgress = Math.max(
    0,
    Math.min(1, 1 - pipe.phaseRemainingSeconds / phaseDuration),
  );
  if (pipe.phase !== 'spraying') return;

  const playerKey = getContaminatedDamageKey('player');
  if (
    state.player.alive &&
    getPipeActorsInSpray(pipe, state.player) &&
    (pipe.damageCooldowns[playerKey] ?? 0) <= 0
  ) {
    applyIndustrialPlayerDamage(state, config.damage, '#86C66E', false);
    pipe.damageCooldowns[playerKey] = config.damageIntervalSeconds;
  }
  for (const zombie of [...state.zombies]) {
    const key = getContaminatedDamageKey(zombie.id);
    if (
      getPipeActorsInSpray(pipe, zombie) &&
      (pipe.damageCooldowns[key] ?? 0) <= 0
    ) {
      applyZombieDamage(state, zombie, config.damage);
      pipe.damageCooldowns[key] = config.damageIntervalSeconds;
    }
  }
}

function pushActorsFromFan(
  state: GameState,
  fan: Extract<ContaminatedArenaEntity, { kind: 'broken-ventilation-fan' }>,
): void {
  const config = CONTAMINATED_OBJECT_CONFIG.brokenVentilationFan;
  const directionX = Math.cos(fan.directionAngle);
  const directionY = Math.sin(fan.directionAngle);
  const pushActor = (actor: { x: number; y: number; radius: number }): void => {
    const dx = actor.x - fan.x;
    const dy = actor.y - fan.y;
    const distance = Math.hypot(dx, dy);
    if (distance > config.influenceRadius) return;
    const falloff = Math.max(0.25, 1 - distance / config.influenceRadius);
    const movement = moveCircleInArena(
      actor,
      actor.radius,
      directionX * config.pushDistance * falloff,
      directionY * config.pushDistance * falloff,
      state.arenaWidth,
      state.arenaHeight,
      getMilitaryCollisionObstacles(state),
    );
    actor.x = movement.x;
    actor.y = movement.y;
  };
  pushActor(state.player);
  for (const zombie of state.zombies) pushActor(zombie);
  fan.pushedActorIds = state.zombies.map((zombie) => zombie.id);
}

function updateBrokenFan(
  state: GameState,
  fan: Extract<ContaminatedArenaEntity, { kind: 'broken-ventilation-fan' }>,
  deltaSeconds: number,
): void {
  const config = CONTAMINATED_OBJECT_CONFIG.brokenVentilationFan;
  fan.phaseRemainingSeconds -= deltaSeconds;
  if (fan.phaseRemainingSeconds > 0) {
    const duration = fan.phase === 'idle'
      ? config.idleDurationSeconds
      : fan.phase === 'warning'
        ? config.warningDurationSeconds
        : fan.phase === 'active'
          ? config.activeDurationSeconds
          : config.cooldownDurationSeconds;
    fan.phaseProgress = Math.max(
      0,
      Math.min(1, 1 - fan.phaseRemainingSeconds / duration),
    );
    return;
  }

  if (fan.phase === 'idle' || fan.phase === 'cooldown') {
    fan.phase = 'warning';
    fan.phaseRemainingSeconds = config.warningDurationSeconds;
    fan.phaseProgress = 0;
    fan.burstIndex += 1;
    fan.directionAngle = -Math.PI / 2 + fan.burstIndex * Math.PI * 0.5;
    fan.pushedActorIds = [];
  } else if (fan.phase === 'warning') {
    fan.phase = 'active';
    fan.phaseRemainingSeconds = config.activeDurationSeconds;
    fan.phaseProgress = 0;
    pushActorsFromFan(state, fan);
  } else {
    fan.phase = 'cooldown';
    fan.phaseRemainingSeconds = config.cooldownDurationSeconds;
    fan.phaseProgress = 0;
  }
}

function updateChemicalCloud(
  state: GameState,
  tank: ChemicalTankEntity,
  cloud: ToxicCloudEntity,
  deltaSeconds: number,
): void {
  cloud.ageSeconds += deltaSeconds;
  cloud.remainingSeconds -= deltaSeconds;
  if (cloud.remainingSeconds <= 0) {
    tank.cloud = undefined;
    return;
  }

  const fanConfig = CONTAMINATED_OBJECT_CONFIG.brokenVentilationFan;
  let windX = 0;
  let windY = 0;
  for (const entity of state.contaminatedObjects) {
    if (
      entity.kind !== 'broken-ventilation-fan' ||
      entity.phase !== 'active' ||
      Math.hypot(entity.x - cloud.x, entity.y - cloud.y) >
        fanConfig.influenceRadius
    ) continue;
    const strength = fanConfig.cloudInfluence;
    windX += Math.cos(entity.directionAngle) * strength;
    windY += Math.sin(entity.directionAngle) * strength;
  }

  const magnitude = Math.hypot(windX, windY);
  if (magnitude > 1) {
    windX /= magnitude;
    windY /= magnitude;
  }
  cloud.windInfluenceX = windX;
  cloud.windInfluenceY = windY;
  const combinedX = cloud.baseDirectionX +
    windX * CONTAMINATED_OBJECT_CONFIG.gasCloud.windInfluence;
  const combinedY = cloud.baseDirectionY +
    windY * CONTAMINATED_OBJECT_CONFIG.gasCloud.windInfluence;
  const combinedLength = Math.hypot(combinedX, combinedY) || 1;
  cloud.directionX = combinedX / combinedLength;
  cloud.directionY = combinedY / combinedLength;

  const speed = CONTAMINATED_OBJECT_CONFIG.chemicalTank.cloudSpeed;
  cloud.x += cloud.directionX * speed * deltaSeconds;
  cloud.y += cloud.directionY * speed * deltaSeconds;
  if (cloud.x < cloud.radiusX || cloud.x > state.arenaWidth - cloud.radiusX) {
    cloud.directionX *= -1;
    cloud.baseDirectionX *= -1;
    cloud.x = Math.max(cloud.radiusX, Math.min(state.arenaWidth - cloud.radiusX, cloud.x));
  }
  if (cloud.y < cloud.radiusY || cloud.y > state.arenaHeight - cloud.radiusY) {
    cloud.directionY *= -1;
    cloud.baseDirectionY *= -1;
    cloud.y = Math.max(cloud.radiusY, Math.min(state.arenaHeight - cloud.radiusY, cloud.y));
  }
  cloud.density = Math.max(
    0,
    Math.min(1, cloud.remainingSeconds / cloud.durationSeconds),
  );
  damageCloudContacts(state, cloud, deltaSeconds);
}

function updateMutagenSpill(
  state: GameState,
  container: MutagenContainerEntity,
  deltaSeconds: number,
): void {
  const spill = container.spill;
  if (!spill) return;
  spill.ageSeconds += deltaSeconds;
  spill.remainingSeconds -= deltaSeconds;
  if (spill.remainingSeconds <= 0) {
    container.spill = undefined;
    for (const zombie of state.zombies) {
      if (zombie.targetMutagenSpillId === container.id) {
        zombie.targetMutagenSpillId = undefined;
      }
    }
    return;
  }
  const buffRadius = CONTAMINATED_OBJECT_CONFIG.mutagenContainer.spillRadius;
  for (const zombie of state.zombies) {
    if (Math.hypot(zombie.x - container.x, zombie.y - container.y) <=
        buffRadius + zombie.radius) {
      zombie.mutagenTemporaryBuffUntil = state.elapsedSeconds +
        CONTAMINATED_OBJECT_CONFIG.mutagenContainer.temporaryBuffDurationSeconds;
    }
    if (
      zombie.targetMutagenSpillId === container.id &&
      (zombie.type === 'spitter' || zombie.type === 'screamer' || zombie.isBoss)
    ) {
      zombie.targetMutagenSpillId = undefined;
    }
  }
}

function updateContaminatedArena(state: GameState, deltaSeconds: number): void {
  if (state.arenaTheme !== 'contaminated' || state.wave.phase !== 'combat') return;
  for (const entity of state.contaminatedObjects) {
    if (entity.kind === 'contaminated-puddle') {
      updateDamageCooldowns(entity.damageCooldowns, deltaSeconds);
      entity.ageSeconds += deltaSeconds;
      entity.remainingSeconds -= deltaSeconds;
      entity.intensity = Math.max(
        0,
        Math.min(1, entity.remainingSeconds / entity.durationSeconds),
      );
      if (entity.remainingSeconds > 0) applyPuddleContactEffects(state, entity);
    } else if (entity.kind === 'chemical-tank') {
      entity.ruptureRemainingSeconds = Math.max(
        0,
        entity.ruptureRemainingSeconds - deltaSeconds,
      );
      if (entity.cloud) updateChemicalCloud(state, entity, entity.cloud, deltaSeconds);
      if (!entity.destroyed) {
        entity.pressure = Math.min(
          1,
          Math.max(entity.pressure, 0.2 + (1 - entity.health / entity.maxHealth) * 0.78),
        );
      }
    } else if (entity.kind === 'toxic-barrel' || entity.kind === 'biohazard-waste-bin') {
      entity.ruptureRemainingSeconds = Math.max(
        0,
        entity.ruptureRemainingSeconds - deltaSeconds,
      );
    } else if (entity.kind === 'mutagen-container') {
      entity.ruptureRemainingSeconds = Math.max(
        0,
        entity.ruptureRemainingSeconds - deltaSeconds,
      );
      entity.spawnBurstRemainingSeconds = Math.max(
        0,
        entity.spawnBurstRemainingSeconds - deltaSeconds,
      );
      if (!entity.destroyed) {
        entity.contentsIntensity = Math.min(
          1,
          Math.max(entity.contentsIntensity, 0.3 + (1 - entity.health / entity.maxHealth) * 0.65),
        );
      }
      updateMutagenSpill(state, entity, deltaSeconds);
    } else if (entity.kind === 'leaking-pipe') {
      updateLeakingPipe(state, entity, deltaSeconds);
    } else if (entity.kind === 'broken-ventilation-fan') {
      updateBrokenFan(state, entity, deltaSeconds);
    }
  }
  state.contaminatedObjects = state.contaminatedObjects.filter((entity) =>
    entity.kind !== 'contaminated-puddle' || entity.remainingSeconds > 0,
  );
}

function detonateGasCylinder(
  state: GameState,
  cylinder: GameState['gasCylinders'][number],
): void {
  const startedAt = beginPerformanceEvent();
  const { explosionRadius, damage } = INDUSTRIAL_OBJECT_CONFIG.gasCylinder;
  state.impacts.push(createImpact(state, cylinder.x, cylinder.y, {
    kind: 'bomb',
    critical: true,
    color: GAME_PALETTE.orbs.bomb,
    radius: explosionRadius,
  }));
  const player = state.player;
  if (
    player.alive &&
    Math.hypot(player.x - cylinder.x, player.y - cylinder.y) <=
      explosionRadius + player.radius
  ) {
    applyIndustrialPlayerDamage(state, damage, GAME_PALETTE.orbs.bomb, false);
  }
  for (const zombie of [...state.zombies]) {
    if (
      Math.hypot(zombie.x - cylinder.x, zombie.y - cylinder.y) >
        explosionRadius + zombie.radius
    ) continue;
    applyZombieDamage(state, zombie, damage);
  }
  cylinder.phase = 'detonating';
  cylinder.remainingSeconds =
    INDUSTRIAL_OBJECT_CONFIG.gasCylinder.detonationDurationSeconds;
  endPerformanceEvent('explosionHazardCreation', startedAt);
}

function updateGasCylinders(state: GameState, deltaSeconds: number): void {
  if (state.wave.phase !== 'combat') return;
  for (const cylinder of state.gasCylinders) {
    if (cylinder.phase === 'detonating') {
      cylinder.remainingSeconds -= deltaSeconds;
      if (cylinder.remainingSeconds <= 0) {
        cylinder.phase = 'idle';
        cylinder.x = cylinder.originX;
        cylinder.y = cylinder.originY;
        cylinder.remainingSeconds = 0;
        cylinder.cooldownSeconds =
          INDUSTRIAL_OBJECT_CONFIG.gasCylinder.launchCooldownSeconds;
      }
      continue;
    }

    let activeDeltaSeconds = deltaSeconds;
    if (cylinder.phase === 'idle') {
      const cooldownBeforeUpdate = cylinder.cooldownSeconds;
      cylinder.cooldownSeconds = Math.max(0, cylinder.cooldownSeconds - deltaSeconds);
      if (cylinder.cooldownSeconds > 0) continue;

      const candidates = [
        ...(state.player.alive
          ? [{ id: 0, x: state.player.x, y: state.player.y }]
          : []),
        ...state.zombies.map((zombie) => ({
          id: zombie.id,
          x: zombie.x,
          y: zombie.y,
        })),
      ].filter((actor) =>
        Math.hypot(actor.x - cylinder.originX, actor.y - cylinder.originY) <=
          INDUSTRIAL_OBJECT_CONFIG.gasCylinder.triggerRange,
      );
      candidates.sort((left, right) =>
        Math.hypot(left.x - cylinder.originX, left.y - cylinder.originY) -
        Math.hypot(right.x - cylinder.originX, right.y - cylinder.originY),
      );
      const target = candidates[0];
      if (!target) {
        cylinder.cooldownSeconds = 0.5;
        continue;
      }
      activeDeltaSeconds = Math.max(0, deltaSeconds - cooldownBeforeUpdate);
      const targetDistance = Math.hypot(
        target.x - cylinder.originX,
        target.y - cylinder.originY,
      ) || 1;
      cylinder.directionX = (target.x - cylinder.originX) / targetDistance;
      cylinder.directionY = (target.y - cylinder.originY) / targetDistance;
      cylinder.x = cylinder.originX;
      cylinder.y = cylinder.originY;
      cylinder.phase = 'flying';
      cylinder.remainingSeconds =
        INDUSTRIAL_OBJECT_CONFIG.gasCylinder.travelDurationSeconds;
      cylinder.hitActorIds.length = 0;
    }

    const travelSeconds = Math.min(activeDeltaSeconds, cylinder.remainingSeconds);
    const startX = cylinder.x;
    const startY = cylinder.y;
    cylinder.x += cylinder.directionX *
      INDUSTRIAL_OBJECT_CONFIG.gasCylinder.travelSpeed * travelSeconds;
    cylinder.y += cylinder.directionY *
      INDUSTRIAL_OBJECT_CONFIG.gasCylinder.travelSpeed * travelSeconds;
    cylinder.remainingSeconds -= travelSeconds;

    if (state.player.alive && !cylinder.hitActorIds.includes(0) &&
        segmentHitsCircle(
          startX,
          startY,
          cylinder.x,
          cylinder.y,
          state.player.x,
          state.player.y,
          cylinder.radius + state.player.radius,
        )) {
      cylinder.hitActorIds.push(0);
      applyIndustrialPlayerDamage(
        state,
        INDUSTRIAL_OBJECT_CONFIG.gasCylinder.damage,
        GAME_PALETTE.orbs.bomb,
        false,
      );
    }
    for (const zombie of [...state.zombies]) {
      if (
        cylinder.hitActorIds.includes(zombie.id) ||
        !segmentHitsCircle(
          startX,
          startY,
          cylinder.x,
          cylinder.y,
          zombie.x,
          zombie.y,
          cylinder.radius + zombie.radius,
        )
      ) continue;
      cylinder.hitActorIds.push(zombie.id);
      applyZombieDamage(state, zombie, INDUSTRIAL_OBJECT_CONFIG.gasCylinder.damage);
    }

    const outsideArena = cylinder.x < 0 || cylinder.y < 0 ||
      cylinder.x > state.arenaWidth || cylinder.y > state.arenaHeight;
    if (outsideArena || cylinder.remainingSeconds <= 1e-9) {
      detonateGasCylinder(state, cylinder);
    }
  }
}

function updateOilFirePatches(state: GameState, deltaSeconds: number): void {
  const config = INDUSTRIAL_OBJECT_CONFIG.oilFire;
  state.oilFirePatches = state.oilFirePatches.filter((patch) => {
    patch.remainingSeconds -= deltaSeconds;
    return patch.remainingSeconds > 0;
  });

  const updateBurn = (
    actor: {
      x: number;
      y: number;
      radius: number;
      industrialBurnRemainingSeconds?: number;
      industrialBurnTickSeconds?: number;
    },
    isInFire: boolean,
    applyDamage: () => void,
  ): void => {
    let remaining = actor.industrialBurnRemainingSeconds ?? 0;
    let tick = actor.industrialBurnTickSeconds ?? 0;
    if (isInFire) {
      remaining = Math.max(remaining, config.lingeringBurnSeconds);
    }
    if (deltaSeconds > 0 && remaining > 0) {
      const elapsed = Math.min(deltaSeconds, remaining);
      remaining -= elapsed;
      tick -= elapsed;
      while (tick <= 1e-9 && remaining > 0) {
        applyDamage();
        tick += config.tickIntervalSeconds;
      }
    }
    actor.industrialBurnRemainingSeconds = Math.max(0, remaining);
    actor.industrialBurnTickSeconds = remaining > 0 ? Math.max(0, tick) : 0;
  };

  const player = state.player;
  updateBurn(
    player,
    state.oilFirePatches.some((patch) =>
      Math.hypot(patch.x - player.x, patch.y - player.y) <=
        patch.radius + player.radius,
    ),
    () => applyIndustrialPlayerDamage(
      state,
      config.damagePerTick,
      '#F08A42',
      false,
    ),
  );
  for (const zombie of [...state.zombies]) {
    updateBurn(
      zombie,
      state.oilFirePatches.some((patch) =>
        Math.hypot(patch.x - zombie.x, patch.y - zombie.y) <=
          patch.radius + zombie.radius,
      ),
      () => applyZombieDamage(state, zombie, config.damagePerTick),
    );
  }
}

function updateSpitterPoison(state: GameState, deltaSeconds: number): void {
  const { player } = state;
  if (
    !player.alive ||
    player.spitterPoisonRemainingSeconds <= 0 ||
    deltaSeconds === 0
  ) {
    return;
  }

  const elapsedSeconds = Math.min(
    deltaSeconds,
    player.spitterPoisonRemainingSeconds,
  );
  player.spitterPoisonRemainingSeconds -= elapsedSeconds;
  player.spitterPoisonTickSeconds -= elapsedSeconds;

  while (player.spitterPoisonTickSeconds <= 1e-9) {
    const damage = player.spitterPoisonDamage;
    state.statistics.totalDamageReceived += damage;
    applyPlayerDamage(state, damage);
    player.hitFlashSeconds = Math.max(player.hitFlashSeconds, 0.12);
    player.spitterPoisonTickSeconds += SPITTER_CONFIG.poisonTickSeconds;

    if (!player.alive) {
      state.wave.phase = 'gameOver';
      state.wave.announcement = 'Run over';
      state.wave.announcementSeconds = 0;
      break;
    }
  }

  if (player.spitterPoisonRemainingSeconds <= 1e-9) {
    player.spitterPoisonRemainingSeconds = 0;
    player.spitterPoisonTickSeconds = 0;
    player.spitterPoisonDamage = 0;
  }
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
    readonly shieldAbsorbed?: boolean;
  } = {},
): ImpactEffectEntity {
  const startedAt = beginPerformanceEvent();
  const durationSeconds = options.kind === 'bomb'
    ? 0.5
    : options.kind === 'death' || options.kind === 'orbExpiry'
      ? 0.4
      : GAME_COMBAT_CONFIG.impactDurationSeconds;
  const impact: ImpactEffectEntity = {
    id: state.nextEntityId++,
    x,
    y,
    durationSeconds,
    remainingSeconds: durationSeconds,
    kind: options.kind ?? 'hit',
    ...(options.color === undefined ? {} : { color: options.color }),
    ...(options.radius === undefined ? {} : { radius: options.radius }),
    critical: options.critical ?? false,
    shieldAbsorbed: options.shieldAbsorbed ?? false,
  };
  countPerformanceEvent('impactEffectsCreated');
  if (options.kind === 'bomb') countPerformanceEvent('explosionsCreated');
  endPerformanceEvent('impactEffectCreation', startedAt);
  return impact;
}

function createDamageNumber(
  state: GameState,
  x: number,
  y: number,
  amount: number,
): DamageNumberEntity {
  const startedAt = beginPerformanceEvent();
  const damageNumber: DamageNumberEntity = {
    id: state.nextEntityId++,
    x,
    y,
    amount,
    durationSeconds: GAME_COMBAT_CONFIG.damageNumberDurationSeconds,
    remainingSeconds: GAME_COMBAT_CONFIG.damageNumberDurationSeconds,
  };
  countPerformanceEvent('damageNumbersCreated');
  endPerformanceEvent('damageNumberCreation', startedAt);
  return damageNumber;
}

function getZombieEffectiveDamage(zombie: ZombieEntity): number {
  return zombie.contactDamage *
    (zombie.contactDamageMultiplier ?? 1) *
    (zombie.mutagenSpawnBuff
      ? CONTAMINATED_OBJECT_CONFIG.mutagenContainer.spawnDamageMultiplier
      : 1) *
    (zombie.mutagenTemporaryBuffUntil !== undefined
      ? CONTAMINATED_OBJECT_CONFIG.mutagenContainer.temporaryBuffDamageMultiplier
      : 1);
}

function getZombieEffectiveSpeed(state: GameState, zombie: ZombieEntity): number {
  return zombie.movementSpeed *
    (zombie.movementSpeedMultiplier ?? 1) *
    (state.wave.activeModifier
      ? WAVE_MODIFIER_CONFIG.definitions[state.wave.activeModifier]
        .enemySpeedMultiplier ?? 1
      : 1) *
    (zombie.mutagenSpawnBuff
      ? CONTAMINATED_OBJECT_CONFIG.mutagenContainer.spawnSpeedMultiplier
      : 1) *
    (zombie.mutagenTemporaryBuffUntil !== undefined &&
        zombie.mutagenTemporaryBuffUntil > state.elapsedSeconds
      ? CONTAMINATED_OBJECT_CONFIG.mutagenContainer.temporaryBuffSpeedMultiplier
      : 1) *
    (getEffect(state, 'cursed')
      ? ORB_SYSTEM_CONFIG.cursedEnemySpeedMultiplier
      : 1);
}

function createHazard(
  state: GameState,
  x: number,
  y: number,
  radius: number,
  damage: number,
  durationSeconds: number,
): void {
  const startedAt = beginPerformanceEvent();
  state.hazards.push({
    id: state.nextEntityId++,
    x,
    y,
    radius,
    damage,
    durationSeconds,
    remainingSeconds: durationSeconds,
    kind: 'bloater',
  });
  countPerformanceEvent('hazardsCreated');
  endPerformanceEvent('explosionHazardCreation', startedAt);
}

function updateZombieBuffs(state: GameState): void {
  for (const zombie of state.zombies) {
    if (
      zombie.mutagenTemporaryBuffUntil !== undefined &&
      zombie.mutagenTemporaryBuffUntil <= state.elapsedSeconds
    ) {
      zombie.mutagenTemporaryBuffUntil = undefined;
    }
    if (zombie.buffedUntil !== undefined && zombie.buffedUntil <= state.elapsedSeconds) {
      const speedMultiplier = zombie.movementSpeedMultiplier ?? 1;
      const damageMultiplier = zombie.contactDamageMultiplier ?? 1;
      zombie.movementSpeedMultiplier = Number.isFinite(speedMultiplier)
        ? Math.max(1, speedMultiplier / 1.2)
        : 1;
      zombie.contactDamageMultiplier = Number.isFinite(damageMultiplier)
        ? Math.max(1, damageMultiplier / 1.15)
        : 1;
      zombie.buffedUntil = undefined;
    }
  }
}

function applyEnemyProjectileHit(
  state: GameState,
  projectile: ProjectileEntity,
): boolean {
  const { player } = state;
  if (!player.alive || player.spawnProtectionSeconds > 0) return true;

  state.statistics.totalDamageReceived += projectile.damage;
  const { healthDamage, shieldDamage } = applyPlayerDamage(
    state,
    projectile.damage,
  );
  if (projectile.kind === 'spitter') {
    player.spitterPoisonRemainingSeconds =
      SPITTER_CONFIG.poisonDurationSeconds;
    player.spitterPoisonTickSeconds = SPITTER_CONFIG.poisonTickSeconds;
    player.spitterPoisonDamage =
      projectile.damage * SPITTER_CONFIG.poisonDamageFraction;
  }
  player.damageCooldownSeconds = GAME_COMBAT_CONFIG.playerHitCooldownSeconds;
  player.hitFlashSeconds = 0.22;

  if (healthDamage > 0) {
    state.impacts.push(createImpact(state, player.x, player.y, {
      kind: 'playerDamage',
      critical: true,
      shieldAbsorbed: shieldDamage > 0,
      color: GAME_PALETTE.combat.damage,
      radius: 24,
    }));
    state.damageNumbers.push(
      createDamageNumber(state, player.x, player.y - player.radius, healthDamage),
    );
  } else {
    state.impacts.push(createImpact(state, player.x, player.y, {
      kind: 'playerDamage',
      shieldAbsorbed: shieldDamage > 0,
      color: GAME_PALETTE.player.shield,
      radius: 20,
    }));
  }

  if (!player.alive) {
    state.wave.phase = 'gameOver';
    state.wave.announcement = 'Run over';
    state.wave.announcementSeconds = 0;
  }
  return true;
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
  const movementMultiplier = getMilitaryMovementMultiplier(state, state.player) *
  getContaminatedMovementMultiplier(state, state.player, false);
  const movement = moveCircleInArena(
    state.player,
    state.player.radius,
    normalizedX * state.player.movementSpeed *
      movementMultiplier * deltaSeconds,
    normalizedY * state.player.movementSpeed *
      movementMultiplier * deltaSeconds,
    state.arenaWidth,
    state.arenaHeight,
    getMilitaryCollisionObstacles(state),
  );
  state.player.x = movement.x;
  state.player.y = movement.y;
  state.player.movementFactor = Math.min(1, Math.hypot(normalizedX, normalizedY));
}

function fireProjectile(state: GameState): void {
  const { player } = state;
  const projectileId = state.nextEntityId++;
  const directionX = Math.cos(player.aimAngle);
  const directionY = Math.sin(player.aimAngle);
  const radius = GAME_VISUAL_CONFIG.entity.projectileRadius;
  const spawnDistance = player.radius + radius + 2;
  const criticalLevel = state.progression.rareUpgradeLevels.criticalMastery;
  const criticalChance = getRareUpgradeLevelEffect(
    RARE_UPGRADE_EFFECT_CONFIG.criticalChanceByLevel,
    criticalLevel,
  );
  const critical =
    getDeterministicRoll(projectileId, 0, 1) < criticalChance;
  const damage = getProjectileDamage(state) * (
    critical ? RARE_UPGRADE_EFFECT_CONFIG.criticalDamageMultiplier : 1
  );
  const piercingLevel = state.progression.rareUpgradeLevels.piercingRounds;
  const explosiveLevel = state.progression.rareUpgradeLevels.explosiveRounds;
  const projectile: ProjectileEntity = {
    id: projectileId,
    x: player.x + directionX * spawnDistance,
    y: player.y + directionY * spawnDistance,
    directionX,
    directionY,
    radius,
    damage,
    speed: GAME_COMBAT_CONFIG.projectileSpeed,
    remainingSeconds: GAME_COMBAT_CONFIG.projectileLifetimeSeconds,
    owner: 'player',
    kind: critical ? 'critical' : 'standard',
    ...(piercingLevel > 0
      ? { remainingPierces: piercingLevel, hitZombieIds: [] }
      : {}),
    explosiveChance: getRareUpgradeLevelEffect(
      RARE_UPGRADE_EFFECT_CONFIG.explosiveChanceByLevel,
      explosiveLevel,
    ),
  };
  state.projectiles.push(projectile);
  player.shotsFired += 1;
  player.muzzleFlashSeconds = GAME_COMBAT_CONFIG.muzzleFlashDurationSeconds;
}

function moveZombie(
  state: GameState,
  zombie: ZombieEntity,
  deltaSeconds: number,
  performanceTimings?: GamePerformanceTimings,
): void {
  let targetTurret = state.militaryObjects.find((object) =>
    object.kind === 'abandoned-turret' &&
    object.id === zombie.targetMilitaryTurretId &&
    (object.state === 'active' || object.state === 'damaged' || object.state === 'firing'),
  );
  if (zombie.targetMilitaryTurretId && !targetTurret) {
    zombie.targetMilitaryTurretId = undefined;
    zombie.militaryTurretTargetChecked = true;
  }
  if (
    !zombie.militaryTurretTargetChecked &&
    zombie.type !== 'spitter' &&
    zombie.type !== 'screamer' &&
    !zombie.isBoss
  ) {
    const activeTurret = state.militaryObjects.find((object) =>
      object.kind === 'abandoned-turret' &&
      object.state !== 'destroyed' &&
      (object.state === 'active' || object.state === 'damaged' || object.state === 'firing'),
    );
    if (activeTurret?.kind === 'abandoned-turret') {
      const turretIndex = state.militaryObjects.indexOf(activeTurret);
      if (getDeterministicRoll(zombie.id, turretIndex + 1, state.wave.currentWave) <
          MILITARY_OBJECT_CONFIG.abandonedTurret.zombieTargetChance) {
        zombie.targetMilitaryTurretId = activeTurret.id;
        targetTurret = activeTurret;
      }
      zombie.militaryTurretTargetChecked = true;
    }
  }
  let targetSpill: MutagenContainerEntity | undefined;
  if (zombie.targetMutagenSpillId) {
    for (const entity of state.contaminatedObjects) {
      if (
        entity.kind === 'mutagen-container' &&
        entity.id === zombie.targetMutagenSpillId &&
        entity.spill !== undefined &&
        entity.spill.remainingSeconds > 0
      ) {
        targetSpill = entity;
        break;
      }
    }
  }
  if (zombie.targetMutagenSpillId && !targetSpill) {
    zombie.targetMutagenSpillId = undefined;
  }
  if (
    !targetSpill &&
    !targetTurret &&
    zombie.type !== 'spitter' &&
    zombie.type !== 'screamer' &&
    !zombie.isBoss
  ) {
    const attractionRadius = CONTAMINATED_OBJECT_CONFIG.mutagenContainer.attractionRadius;
    let closestDistance: number = attractionRadius;
    for (const entity of state.contaminatedObjects) {
      if (
        entity.kind === 'mutagen-container' &&
        entity.spill !== undefined &&
        entity.spill.remainingSeconds > 0 &&
        Math.hypot(entity.x - zombie.x, entity.y - zombie.y) <= closestDistance
      ) {
        closestDistance = Math.hypot(entity.x - zombie.x, entity.y - zombie.y);
        targetSpill = entity;
      }
    }
    if (targetSpill) {
      zombie.targetMutagenSpillId = targetSpill.id;
    }
  }
  const targetX = targetSpill
    ? targetSpill.x
    : targetTurret
    ? state.arenaWidth * targetTurret.xFraction
    : state.player.x;
  const targetY = targetSpill
    ? targetSpill.y
    : targetTurret
    ? state.arenaHeight * targetTurret.yFraction
    : state.player.y;
  const deltaX = targetX - zombie.x;
  const deltaY = targetY - zombie.y;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance > 0) zombie.facingAngle = Math.atan2(deltaY, deltaX);

  let isRunnerDashing = false;
  if (zombie.type === 'runner') {
    const cycleDuration =
      RUNNER_DASH_CONFIG.chargeDurationSeconds +
      RUNNER_DASH_CONFIG.dashDurationSeconds;
    zombie.runnerDashCycleSeconds =
      ((zombie.runnerDashCycleSeconds ?? 0) + deltaSeconds) % cycleDuration;
    isRunnerDashing =
      zombie.runnerDashCycleSeconds >=
      RUNNER_DASH_CONFIG.chargeDurationSeconds;
  }

  let isSwarmDodging = false;
  let swarmRecoverySpeedMultiplier = 1;
  if (zombie.type === 'swarm') {
    zombie.swarmDodgeCooldownSeconds = Math.max(
      0,
      (zombie.swarmDodgeCooldownSeconds ?? 0) - deltaSeconds,
    );
    const dodgeRemainingSeconds = zombie.swarmDodgeRemainingSeconds ?? 0;
    if (dodgeRemainingSeconds > 0) {
      zombie.swarmDodgeRemainingSeconds = Math.max(
        0,
        dodgeRemainingSeconds - deltaSeconds,
      );
      isSwarmDodging = true;
      if (zombie.swarmDodgeRemainingSeconds === 0) {
        zombie.swarmRecoveryRemainingSeconds =
          SWARM_DODGE_CONFIG.recoveryDurationSeconds;
      }
    } else if ((zombie.swarmDodgeCooldownSeconds ?? 0) === 0) {
      const dodgeStartedAt = performanceTimings ? performance.now() : 0;
      const dodgeThreat = findSwarmDodgeThreat(state, zombie);
      if (performanceTimings) {
        performanceTimings.swarmProjectileAvoidanceMs +=
          performance.now() - dodgeStartedAt;
      }
      if (dodgeThreat) {
        zombie.swarmDodgeRemainingSeconds = Math.max(
          0,
          SWARM_DODGE_CONFIG.dodgeDurationSeconds - deltaSeconds,
        );
        zombie.swarmDodgeDirectionX = dodgeThreat.directionX;
        zombie.swarmDodgeDirectionY = dodgeThreat.directionY;
        zombie.swarmDodgeCooldownSeconds =
          SWARM_DODGE_CONFIG.cooldownSeconds;
        zombie.swarmLastDodgedProjectileId = dodgeThreat.projectileId;
        isSwarmDodging = true;
        if (zombie.swarmDodgeRemainingSeconds === 0) {
          zombie.swarmRecoveryRemainingSeconds =
            SWARM_DODGE_CONFIG.recoveryDurationSeconds;
        }
      }
    }
    if (!isSwarmDodging) {
      const recoveryRemainingSeconds =
        zombie.swarmRecoveryRemainingSeconds ?? 0;
      if (recoveryRemainingSeconds > 0) {
        const recoveryProgress = 1 -
          recoveryRemainingSeconds /
            SWARM_DODGE_CONFIG.recoveryDurationSeconds;
        swarmRecoverySpeedMultiplier =
          SWARM_DODGE_CONFIG.recoveryStartingSpeedMultiplier +
          (1 - SWARM_DODGE_CONFIG.recoveryStartingSpeedMultiplier) *
            recoveryProgress;
        zombie.swarmRecoveryRemainingSeconds = Math.max(
          0,
          recoveryRemainingSeconds - deltaSeconds,
        );
      }
    }
  }

  const attackDistance = targetTurret
    ? Math.max(targetTurret.width, targetTurret.height) * 0.62 + zombie.radius + 2
    : zombie.radius + state.player.radius + 2;
  if (
    distance === 0 &&
    zombie.type !== 'spitter' &&
    !isSwarmDodging
  ) return;

  let moveX = distance > 0
    ? deltaX / distance
    : Math.cos(zombie.facingAngle + Math.PI);
  let moveY = distance > 0
    ? deltaY / distance
    : Math.sin(zombie.facingAngle + Math.PI);
  const speed = getZombieEffectiveSpeed(state, zombie) *
    (isRunnerDashing ? RUNNER_DASH_CONFIG.speedMultiplier : 1) *
    (isSwarmDodging
      ? SWARM_DODGE_CONFIG.dodgeSpeedMultiplier
      : swarmRecoverySpeedMultiplier) *
    getMilitaryMovementMultiplier(state, zombie) *
    getContaminatedMovementMultiplier(state, zombie, true);

  if (zombie.type === 'brute') {
    moveX *= 0.72;
    moveY *= 0.72;
  } else if (zombie.type === 'swarm') {
    const drift = Math.sin(state.elapsedSeconds * 10 + zombie.id) * 0.3;
    const perpendicularX = -moveY * drift;
    const perpendicularY = moveX * drift;
    moveX += perpendicularX;
    moveY += perpendicularY;
  } else if (zombie.type === 'armoured') {
    moveX *= 0.9;
    moveY *= 0.9;
  } else if (zombie.type === 'bloater') {
    moveX *= 0.62;
    moveY *= 0.62;
  } else if (zombie.type === 'screamer') {
    moveX *= 0.75;
    moveY *= 0.75;
  }

  const movementMagnitude = Math.hypot(moveX, moveY) || 1;
  const collisionObstacles = getArenaCollisionObstacles(
    state.arenaObstacles,
    state.barrels,
    state.militaryObjects,
  );
  const navigationObstacles = [...collisionObstacles];
  if (state.arenaTheme === 'military' &&
      distance > MILITARY_OBJECT_CONFIG.razorWire.zombieChargeDistance) {
    for (const object of state.militaryObjects) {
      if (object.kind !== 'razor-wire' || !object.active) continue;
      navigationObstacles.push({
        xFraction: object.xFraction,
        yFraction: object.yFraction,
        width: object.width + zombie.radius * 2,
        height: object.height + zombie.radius * 2,
        kind: 'wall',
      });
    }
  }
  if (state.arenaTheme === 'industrial') {
    state.arenaObstacles.forEach((obstacle, index) => {
      if (obstacle.kind !== 'cover') return;
      const phase = getIndustrialGeneratorPhase(state.elapsedSeconds, index);
      if (phase.phase === 'cooldown') return;
      const radius = getIndustrialGeneratorDangerRadius(
        obstacle.width,
        obstacle.height,
      ) + zombie.radius;
      navigationObstacles.push({
        xFraction: obstacle.xFraction,
        yFraction: obstacle.yFraction,
        width: radius * 2,
        height: radius * 2,
        kind: 'wall',
      });
    });
  }
  const arenaObstacles = getArenaObstacles(
    state.arenaWidth,
    state.arenaHeight,
    navigationObstacles,
  );
  let movementTarget: { x: number; y: number } = targetTurret
    ? (() => {
        const centerX = state.arenaWidth * targetTurret.xFraction;
        const centerY = state.arenaHeight * targetTurret.yFraction;
        const directionX = zombie.x - centerX;
        const directionY = zombie.y - centerY;
        const length = Math.hypot(directionX, directionY) || 1;
        const unitX = directionX / length;
        const unitY = directionY / length;
        const distanceToEdge = Math.min(
          targetTurret.width * 0.5 / Math.max(Math.abs(unitX), 0.001),
          targetTurret.height * 0.5 / Math.max(Math.abs(unitY), 0.001),
        ) + zombie.radius + 3;
        return {
          x: centerX + unitX * distanceToEdge,
          y: centerY + unitY * distanceToEdge,
        };
      })()
    : state.player;
  if (zombie.type === 'spitter') {
    movementTarget = findSpitterMovementTarget(
      state,
      zombie,
      distance,
      arenaObstacles,
    );
  } else if (zombie.type === 'swarm' && isSwarmDodging) {
    movementTarget = getSwarmDodgeTarget(
      zombie,
      state.arenaWidth,
      state.arenaHeight,
      arenaObstacles,
    );
  }
  const waypoint = findNextPathWaypointInArena(
    zombie,
    movementTarget,
    zombie.radius,
    state.arenaWidth,
    state.arenaHeight,
    navigationObstacles,
  );
  const waypointX = waypoint.x - zombie.x;
  const waypointY = waypoint.y - zombie.y;
  const waypointDistance = Math.hypot(waypointX, waypointY);

  const finalX = distance <= attackDistance &&
      zombie.type !== 'spitter' &&
      !isSwarmDodging
    ? 0
    : (waypointDistance > 0 ? waypointX / waypointDistance : moveX / movementMagnitude) * speed * deltaSeconds;
  const finalY = distance <= attackDistance &&
      zombie.type !== 'spitter' &&
      !isSwarmDodging
    ? 0
    : (waypointDistance > 0 ? waypointY / waypointDistance : moveY / movementMagnitude) * speed * deltaSeconds;

  if (
    distance <= attackDistance &&
    zombie.type !== 'spitter' &&
    !isSwarmDodging
  ) return;

  const movement = moveCircleInArena(
    zombie,
    zombie.radius,
    finalX,
    finalY,
    state.arenaWidth,
    state.arenaHeight,
    collisionObstacles,
  );
  zombie.x = movement.x;
  zombie.y = movement.y;
}

function findSwarmDodgeThreat(
  state: GameState,
  zombie: ZombieEntity,
): {
  readonly projectileId: number;
  readonly directionX: number;
  readonly directionY: number;
} | undefined {
  for (const projectile of state.projectiles) {
    if (
      projectile.owner !== 'player' ||
      projectile.id === zombie.swarmLastDodgedProjectileId
    ) {
      continue;
    }

    const lookaheadSeconds = Math.min(
      SWARM_DODGE_CONFIG.lookaheadSeconds,
      projectile.remainingSeconds,
    );
    if (lookaheadSeconds <= 0) continue;

    const endX = projectile.x +
      projectile.directionX * projectile.speed * lookaheadSeconds;
    const endY = projectile.y +
      projectile.directionY * projectile.speed * lookaheadSeconds;
    if (
      !segmentHitsZombie(
        projectile.x,
        projectile.y,
        endX,
        endY,
        zombie,
        projectile.radius + SWARM_DODGE_CONFIG.dodgeClearance,
      )
    ) {
      continue;
    }

    const segmentX = endX - projectile.x;
    const segmentY = endY - projectile.y;
    const segmentLength = Math.hypot(segmentX, segmentY) || 1;
    const perpendicularX = -segmentY / segmentLength;
    const perpendicularY = segmentX / segmentLength;
    const side = (zombie.x - projectile.x) * perpendicularX +
      (zombie.y - projectile.y) * perpendicularY;
    const sideSign = side === 0
      ? (zombie.id % 2 === 0 ? 1 : -1)
      : Math.sign(side);
    return {
      projectileId: projectile.id,
      directionX: perpendicularX * sideSign,
      directionY: perpendicularY * sideSign,
    };
  }
  return undefined;
}

function getSwarmDodgeTarget(
  zombie: ZombieEntity,
  arenaWidth: number,
  arenaHeight: number,
  obstacles: ReturnType<typeof getArenaObstacles>,
): { x: number; y: number } {
  const directionX = zombie.swarmDodgeDirectionX ?? 0;
  const directionY = zombie.swarmDodgeDirectionY ?? 0;
  const distance = SWARM_DODGE_CONFIG.dodgeDistance;
  const getTarget = (direction: number): { x: number; y: number } => ({
    x: Math.max(
      zombie.radius,
      Math.min(
        arenaWidth - zombie.radius,
        zombie.x + directionX * direction * distance,
      ),
    ),
    y: Math.max(
      zombie.radius,
      Math.min(
        arenaHeight - zombie.radius,
        zombie.y + directionY * direction * distance,
      ),
    ),
  });
  const preferredTarget = getTarget(1);
  if (
    obstacles.some((obstacle) =>
      circleOverlapsRectangle(preferredTarget, zombie.radius, obstacle),
    )
  ) {
    const alternateTarget = getTarget(-1);
    if (
      !obstacles.some((obstacle) =>
        circleOverlapsRectangle(alternateTarget, zombie.radius, obstacle),
      )
    ) {
      return alternateTarget;
    }
  }
  return preferredTarget;
}

function findSpitterMovementTarget(
  state: GameState,
  zombie: ZombieEntity,
  distanceToPlayer: number,
  obstacles: ReturnType<typeof getArenaObstacles>,
): { x: number; y: number } {
  const isBehindCover = obstacles.some((obstacle) =>
    segmentIntersectsRectangle(state.player, zombie, obstacle),
  );
  if (
    isBehindCover &&
    distanceToPlayer >= SPITTER_CONFIG.minimumHoldDistance &&
    distanceToPlayer <= SPITTER_CONFIG.maximumHoldDistance
  ) {
    return zombie;
  }

  let bestTarget: { x: number; y: number } | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  const clearance = zombie.radius + 10;
  for (const obstacle of obstacles) {
    const left = obstacle.x - clearance;
    const right = obstacle.x + obstacle.width + clearance;
    const top = obstacle.y - clearance;
    const bottom = obstacle.y + obstacle.height + clearance;
    const centerX = obstacle.x + obstacle.width / 2;
    const centerY = obstacle.y + obstacle.height / 2;
    const candidates = [
      { x: left, y: centerY },
      { x: right, y: centerY },
      { x: centerX, y: top },
      { x: centerX, y: bottom },
      { x: left, y: top },
      { x: left, y: bottom },
      { x: right, y: top },
      { x: right, y: bottom },
    ];

    for (const candidate of candidates) {
      const candidateDistance = Math.hypot(
        candidate.x - state.player.x,
        candidate.y - state.player.y,
      );
      if (
        candidate.x < zombie.radius ||
        candidate.y < zombie.radius ||
        candidate.x > state.arenaWidth - zombie.radius ||
        candidate.y > state.arenaHeight - zombie.radius ||
        candidateDistance < SPITTER_CONFIG.minimumHoldDistance ||
        candidateDistance > SPITTER_CONFIG.attackRange ||
        !segmentIntersectsRectangle(state.player, candidate, obstacle) ||
        obstacles.some((other) =>
          circleOverlapsRectangle(candidate, zombie.radius, other),
        )
      ) {
        continue;
      }

      const score =
        Math.hypot(candidate.x - zombie.x, candidate.y - zombie.y) +
        Math.abs(candidateDistance - SPITTER_CONFIG.preferredDistance) * 0.5;
      if (score < bestScore) {
        bestTarget = candidate;
        bestScore = score;
      }
    }
  }
  if (bestTarget) return bestTarget;

  const directionX = distanceToPlayer > 0
    ? (zombie.x - state.player.x) / distanceToPlayer
    : Math.cos(zombie.facingAngle + Math.PI);
  const directionY = distanceToPlayer > 0
    ? (zombie.y - state.player.y) / distanceToPlayer
    : Math.sin(zombie.facingAngle + Math.PI);
  return {
    x: state.player.x + directionX * SPITTER_CONFIG.preferredDistance,
    y: state.player.y + directionY * SPITTER_CONFIG.preferredDistance,
  };
}

function trySpitterAttack(state: GameState, zombie: ZombieEntity): void {
  if (zombie.type !== 'spitter') return;
  const distance = Math.hypot(state.player.x - zombie.x, state.player.y - zombie.y);
  if (distance > SPITTER_CONFIG.attackRange) return;
  if (zombie.attackCooldownSeconds > 0) return;
  zombie.attackCooldownSeconds = SPITTER_CONFIG.attackCooldownSeconds;
  const directionX = state.player.x - zombie.x;
  const directionY = state.player.y - zombie.y;
  const length = Math.hypot(directionX, directionY) || 1;
  state.projectiles.push({
    id: state.nextEntityId++,
    x: zombie.x + (directionX / length) * (zombie.radius + 10),
    y: zombie.y + (directionY / length) * (zombie.radius + 10),
    directionX: directionX / length,
    directionY: directionY / length,
    radius: 5,
    damage: Math.max(8, Math.round(zombie.contactDamage * 0.7)),
    speed: 180,
    remainingSeconds: 3.5,
    owner: 'enemy',
    kind: 'spitter',
  });
  state.impacts.push(createImpact(state, zombie.x, zombie.y, {
    kind: 'telegraph',
    color: GAME_PALETTE.enemies.spitter,
    radius: 26,
  }));
}

function attackPlayer(state: GameState, zombie: ZombieEntity): void {
  if (zombie.targetMilitaryTurretId) {
    const turret = state.militaryObjects.find((object) =>
      object.kind === 'abandoned-turret' &&
      object.id === zombie.targetMilitaryTurretId &&
      (object.state === 'active' || object.state === 'damaged' || object.state === 'firing'),
    );
    if (turret?.kind === 'abandoned-turret') {
      const bounds = getMilitaryObjectBounds(state, turret);
      const nearestX = Math.max(bounds.x, Math.min(zombie.x, bounds.x + bounds.width));
      const nearestY = Math.max(bounds.y, Math.min(zombie.y, bounds.y + bounds.height));
      if (Math.hypot(zombie.x - nearestX, zombie.y - nearestY) > zombie.radius + 3) {
        return;
      }
      if (zombie.type === 'spitter' || zombie.type === 'screamer' ||
          zombie.attackCooldownSeconds > 0) return;
      zombie.attackCooldownSeconds = GAME_COMBAT_CONFIG.zombieAttackCooldownSeconds;
      damageMilitaryOutpostObject(
        state,
        turret,
        getZombieEffectiveDamage(zombie),
      );
      return;
    }
    zombie.targetMilitaryTurretId = undefined;
    zombie.militaryTurretTargetChecked = true;
  }
  if (zombie.type === 'spitter' || zombie.type === 'screamer') return;
  const { player } = state;
  if (!player.alive || player.spawnProtectionSeconds > 0) return;
  const distance = Math.hypot(player.x - zombie.x, player.y - zombie.y);
  if (distance > player.radius + zombie.radius + 2) return;
  if (zombie.attackCooldownSeconds > 0) return;
  zombie.attackCooldownSeconds = GAME_COMBAT_CONFIG.zombieAttackCooldownSeconds;
  if (!player.alive || player.damageCooldownSeconds > 0) return;

  let attackDamage = getZombieEffectiveDamage(zombie);
  if (zombie.type === 'armoured') {
    const angleToPlayer = Math.atan2(player.y - zombie.y, player.x - zombie.x);
    const delta = Math.atan2(Math.sin(angleToPlayer - zombie.facingAngle), Math.cos(angleToPlayer - zombie.facingAngle));
    if (Math.abs(delta) < Math.PI / 3) {
      attackDamage *= 0.35;
    }
  }

  state.statistics.totalDamageReceived += attackDamage;
  const { healthDamage, shieldDamage } = applyPlayerDamage(
    state,
    attackDamage,
  );
  player.damageCooldownSeconds = GAME_COMBAT_CONFIG.playerHitCooldownSeconds;
  player.hitFlashSeconds = 0.22;
  if (healthDamage > 0) {
    state.impacts.push(createImpact(state, player.x, player.y, {
      kind: 'playerDamage',
      critical: true,
      shieldAbsorbed: shieldDamage > 0,
      color: GAME_PALETTE.combat.damage,
      radius: 24,
    }));
    state.damageNumbers.push(
      createDamageNumber(state, player.x, player.y - player.radius, healthDamage),
    );
  } else {
    state.impacts.push(createImpact(state, player.x, player.y, {
      kind: 'playerDamage',
      shieldAbsorbed: shieldDamage > 0,
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
  return getSegmentZombieHitFraction(
    startX,
    startY,
    endX,
    endY,
    zombie,
    projectileRadius,
  ) !== undefined;
}

function getSegmentZombieHitFraction(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  zombie: ZombieEntity,
  projectileRadius: number,
): number | undefined {
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
  return deltaX * deltaX + deltaY * deltaY <= hitRadius * hitRadius
    ? progress
    : undefined;
}

function resolveProjectileHit(
  state: GameState,
  projectile: ProjectileEntity,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  performanceTimings?: GamePerformanceTimings,
): boolean {
  const startedAt = performanceTimings ? performance.now() : 0;
  const result = resolveProjectileHitCore(
    state,
    projectile,
    startX,
    startY,
    endX,
    endY,
    performanceTimings,
  );
  if (performanceTimings) {
    performanceTimings.projectileCollisionMs += performance.now() - startedAt;
  }
  return result;
}

function resolveProjectileHitCore(
  state: GameState,
  projectile: ProjectileEntity,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  performanceTimings?: GamePerformanceTimings,
): boolean {
  if (
    projectile.owner === 'player' &&
    handleArenaProjectileCollision(
      state,
      projectile,
      startX,
      startY,
      endX,
      endY,
    )
  ) {
    return true;
  }

  if (
    (projectile.kind !== 'spitter' || state.arenaTheme === 'military') &&
    isProjectileBlockedByObstacle(state, projectile, endX, endY)
  ) {
    countPerformanceEvent('hitEvents');
    state.impacts.push(createImpact(state, endX, endY));
    return true;
  }

  if (projectile.owner === 'enemy') {
    const playerHit = segmentHitsCircle(
      startX,
      startY,
      endX,
      endY,
      state.player.x,
      state.player.y,
      state.player.radius + projectile.radius,
    );
    if (playerHit) {
      countPerformanceEvent('hitEvents');
      return applyEnemyProjectileHit(state, projectile);
    }
    return false;
  }

  const zombieCollisionStartedAt = performanceTimings ? performance.now() : 0;
  const enemyCandidateStartedAt = beginPerformanceEvent();
  let zombie: ZombieEntity | undefined;
  let nearestZombieFraction = Number.POSITIVE_INFINITY;
  for (const candidate of state.zombies) {
    if (projectile.hitZombieIds?.includes(candidate.id)) continue;
    const fraction = getSegmentZombieHitFraction(
      startX,
      startY,
      endX,
      endY,
      candidate,
      projectile.radius,
    );
    if (fraction !== undefined && fraction < nearestZombieFraction) {
      zombie = candidate;
      nearestZombieFraction = fraction;
    }
  }
  if (performanceTimings) {
    performanceTimings.zombieCollisionMs +=
      performance.now() - zombieCollisionStartedAt;
  }
  endPerformanceEvent('enemyCandidateScan', enemyCandidateStartedAt);
  if (!zombie) return false;

  countPerformanceEvent('hitEvents');
  applyZombieDamage(
    state,
    zombie,
    projectile.damage,
    false,
    projectile.owner === 'player' ? 'weapon' : 'other',
  );
  if (
    (projectile.explosiveChance ?? 0) > 0 &&
    getDeterministicRoll(projectile.id, zombie.id, 2) <
      (projectile.explosiveChance ?? 0)
  ) {
    detonateExplosiveRound(state, projectile, zombie);
  }
  if ((projectile.remainingPierces ?? 0) > 0) {
    projectile.hitZombieIds ??= [];
    projectile.hitZombieIds.push(zombie.id);
    projectile.remainingPierces = (projectile.remainingPierces ?? 0) - 1;
    return false;
  }
  return true;
}

function damageMilitaryOutpostObject(
  state: GameState,
  object: MilitaryOutpostEntity,
  damage: number,
): void {
  if (damage <= 0 || !Number.isFinite(damage)) return;
  const destructionStartedAt = beginPerformanceEvent();
  const bounds = getMilitaryObjectBounds(state, object);
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  if (object.kind === 'razor-wire') return;

  if (object.kind === 'abandoned-turret') {
    if (object.state === 'destroyed') return;
    const dealt = Math.min(object.health, damage);
    object.health = Math.max(0, object.health - damage);
    state.impacts.push(createImpact(state, x, y, {
      kind: object.health === 0 ? 'death' : 'hit',
      critical: object.health === 0,
      color: '#A99A76',
      radius: object.health === 0 ? 26 : 15,
    }));
    state.damageNumbers.push(createDamageNumber(state, x, y - 10, dealt));
    if (object.health === 0) {
      object.state = 'destroyed';
      object.reviveProgress = 0;
      for (const zombie of state.zombies) {
        if (zombie.targetMilitaryTurretId === object.id) {
          zombie.targetMilitaryTurretId = undefined;
          zombie.militaryTurretTargetChecked = true;
        }
      }
      recordArenaObjectDestruction(destructionStartedAt);
    } else if (object.health / object.maxHealth < 0.5 && object.state !== 'broken' &&
        object.state !== 'revive-ready' && object.state !== 'reviving') {
      object.state = 'damaged';
    }
    return;
  }

  if (object.destroyed) return;
  const dealt = Math.min(object.health, damage);
  object.health = Math.max(0, object.health - damage);
  object.destroyed = object.health === 0;
  state.impacts.push(createImpact(state, x, y, {
    kind: object.destroyed ? 'death' : 'hit',
    critical: object.destroyed,
    color: object.kind === 'fuel-drum' ? '#D68A54' : '#A99A76',
    radius: object.destroyed ? 28 : 16,
  }));
  state.damageNumbers.push(createDamageNumber(state, x, y - 10, dealt));
  if (!object.destroyed) return;
  countPerformanceEvent('arenaObjectDestructionEvents');

  if (object.kind === 'sandbag-barricade') {
    object.spillRemainingSeconds = MILITARY_OBJECT_CONFIG.sandbag.spillDurationSeconds;
    recordArenaObjectDestruction(destructionStartedAt);
    return;
  }
  if (object.kind === 'military-ammo-crate') {
    detonateMilitaryAmmoCrate(state, object);
    if (!object.rewardSpawned) {
      object.rewardSpawned = true;
      object.rewardItemId = spawnOrb(
        state,
        'rapidFire',
        x + MILITARY_OBJECT_CONFIG.ammoCrate.rewardOffsetX,
        y,
        true,
      );
    }
    recordArenaObjectDestruction(destructionStartedAt);
    return;
  }
  if (object.kind === 'fuel-drum') {
    object.phase = 'igniting';
    object.phaseRemainingSeconds =
      MILITARY_OBJECT_CONFIG.fuelDrum.ignitionDurationSeconds;
    if (!object.rewardSpawned) {
      object.rewardSpawned = true;
      object.rewardItemId = spawnOrb(
        state,
        'damage',
        x + MILITARY_OBJECT_CONFIG.fuelDrum.rewardOffsetX,
        y,
        true,
      );
    }
    recordArenaObjectDestruction(destructionStartedAt);
    return;
  }
  if (object.kind === 'military-supply-crate') {
    object.destructionRemainingSeconds =
      MILITARY_OBJECT_CONFIG.supplyCrate.destructionDurationSeconds;
    if (!object.rewardSpawned) {
      object.rewardSpawned = true;
      state.player.health = Math.min(
        state.player.maxHealth,
        state.player.health + GAME_PROGRESSION_CONFIG.healthOrbRestore,
      );
      state.impacts.push(createImpact(state, x, y, {
        kind: 'spawn',
        color: GAME_PALETTE.orbs.health,
        radius: 24,
      }));
    }
  }
  recordArenaObjectDestruction(destructionStartedAt);
}

interface ArenaProjectileHit {
  readonly fraction: number;
  readonly obstacle?: GameState['arenaObstacles'][number];
  readonly barrel?: GameState['barrels'][number];
  readonly militaryObject?: MilitaryOutpostEntity;
  readonly contaminatedObject?: ContaminatedArenaEntity;
}

function getSegmentFraction(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  pointX: number,
  pointY: number,
): number {
  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) return 0;
  return Math.max(
    0,
    Math.min(
      1,
      ((pointX - startX) * deltaX + (pointY - startY) * deltaY) /
        lengthSquared,
    ),
  );
}

function segmentHitsCircle(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  centerX: number,
  centerY: number,
  radius: number,
): boolean {
  return getSegmentCircleHitFraction(
    startX,
    startY,
    endX,
    endY,
    centerX,
    centerY,
    radius,
  ) !== undefined;
}

function getSegmentCircleHitFraction(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  centerX: number,
  centerY: number,
  radius: number,
): number | undefined {
  const fraction = getSegmentFraction(
    startX,
    startY,
    endX,
    endY,
    centerX,
    centerY,
  );
  const nearestX = startX + (endX - startX) * fraction;
  const nearestY = startY + (endY - startY) * fraction;
  return Math.hypot(centerX - nearestX, centerY - nearestY) <= radius
    ? fraction
    : undefined;
}

function findArenaProjectileHit(
  state: GameState,
  projectile: ProjectileEntity,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): ArenaProjectileHit | undefined {
  const startedAt = beginPerformanceEvent();
  let nearestHit: ArenaProjectileHit | undefined;
  for (const obstacle of state.arenaObstacles) {
    if (obstacle.health !== undefined && obstacle.health <= 0) continue;
    const bounds = getArenaObstacleBounds(
      obstacle,
      state.arenaWidth,
      state.arenaHeight,
    );
    if (
      !segmentIntersectsRectangle(
        { x: startX, y: startY },
        { x: endX, y: endY },
        bounds,
        projectile.radius,
      )
    ) {
      continue;
    }
    const fraction = getSegmentFraction(
      startX,
      startY,
      endX,
      endY,
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    if (!nearestHit || fraction < nearestHit.fraction) {
      nearestHit = { fraction, obstacle };
    }
  }

  for (const barrel of state.barrels) {
    if (barrel.health <= 0) continue;
    const x = state.arenaWidth * barrel.xFraction;
    const y = state.arenaHeight * barrel.yFraction;
    const fraction = getSegmentCircleHitFraction(
      startX,
      startY,
      endX,
      endY,
      x,
      y,
      barrel.radius + projectile.radius,
    );
    if (fraction === undefined) continue;
    if (!nearestHit || fraction < nearestHit.fraction) {
      nearestHit = { fraction, barrel };
    }
  }

  for (const object of state.militaryObjects) {
    if (
      object.kind === 'razor-wire' ||
      (object.kind === 'abandoned-turret'
        ? object.state === 'destroyed'
        : object.destroyed)
    ) continue;
    const bounds = getMilitaryObjectBounds(state, object);
    if (!segmentIntersectsRectangle(
      { x: startX, y: startY },
      { x: endX, y: endY },
      bounds,
      projectile.radius,
    )) continue;
    const fraction = getSegmentFraction(
      startX,
      startY,
      endX,
      endY,
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    if (!nearestHit || fraction < nearestHit.fraction) {
      nearestHit = { fraction, militaryObject: object };
    }
  }

  for (const object of state.contaminatedObjects) {
    if (!('health' in object) || object.destroyed) continue;
    const bounds = {
      x: object.x - object.width / 2,
      y: object.y - object.height / 2,
      width: object.width,
      height: object.height,
    };
    if (!segmentIntersectsRectangle(
      { x: startX, y: startY },
      { x: endX, y: endY },
      bounds,
      projectile.radius,
    )) continue;
    const fraction = getSegmentFraction(
      startX,
      startY,
      endX,
      endY,
      object.x,
      object.y,
    );
    if (!nearestHit || fraction < nearestHit.fraction) {
      nearestHit = { fraction, contaminatedObject: object };
    }
  }

  endPerformanceEvent('arenaCandidateScan', startedAt);
  return nearestHit;
}

function damageArenaObstacle(
  state: GameState,
  obstacle: GameState['arenaObstacles'][number],
  damage: number,
): void {
  if (
    (obstacle.kind !== 'barricade' && obstacle.kind !== 'crate') ||
    obstacle.health === undefined ||
    obstacle.health <= 0
  ) return;
  const destructionStartedAt = beginPerformanceEvent();
  const bounds = getArenaObstacleBounds(
    obstacle,
    state.arenaWidth,
    state.arenaHeight,
  );
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  const damageDealt = Math.min(obstacle.health, damage);
  obstacle.health = Math.max(0, obstacle.health - damage);
  state.impacts.push(createImpact(state, x, y, {
    kind: obstacle.health === 0 ? 'death' : 'hit',
    critical: obstacle.health === 0,
    color: GAME_PALETTE.arena.barricade.detail,
    radius: obstacle.health === 0 ? 26 : 16,
  }));
  state.damageNumbers.push(createDamageNumber(state, x, y - 10, damageDealt));
  if (obstacle.kind === 'crate' && state.arenaTheme === 'industrial') {
    const crateIndex = state.arenaObstacles.indexOf(obstacle);
    const reward = getDeterministicRoll(crateIndex + 1, state.wave.currentWave, 565) < 0.5
      ? 'health'
      : 'shield';
    spawnOrb(state, reward, x, y, true);
  }
  if (obstacle.health === 0) {
    countPerformanceEvent('arenaObjectDestructionEvents');
    endPerformanceEvent('arenaObjectDestruction', destructionStartedAt);
  }
}

function detonateBarrels(
  state: GameState,
  firstBarrel: GameState['barrels'][number],
): void {
  const startedAt = beginPerformanceEvent();
  const pending = [firstBarrel];
  while (pending.length > 0) {
    const barrel = pending.shift();
    if (!barrel || barrel.health > 0) continue;
    const x = state.arenaWidth * barrel.xFraction;
    const y = state.arenaHeight * barrel.yFraction;
    if (!state.oilFirePatches.some((patch) => patch.barrelId === barrel.id)) {
      state.oilFirePatches.push({
        id: state.nextEntityId++,
        barrelId: barrel.id,
        x,
        y,
        radius: INDUSTRIAL_OBJECT_CONFIG.oilFire.radius,
        remainingSeconds: INDUSTRIAL_OBJECT_CONFIG.oilFire.durationSeconds,
      });
      countPerformanceEvent('hazardsCreated');
    }
    state.impacts.push(createImpact(state, x, y, {
      kind: 'bomb',
      critical: true,
      color: GAME_PALETTE.orbs.bomb,
      radius: ARENA_INTERACTION_CONFIG.barrelExplosionRadius,
    }));

    for (const neighbor of state.barrels) {
      if (
        neighbor.health > 0 &&
        Math.hypot(
          state.arenaWidth * neighbor.xFraction - x,
          state.arenaHeight * neighbor.yFraction - y,
        ) <= ARENA_INTERACTION_CONFIG.barrelExplosionRadius + neighbor.radius
      ) {
        neighbor.health = 0;
        pending.push(neighbor);
        countPerformanceEvent('arenaObjectDestructionEvents');
      }
    }

    for (const obstacle of state.arenaObstacles) {
      if (
        (obstacle.kind !== 'barricade' && obstacle.kind !== 'crate') ||
        (obstacle.health ?? 0) <= 0
      ) continue;
      const bounds = getArenaObstacleBounds(
        obstacle,
        state.arenaWidth,
        state.arenaHeight,
      );
      if (
        Math.hypot(
          bounds.x + bounds.width / 2 - x,
          bounds.y + bounds.height / 2 - y,
        ) <= ARENA_INTERACTION_CONFIG.barrelExplosionRadius
      ) {
        damageArenaObstacle(
          state,
          obstacle,
          ARENA_INTERACTION_CONFIG.barrelExplosionDamage,
        );
      }
    }

    if (ARENA_INTERACTION_CONFIG.barrelExplosionDamagesEnemies) {
      for (const zombie of [...state.zombies]) {
        if (
          Math.hypot(zombie.x - x, zombie.y - y) <=
          ARENA_INTERACTION_CONFIG.barrelExplosionRadius + zombie.radius
        ) {
          applyZombieDamage(
            state,
            zombie,
            ARENA_INTERACTION_CONFIG.barrelExplosionDamage,
          );
        }
      }
      endPerformanceEvent('explosionHazardCreation', startedAt);
    }

    const player = state.player;
    if (
      ARENA_INTERACTION_CONFIG.barrelExplosionDamagesPlayer &&
      player.alive &&
      Math.hypot(player.x - x, player.y - y) <=
        ARENA_INTERACTION_CONFIG.barrelExplosionRadius + player.radius
    ) {
      const damage = ARENA_INTERACTION_CONFIG.barrelExplosionDamage;
      const { healthDamage, shieldDamage } = applyPlayerDamage(state, damage);
      player.damageCooldownSeconds = GAME_COMBAT_CONFIG.playerHitCooldownSeconds;
      player.hitFlashSeconds = 0.22;
      state.statistics.totalDamageReceived += damage;
      state.impacts.push(createImpact(state, player.x, player.y, {
        kind: 'playerDamage',
        critical: healthDamage > 0,
        shieldAbsorbed: shieldDamage > 0,
        color: healthDamage > 0
          ? GAME_PALETTE.combat.damage
          : GAME_PALETTE.player.shield,
        radius: 24,
      }));
      if (healthDamage > 0) {
        state.damageNumbers.push(
          createDamageNumber(state, player.x, player.y - player.radius, healthDamage),
        );
      }
    }
  }
}

function damageBarrel(
  state: GameState,
  barrel: GameState['barrels'][number],
  damage: number,
): void {
  if (barrel.health <= 0) return;
  const destructionStartedAt = beginPerformanceEvent();
  const x = state.arenaWidth * barrel.xFraction;
  const y = state.arenaHeight * barrel.yFraction;
  const damageDealt = Math.min(barrel.health, damage);
  barrel.health = Math.max(0, barrel.health - damage);
  state.impacts.push(createImpact(state, x, y, {
    kind: barrel.health === 0 ? 'telegraph' : 'hit',
    critical: barrel.health === 0,
    color: GAME_PALETTE.orbs.bomb,
    radius: barrel.health === 0
      ? ARENA_INTERACTION_CONFIG.barrelExplosionRadius
      : 18,
  }));
  state.damageNumbers.push(createDamageNumber(state, x, y - barrel.radius, damageDealt));
  if (barrel.health === 0) {
    countPerformanceEvent('arenaObjectDestructionEvents');
    detonateBarrels(state, barrel);
    endPerformanceEvent('arenaObjectDestruction', destructionStartedAt);
  }
}

function handleArenaProjectileCollision(
  state: GameState,
  projectile: ProjectileEntity,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): boolean {
  const hit = findArenaProjectileHit(
    state,
    projectile,
    startX,
    startY,
    endX,
    endY,
  );
  if (!hit) return false;
  countPerformanceEvent('hitEvents');
  if (hit.barrel) damageBarrel(state, hit.barrel, projectile.damage);
  else if (hit.contaminatedObject) {
    damageContaminatedObject(state, hit.contaminatedObject, projectile.damage);
  }
  else if (hit.militaryObject) {
    if (hit.militaryObject.kind !== 'abandoned-turret') {
      damageMilitaryOutpostObject(
        state,
        hit.militaryObject,
        projectile.damage,
      );
    }
  }
  else if (hit.obstacle) damageArenaObstacle(state, hit.obstacle, projectile.damage);
  state.impacts.push(createImpact(state, endX, endY));
  return true;
}

function updateProjectiles(
  state: GameState,
  deltaSeconds: number,
  performanceTimings?: GamePerformanceTimings,
): void {
  const processingStartedAt = state.projectiles.length > 0
    ? beginPerformanceEvent()
    : undefined;
  const surviving: ProjectileEntity[] = [];
  for (const projectile of state.projectiles) {
    countPerformanceEvent('projectilesProcessed');
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
    let consumed = false;
    while (true) {
      const previousPierces = projectile.remainingPierces ?? 0;
      consumed = resolveProjectileHit(
        state,
        projectile,
        startX,
        startY,
        endX,
        endY,
        performanceTimings,
      );
      if (
        consumed ||
        (projectile.remainingPierces ?? 0) >= previousPierces
      ) {
        break;
      }
    }
    if (consumed || outsideArena || projectile.remainingSeconds <= 0) continue;

    projectile.x = endX;
    projectile.y = endY;
    surviving.push(projectile);
  }
  state.projectiles = surviving;
  endPerformanceEvent('projectileProcessing', processingStartedAt);
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
  performanceTimings?: GamePerformanceTimings,
): void {
  const previousPerformanceTimings = activePerformanceTimings;
  activePerformanceTimings = performanceTimings;
  try {
    updateGameStateCore(state, input, deltaSeconds, performanceTimings);
  } finally {
    activePerformanceTimings = previousPerformanceTimings;
  }
}

function updateGameStateCore(
  state: GameState,
  input: GameInputState,
  deltaSeconds: number,
  performanceTimings?: GamePerformanceTimings,
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
  state.progression.emergencyShieldCooldownSeconds = Math.max(
    0,
    state.progression.emergencyShieldCooldownSeconds - deltaSeconds,
  );
  const { player } = state;
  player.aimAngle = input.aimAngle;
  player.damageCooldownSeconds = Math.max(
    0,
    player.damageCooldownSeconds - deltaSeconds,
  );
  for (const zombie of state.zombies) {
    zombie.industrialHazardCooldownSeconds = Math.max(
      0,
      (zombie.industrialHazardCooldownSeconds ?? 0) - deltaSeconds,
    );
    zombie.militaryHazardCooldownSeconds = Math.max(
      0,
      (zombie.militaryHazardCooldownSeconds ?? 0) - deltaSeconds,
    );
  }
  player.militaryHazardCooldownSeconds = Math.max(
    0,
    player.militaryHazardCooldownSeconds - deltaSeconds,
  );
  player.spawnProtectionSeconds = Math.max(
    0,
    player.spawnProtectionSeconds - deltaSeconds,
  );
  player.hitFlashSeconds = Math.max(0, player.hitFlashSeconds - deltaSeconds);
  player.muzzleFlashSeconds = Math.max(0, player.muzzleFlashSeconds - deltaSeconds);

  if (
    state.wave.phase === 'gameOver' ||
    state.wave.phase === 'levelComplete' ||
    state.wave.phase === 'upgrade'
  ) {
    player.movementFactor = 0;
    return;
  }

  updateZombieBuffs(state);
  if (player.alive) {
    if (state.wave.phase === 'intermission') {
      movePlayer(state, input.movementX, input.movementY, deltaSeconds);
      player.fireCooldownSeconds = Math.max(
        0,
        player.fireCooldownSeconds - deltaSeconds,
      );
    } else {
      movePlayer(state, input.movementX, input.movementY, deltaSeconds);
      player.fireCooldownSeconds = Math.max(
        0,
        player.fireCooldownSeconds - deltaSeconds,
      );
      if (player.fireCooldownSeconds === 0) {
        fireProjectile(state);
        player.fireCooldownSeconds = 1 / getShotsPerSecond(state);
      }
    }
  } else {
    player.movementFactor = 0;
  }

  updateIndustrialHazards(state, deltaSeconds);
  updateMilitaryOutpostObjects(state, deltaSeconds);
  if (input.useBomb && state.wave.phase === 'combat') detonateBomb(state);
  state.statistics.survivalSeconds += deltaSeconds;
  updateTemporaryEffects(state, deltaSeconds);
  updateSpitterPoison(state, deltaSeconds);
  advanceWaveProgression(state, deltaSeconds);
  const enemySpeedMultiplier = state.wave.activeModifier
    ? WAVE_MODIFIER_CONFIG.definitions[state.wave.activeModifier]
      .enemySpeedMultiplier ?? 1
    : 1;
  updateBossEncounter(state, deltaSeconds);
  updateBossAbilities(state, deltaSeconds, enemySpeedMultiplier);
  updateScreamerAbilities(state, deltaSeconds);
  updateItems(state, deltaSeconds);
  updateHazards(state, deltaSeconds);
  updateContaminatedArena(state, deltaSeconds);
  updateElites(state, deltaSeconds);

  for (const zombie of [...state.zombies]) {
    zombie.hitFlashSeconds = Math.max(0, zombie.hitFlashSeconds - deltaSeconds);
    zombie.attackCooldownSeconds = Math.max(
      0,
      zombie.attackCooldownSeconds - deltaSeconds,
    );
    if (!moveBoss(state, zombie, deltaSeconds, enemySpeedMultiplier)) {
      moveZombie(state, zombie, deltaSeconds, performanceTimings);
    }
    if (state.zombies.includes(zombie)) {
      applyMilitaryWireDamage(state, zombie, false);
    }
  }
  for (const zombie of state.zombies) {
    trySpitterAttack(state, zombie);
    attackPlayer(state, zombie);
  }

  updateSupportTurrets(state, deltaSeconds);
  updateMilitaryTurrets(state, deltaSeconds);
  updateProjectiles(state, deltaSeconds, performanceTimings);
  updateOilFirePatches(state, deltaSeconds);
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
  const obstacles = getArenaObstacles(
    state.arenaWidth,
    state.arenaHeight,
    getMilitaryCollisionObstacles(state),
  );
  return obstacles.some((obstacle) =>
    segmentIntersectsRectangle(
      { x: projectile.x, y: projectile.y },
      { x: endX, y: endY },
      obstacle,
      projectile.radius,
    ),
  );
}
