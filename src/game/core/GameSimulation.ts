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
import { GAME_VISUAL_CONFIG } from '../rendering/VisualConfig';
import { GAME_PALETTE } from '../rendering/GamePalette';
import {
  advanceWaveProgression,
  completeWaveIfCleared,
} from './GameProgression';
import {
  ARENA_INTERACTION_CONFIG,
  ELITE_CONFIG,
  ENEMY_ABILITY_CONFIG,
  GAME_COMBAT_CONFIG,
  GAME_PROGRESSION_CONFIG,
  ORB_DROP_SEQUENCE,
  ORB_SYSTEM_CONFIG,
  RARE_UPGRADE_EFFECT_CONFIG,
  WAVE_MODIFIER_CONFIG,
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
        (RARE_UPGRADE_EFFECT_CONFIG.secondWindHealthPercentByLevel[
          secondWindLevel
        ] ?? 0),
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

  const durationSeconds =
    RARE_UPGRADE_EFFECT_CONFIG.emergencyShieldDurationByLevel[shieldLevel] ?? 0;
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
  }
  progression.emergencyShieldCooldownSeconds =
    RARE_UPGRADE_EFFECT_CONFIG.emergencyShieldCooldownSeconds;
}

function applyPlayerDamage(
  state: GameState,
  damage: number,
): { readonly healthDamage: number; readonly shieldDamage: number } {
  const player = state.player;
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
): void {
  if (state.items.length >= GAME_PROGRESSION_CONFIG.maximumActiveItems) return;
  const radius = GAME_VISUAL_CONFIG.entity.orbRadius;
  const id = state.nextEntityId++;
  const position = findCirclePositionInArena(
    { x, y },
    radius,
    state.arenaWidth,
    state.arenaHeight,
    getArenaCollisionObstacles(state.arenaObstacles, state.barrels),
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
  const index = state.zombies.findIndex((candidate) => candidate.id === zombie.id);
  if (index >= 0) state.zombies.splice(index, 1);
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
      color: '#7d8c78',
      radius: hazardRadius,
    }));
  }

  if (zombie.type === 'splitter' && (zombie.spawnDepth ?? 0) < 1) {
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
    }
  }

  recordZombieKill(state, zombie);
}

function applyZombieDamage(
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
    const healRatio =
      RARE_UPGRADE_EFFECT_CONFIG.lifestealPercentByLevel[lifestealLevel] ?? 0;
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

function detonateExplosiveRound(
  state: GameState,
  projectile: ProjectileEntity,
  target: ZombieEntity,
): void {
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
      getArenaCollisionObstacles(state.arenaObstacles, state.barrels),
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
    getArenaCollisionObstacles(state.arenaObstacles, state.barrels),
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
      getArenaCollisionObstacles(state.arenaObstacles, state.barrels),
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
    color: GAME_PALETTE.enemies.elite,
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
    getArenaCollisionObstacles(state.arenaObstacles, state.barrels),
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
    shieldAbsorbed: options.shieldAbsorbed ?? false,
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

function getZombieEffectiveDamage(zombie: ZombieEntity): number {
  return zombie.contactDamage * (zombie.contactDamageMultiplier ?? 1);
}

function getZombieEffectiveSpeed(state: GameState, zombie: ZombieEntity): number {
  return zombie.movementSpeed *
    (zombie.movementSpeedMultiplier ?? 1) *
    (state.wave.activeModifier
      ? WAVE_MODIFIER_CONFIG.definitions[state.wave.activeModifier]
        .enemySpeedMultiplier ?? 1
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
}

function updateZombieBuffs(state: GameState): void {
  for (const zombie of state.zombies) {
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
  if (!player.alive) return true;

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
  const movement = moveCircleInArena(
    state.player,
    state.player.radius,
    normalizedX * state.player.movementSpeed * deltaSeconds,
    normalizedY * state.player.movementSpeed * deltaSeconds,
    state.arenaWidth,
    state.arenaHeight,
    getArenaCollisionObstacles(state.arenaObstacles, state.barrels),
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
  const criticalChance =
    RARE_UPGRADE_EFFECT_CONFIG.criticalChanceByLevel[criticalLevel] ?? 0;
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
    explosiveChance:
      RARE_UPGRADE_EFFECT_CONFIG.explosiveChanceByLevel[explosiveLevel] ?? 0,
  };
  state.projectiles.push(projectile);
  player.shotsFired += 1;
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
      const dodgeThreat = findSwarmDodgeThreat(state, zombie);
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

  const attackDistance = zombie.radius + state.player.radius + 2;
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
      : swarmRecoverySpeedMultiplier);

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
  );
  const arenaObstacles = getArenaObstacles(
    state.arenaWidth,
    state.arenaHeight,
    collisionObstacles,
  );
  let movementTarget: { x: number; y: number } = state.player;
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
    collisionObstacles,
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
  if (zombie.type === 'spitter' || zombie.type === 'screamer') return;
  const { player } = state;
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
    projectile.kind !== 'spitter' &&
    isProjectileBlockedByObstacle(state, projectile, endX, endY)
  ) {
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
      return applyEnemyProjectileHit(state, projectile);
    }
    return false;
  }

  const zombie = state.zombies
    .filter((candidate) =>
      !projectile.hitZombieIds?.includes(candidate.id) &&
      segmentHitsZombie(
        startX,
        startY,
        endX,
        endY,
        candidate,
        projectile.radius,
      ),
    )
    .sort(
      (left, right) =>
        getSegmentFraction(
          startX,
          startY,
          endX,
          endY,
          left.x,
          left.y,
        ) -
        getSegmentFraction(
          startX,
          startY,
          endX,
          endY,
          right.x,
          right.y,
        ),
    )[0];
  if (!zombie) return false;

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

interface ArenaProjectileHit {
  readonly fraction: number;
  readonly obstacle?: GameState['arenaObstacles'][number];
  readonly barrel?: GameState['barrels'][number];
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
  return Math.hypot(centerX - nearestX, centerY - nearestY) <= radius;
}

function findArenaProjectileHit(
  state: GameState,
  projectile: ProjectileEntity,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): ArenaProjectileHit | undefined {
  const hits: ArenaProjectileHit[] = [];
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
    hits.push({
      fraction: getSegmentFraction(
        startX,
        startY,
        endX,
        endY,
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
      ),
      obstacle,
    });
  }

  for (const barrel of state.barrels) {
    if (barrel.health <= 0) continue;
    const x = state.arenaWidth * barrel.xFraction;
    const y = state.arenaHeight * barrel.yFraction;
    if (
      !segmentHitsCircle(
        startX,
        startY,
        endX,
        endY,
        x,
        y,
        barrel.radius + projectile.radius,
      )
    ) {
      continue;
    }
    hits.push({
      fraction: getSegmentFraction(startX, startY, endX, endY, x, y),
      barrel,
    });
  }

  hits.sort((left, right) => left.fraction - right.fraction);
  return hits[0];
}

function damageBarricade(
  state: GameState,
  obstacle: GameState['arenaObstacles'][number],
  damage: number,
): void {
  if (
    obstacle.kind !== 'barricade' ||
    obstacle.health === undefined ||
    obstacle.health <= 0
  ) return;
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
}

function detonateBarrels(
  state: GameState,
  firstBarrel: GameState['barrels'][number],
): void {
  const pending = [firstBarrel];
  while (pending.length > 0) {
    const barrel = pending.shift();
    if (!barrel || barrel.health > 0) continue;
    const x = state.arenaWidth * barrel.xFraction;
    const y = state.arenaHeight * barrel.yFraction;
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
      }
    }

    for (const obstacle of state.arenaObstacles) {
      if (
        obstacle.kind !== 'barricade' ||
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
        damageBarricade(
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
    }

    const player = state.player;
    if (
      ARENA_INTERACTION_CONFIG.barrelExplosionDamagesPlayer &&
      player.alive &&
      player.damageCooldownSeconds === 0 &&
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
  if (barrel.health === 0) detonateBarrels(state, barrel);
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
  if (hit.barrel) damageBarrel(state, hit.barrel, projectile.damage);
  else if (hit.obstacle) damageBarricade(state, hit.obstacle, projectile.damage);
  state.impacts.push(createImpact(state, endX, endY));
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

  if (player.alive) {
    if (state.wave.phase === 'intermission') {
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
  updateElites(state, deltaSeconds);

  for (const zombie of state.zombies) {
    zombie.hitFlashSeconds = Math.max(0, zombie.hitFlashSeconds - deltaSeconds);
    zombie.attackCooldownSeconds = Math.max(
      0,
      zombie.attackCooldownSeconds - deltaSeconds,
    );
    if (!moveBoss(state, zombie, deltaSeconds, enemySpeedMultiplier)) {
      moveZombie(state, zombie, deltaSeconds);
    }
  }
  for (const zombie of state.zombies) {
    trySpitterAttack(state, zombie);
    attackPlayer(state, zombie);
  }

  updateSupportTurrets(state, deltaSeconds);
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
  const obstacles = getArenaObstacles(
    state.arenaWidth,
    state.arenaHeight,
    getArenaCollisionObstacles(state.arenaObstacles, state.barrels),
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
