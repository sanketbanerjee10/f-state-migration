import {
  findNextPathWaypointInArena,
  moveCircleInArena,
  segmentIntersectsRectangle,
  getArenaObstacles,
} from '../core/ArenaGeometry';
import {
  createZombie,
  type GameState,
  type HazardEntity,
  type ZombieEntity,
} from '../core/GameState';
import {
  createValidSpawnPosition,
  WAVE_SPAWN_CONFIG,
} from '../waves/SpawnSystem';
import { awardRareReward } from '../upgrades/ProgressionSystem';
import { getArenaCollisionObstacles } from '../arena/ArenaSystem';

export type BossType = 'charger' | 'acidQueen' | 'hordeCaller';

export interface BossDefinition {
  readonly type: BossType;
  readonly name: string;
}

export const BOSS_CONFIG = {
  introductionSeconds: 2.5,
  introductionTitleSeconds: 3,
  radius: 32,
  healthMultiplier: 18,
  damageMultiplier: 2.8,
  speedMultiplier: 0.72,
  rarePointReward: 1,
  upgradeOpportunityReward: 0,
  maximumActiveSummons: 3,
  maximumSummonsPerEncounter: 9,
  summonIntervalSeconds: 6,
  summonGroupSize: 2,
  hordeShieldDamageMultiplier: 0,
  chargerWindupSeconds: 0.9,
  chargerDashSeconds: 0.5,
  chargerDashSpeedMultiplier: 4.2,
  chargerStunSeconds: 1.25,
  chargerRecoverySeconds: 0.7,
  acidQueenAttackIntervalSeconds: 3,
  acidQueenProjectileDamage: 18,
  acidQueenProjectileSpeed: 260,
  acidQueenPoolDamage: 16,
  acidQueenPoolRadius: 58,
  acidQueenPoolDurationSeconds: 4,
  acidQueenPoolTelegraphSeconds: 0.8,
} as const;

export const BOSS_TYPES: readonly BossType[] = [
  'charger',
  'acidQueen',
  'hordeCaller',
];

const BOSS_NAMES: Readonly<Record<BossType, string>> = {
  charger: 'The Charger',
  acidQueen: 'Acid Queen',
  hordeCaller: 'Horde Caller',
};

export function getBossForWave(wave: number): BossDefinition | undefined {
  if (!Number.isInteger(wave) || wave < 1) {
    throw new RangeError('Wave number must be a positive integer.');
  }
  if (wave % 10 !== 0) return undefined;
  const type = BOSS_TYPES[(wave / 10 - 1) % BOSS_TYPES.length];
  return { type, name: BOSS_NAMES[type] };
}

export function beginBossWave(state: GameState, wave: number): void {
  const boss = getBossForWave(wave);
  state.wave.bossIntroSeconds = boss ? BOSS_CONFIG.introductionSeconds : 0;
  state.wave.bossIntroDurationSeconds = boss ? BOSS_CONFIG.introductionSeconds : 0;
  state.wave.bossSpawned = !boss;
  state.wave.bossName = boss?.name;
  state.wave.bossType = boss?.type;
  state.wave.bossEncounterId = boss ? `boss-wave-${wave}` : undefined;
  state.wave.bossUpgradeOpportunity = false;
  state.wave.bossSummonsSpawned = 0;
  state.wave.bossSummonCooldownSeconds = 0;
  state.wave.requiredBossesRemaining = boss ? 1 : 0;
}

function createBossAtValidPosition(
  state: GameState,
  type: BossType,
  wave: number,
): ZombieEntity | undefined {
  const spawn = createValidSpawnPosition(state, 'brute', BOSS_CONFIG.radius);
  if (!spawn) return undefined;

  const boss = createZombie(
    state.nextEntityId++,
    type === 'hordeCaller' ? 'screamer' : 'brute',
    spawn.x,
    spawn.y,
    wave,
  );
  boss.radius = BOSS_CONFIG.radius;
  boss.maxHealth = Math.round(boss.maxHealth * BOSS_CONFIG.healthMultiplier);
  boss.health = boss.maxHealth;
  boss.movementSpeedMultiplier = BOSS_CONFIG.speedMultiplier;
  boss.contactDamageMultiplier = BOSS_CONFIG.damageMultiplier;
  boss.isBoss = true;
  boss.bossType = type;
  boss.bossAttackCooldownSeconds = type === 'acidQueen'
    ? BOSS_CONFIG.acidQueenAttackIntervalSeconds
    : 0;
  boss.bossSummonCooldownSeconds = 0;
  boss.bossSummonsSpawned = 0;
  boss.bossShielded = type === 'hordeCaller';
  return boss;
}

export function spawnDevBoss(state: GameState, type: BossType): boolean {
  const boss = createBossAtValidPosition(state, type, state.wave.currentWave);
  if (!boss) return false;

  state.zombies.push(boss);
  state.wave.requiredBossesRemaining += 1;
  return true;
}

export function updateBossEncounter(
  state: GameState,
  deltaSeconds: number,
): void {
  if (!state.wave.bossType || state.wave.bossSpawned) return;
  state.wave.bossIntroSeconds = Math.max(
    0,
    state.wave.bossIntroSeconds - deltaSeconds,
  );
  if (state.wave.bossIntroSeconds > 0) return;

  const boss = createBossAtValidPosition(
    state,
    state.wave.bossType,
    state.wave.currentWave,
  );
  if (!boss) {
    state.wave.bossIntroSeconds = 0.25;
    return;
  }

  state.zombies.push(boss);
  state.wave.bossSpawned = true;
  state.wave.announcement = `${state.wave.bossName} has entered`;
  state.wave.announcementSeconds = BOSS_CONFIG.introductionTitleSeconds;
}

function createBossProjectile(
  state: GameState,
  boss: ZombieEntity,
  angle: number,
): void {
  state.projectiles.push({
    id: state.nextEntityId++,
    x: boss.x + Math.cos(angle) * (boss.radius + 8),
    y: boss.y + Math.sin(angle) * (boss.radius + 8),
    directionX: Math.cos(angle),
    directionY: Math.sin(angle),
    radius: 7,
    damage: BOSS_CONFIG.acidQueenProjectileDamage,
    speed: BOSS_CONFIG.acidQueenProjectileSpeed,
    remainingSeconds: 4,
    owner: 'enemy',
    kind: 'acid',
  });
}

function createAcidPool(state: GameState, x: number, y: number): void {
  const hazard: HazardEntity = {
    id: state.nextEntityId++,
    x,
    y,
    radius: BOSS_CONFIG.acidQueenPoolRadius,
    damage: BOSS_CONFIG.acidQueenPoolDamage,
    durationSeconds: BOSS_CONFIG.acidQueenPoolDurationSeconds,
    remainingSeconds: BOSS_CONFIG.acidQueenPoolDurationSeconds,
    kind: 'acid',
  };
  state.hazards.push(hazard);
  state.impacts.push({
    id: state.nextEntityId++,
    x,
    y,
    durationSeconds: 0.5,
    remainingSeconds: 0.5,
    kind: 'acid',
    critical: false,
    shieldAbsorbed: false,
    color: '#7d8c78',
    radius: hazard.radius,
  });
}

function createBossTelegraph(
  state: GameState,
  boss: ZombieEntity,
  radius: number,
): void {
  state.impacts.push({
    id: state.nextEntityId++,
    x: boss.x,
    y: boss.y,
    durationSeconds: BOSS_CONFIG.chargerWindupSeconds,
    remainingSeconds: BOSS_CONFIG.chargerWindupSeconds,
    kind: 'telegraph',
    critical: true,
    shieldAbsorbed: false,
    color: '#b96e68',
    radius,
  });
}

function updateCharger(
  state: GameState,
  boss: ZombieEntity,
  deltaSeconds: number,
  movementSpeedMultiplier = 1,
): void {
  boss.bossAttackCooldownSeconds = Math.max(
    0,
    (boss.bossAttackCooldownSeconds ?? 0) - deltaSeconds,
  );
  if (boss.bossPhase === 'stunned') {
    boss.bossPhaseSeconds = Math.max(
      0,
      (boss.bossPhaseSeconds ?? 0) - deltaSeconds,
    );
    if (boss.bossPhaseSeconds === 0) {
      boss.bossPhase = 'recovery';
      boss.bossPhaseSeconds = BOSS_CONFIG.chargerRecoverySeconds;
    }
    return;
  }
  if (boss.bossPhase === 'recovery') {
    boss.bossPhaseSeconds = Math.max(
      0,
      (boss.bossPhaseSeconds ?? 0) - deltaSeconds,
    );
    if (boss.bossPhaseSeconds === 0) boss.bossPhase = 'pursuit';
    return;
  }
  if (boss.bossPhase === 'windup') {
    boss.bossPhaseSeconds = Math.max(
      0,
      (boss.bossPhaseSeconds ?? 0) - deltaSeconds,
    );
    if (boss.bossPhaseSeconds === 0) {
      boss.bossPhase = 'charge';
      boss.bossPhaseSeconds = BOSS_CONFIG.chargerDashSeconds;
    }
    return;
  }
  if (boss.bossPhase === 'charge') {
    const angle = boss.bossChargeAngle ?? boss.facingAngle;
    const distance = boss.movementSpeed *
      BOSS_CONFIG.chargerDashSpeedMultiplier *
      movementSpeedMultiplier *
      deltaSeconds;
    const next = moveCircleInArena(
      boss,
      boss.radius,
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      state.arenaWidth,
      state.arenaHeight,
      getArenaCollisionObstacles(state.arenaObstacles, state.barrels),
    );
    const hitObstacle = getArenaObstacles(
      state.arenaWidth,
      state.arenaHeight,
      getArenaCollisionObstacles(state.arenaObstacles, state.barrels),
    )
      .some((obstacle) =>
        segmentIntersectsRectangle(boss, next, obstacle, boss.radius),
      );
    const hitBoundary =
      next.x <= boss.radius + 0.5 ||
      next.y <= boss.radius + 0.5 ||
      next.x >= state.arenaWidth - boss.radius - 0.5 ||
      next.y >= state.arenaHeight - boss.radius - 0.5;
    boss.x = next.x;
    boss.y = next.y;
    boss.bossPhaseSeconds = Math.max(
      0,
      (boss.bossPhaseSeconds ?? 0) - deltaSeconds,
    );
    if (hitObstacle || hitBoundary) {
      boss.bossPhase = 'stunned';
      boss.bossPhaseSeconds = BOSS_CONFIG.chargerStunSeconds;
      boss.bossAttackCooldownSeconds = BOSS_CONFIG.chargerStunSeconds;
      createBossTelegraph(state, boss, boss.radius + 18);
    } else if (boss.bossPhaseSeconds === 0) {
      boss.bossPhase = 'recovery';
      boss.bossPhaseSeconds = BOSS_CONFIG.chargerRecoverySeconds;
    }
    return;
  }

  const distanceToPlayer = Math.hypot(
    state.player.x - boss.x,
    state.player.y - boss.y,
  );
  if (
    distanceToPlayer <= 260 &&
    boss.bossAttackCooldownSeconds <= 0
  ) {
    boss.bossChargeAngle = Math.atan2(
      state.player.y - boss.y,
      state.player.x - boss.x,
    );
    boss.facingAngle = boss.bossChargeAngle;
    boss.bossPhase = 'windup';
    boss.bossPhaseSeconds = BOSS_CONFIG.chargerWindupSeconds;
    boss.bossAttackCooldownSeconds = 5;
    createBossTelegraph(state, boss, 230);
  }
}

function updateAcidQueen(
  state: GameState,
  boss: ZombieEntity,
  deltaSeconds: number,
): void {
  boss.bossAttackCooldownSeconds = Math.max(
    0,
    (boss.bossAttackCooldownSeconds ?? 0) - deltaSeconds,
  );
  if ((boss.bossAttackCooldownSeconds ?? 0) > 0) return;

  const targetAngle = Math.atan2(
    state.player.y - boss.y,
    state.player.x - boss.x,
  );
  boss.facingAngle = targetAngle;
  const pattern = (boss.bossAttackPatternIndex ?? 0) % 2;
  if (pattern === 0) {
    for (const offset of [-0.28, 0, 0.28]) {
      createBossProjectile(state, boss, targetAngle + offset);
    }
    state.impacts.push({
      id: state.nextEntityId++,
      x: boss.x,
      y: boss.y,
      durationSeconds: 0.35,
      remainingSeconds: 0.35,
      kind: 'telegraph',
      critical: false,
      shieldAbsorbed: false,
      color: '#7d8c78',
      radius: 44,
    });
  } else {
    const poolX = state.player.x;
    const poolY = state.player.y;
    state.impacts.push({
      id: state.nextEntityId++,
      x: poolX,
      y: poolY,
      durationSeconds: BOSS_CONFIG.acidQueenPoolTelegraphSeconds,
      remainingSeconds: BOSS_CONFIG.acidQueenPoolTelegraphSeconds,
      kind: 'telegraph',
      critical: true,
      shieldAbsorbed: false,
      color: '#7d8c78',
      radius: BOSS_CONFIG.acidQueenPoolRadius,
    });
    boss.bossAcidPoolTargetX = poolX;
    boss.bossAcidPoolTargetY = poolY;
    boss.bossAcidPoolWindupSeconds = BOSS_CONFIG.acidQueenPoolTelegraphSeconds;
  }
  boss.bossAttackPatternIndex = (boss.bossAttackPatternIndex ?? 0) + 1;
  boss.bossAttackCooldownSeconds = BOSS_CONFIG.acidQueenAttackIntervalSeconds;
}

function spawnHordeSupport(state: GameState, boss: ZombieEntity): boolean {
  const activeSummons = state.zombies.filter(
    (zombie) => zombie.bossSummonedBy === boss.id,
  ).length;
  if (
    state.zombies.length >= WAVE_SPAWN_CONFIG.maximumActiveEnemies ||
    activeSummons >= BOSS_CONFIG.maximumActiveSummons ||
    (boss.bossSummonsSpawned ?? 0) >= BOSS_CONFIG.maximumSummonsPerEncounter
  ) {
    return false;
  }

  const spawnedCount = Math.min(
    BOSS_CONFIG.summonGroupSize,
    BOSS_CONFIG.maximumActiveSummons - activeSummons,
    BOSS_CONFIG.maximumSummonsPerEncounter - (boss.bossSummonsSpawned ?? 0),
  );
  let spawned = 0;
  for (let index = 0; index < spawnedCount; index += 1) {
    const type = (boss.bossSummonsSpawned ?? 0) % 3 === 0
      ? 'runner'
      : 'walker';
    const position = createValidSpawnPosition(state, type);
    if (!position) break;
    const summon = createZombie(
      state.nextEntityId++,
      type,
      position.x,
      position.y,
      state.wave.currentWave,
    );
    summon.bossSummonedBy = boss.id;
    state.zombies.push(summon);
    boss.bossSummonsSpawned = (boss.bossSummonsSpawned ?? 0) + 1;
    spawned += 1;
  }
  return spawned > 0;
}

function updateHordeCaller(
  state: GameState,
  boss: ZombieEntity,
  deltaSeconds: number,
): void {
  const activeSummons = state.zombies.some(
    (zombie) => zombie.bossSummonedBy === boss.id,
  );
  boss.bossShielded = activeSummons || (boss.bossSummonsSpawned ?? 0) === 0;
  boss.bossSummonCooldownSeconds = Math.max(
    0,
    (boss.bossSummonCooldownSeconds ?? 0) - deltaSeconds,
  );
  if (
    boss.bossSummonCooldownSeconds <= 0 &&
    (boss.bossSummonsSpawned ?? 0) < BOSS_CONFIG.maximumSummonsPerEncounter
  ) {
    const spawned = spawnHordeSupport(state, boss);
    if (spawned) {
      boss.bossShielded = true;
      boss.bossSummonCooldownSeconds = BOSS_CONFIG.summonIntervalSeconds;
      state.impacts.push({
        id: state.nextEntityId++,
        x: boss.x,
        y: boss.y,
        durationSeconds: 0.45,
        remainingSeconds: 0.45,
        kind: 'telegraph',
        critical: false,
        shieldAbsorbed: false,
        color: '#b96e68',
        radius: boss.radius + 28,
      });
    } else {
      boss.bossSummonCooldownSeconds = 1;
    }
  }
}

function updateBossSpecificAbilities(
  state: GameState,
  boss: ZombieEntity,
  deltaSeconds: number,
  movementSpeedMultiplier: number,
): void {
  if (!boss.isBoss) return;

  if (
    boss.bossAcidPoolWindupSeconds !== undefined &&
    boss.bossAcidPoolTargetX !== undefined &&
    boss.bossAcidPoolTargetY !== undefined
  ) {
    boss.bossAcidPoolWindupSeconds = Math.max(
      0,
      boss.bossAcidPoolWindupSeconds - deltaSeconds,
    );
    if (boss.bossAcidPoolWindupSeconds === 0) {
      createAcidPool(
        state,
        boss.bossAcidPoolTargetX,
        boss.bossAcidPoolTargetY,
      );
      boss.bossAcidPoolWindupSeconds = undefined;
      boss.bossAcidPoolTargetX = undefined;
      boss.bossAcidPoolTargetY = undefined;
    }
  }

  if (boss.bossType === 'charger') {
    updateCharger(state, boss, deltaSeconds, movementSpeedMultiplier);
  } else if (boss.bossType === 'acidQueen') {
    updateAcidQueen(state, boss, deltaSeconds);
  } else if (boss.bossType === 'hordeCaller') {
    updateHordeCaller(state, boss, deltaSeconds);
  }
}

export function updateBossAbilities(
  state: GameState,
  deltaSeconds: number,
  movementSpeedMultiplier = 1,
): void {
  for (const boss of [...state.zombies]) {
    updateBossSpecificAbilities(
      state,
      boss,
      deltaSeconds,
      movementSpeedMultiplier,
    );
  }
}

export function moveBoss(
  state: GameState,
  boss: ZombieEntity,
  deltaSeconds: number,
  movementSpeedMultiplier = 1,
): boolean {
  if (!boss.isBoss) return false;
  if (
    boss.bossType === 'charger' &&
    ['windup', 'charge', 'stunned', 'recovery'].includes(boss.bossPhase ?? '')
  ) {
    return true;
  }
  if (boss.bossType === 'acidQueen') {
    const deltaX = state.player.x - boss.x;
    const deltaY = state.player.y - boss.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance > 0) boss.facingAngle = Math.atan2(deltaY, deltaX);
    const moveScale = distance < 170 ? -0.5 : distance > 240 ? 0.7 : 0;
    if (moveScale !== 0) {
      const waypoint = findNextPathWaypointInArena(
        boss,
        state.player,
        boss.radius,
        state.arenaWidth,
        state.arenaHeight,
        getArenaCollisionObstacles(state.arenaObstacles, state.barrels),
      );
      const dx = waypoint.x - boss.x;
      const dy = waypoint.y - boss.y;
      const length = Math.hypot(dx, dy) || 1;
      const next = moveCircleInArena(
        boss,
        boss.radius,
        (dx / length) * boss.movementSpeed * moveScale *
          movementSpeedMultiplier * deltaSeconds,
        (dy / length) * boss.movementSpeed * moveScale *
          movementSpeedMultiplier * deltaSeconds,
        state.arenaWidth,
        state.arenaHeight,
        getArenaCollisionObstacles(state.arenaObstacles, state.barrels),
      );
      boss.x = next.x;
      boss.y = next.y;
    }
    return true;
  }
  return false;
}

export function resolveBossDamage(
  state: GameState,
  boss: ZombieEntity,
  damage: number,
): number {
  if (!boss.isBoss) return damage;
  if (boss.bossType === 'hordeCaller' && boss.bossShielded) {
    state.impacts.push({
      id: state.nextEntityId++,
      x: boss.x,
      y: boss.y,
      durationSeconds: 0.2,
      remainingSeconds: 0.2,
      kind: 'hit',
      critical: false,
      shieldAbsorbed: true,
      color: '#b96e68',
      radius: boss.radius + 8,
    });
    return damage * BOSS_CONFIG.hordeShieldDamageMultiplier;
  }
  return damage;
}

export function handleBossDefeat(
  state: GameState,
  boss: ZombieEntity,
): void {
  if (!boss.isBoss || boss.bossRewardIssued) return;
  boss.bossRewardIssued = true;
  state.statistics.bossKills = (state.statistics.bossKills ?? 0) + 1;
  state.wave.requiredBossesRemaining = Math.max(
    0,
    state.wave.requiredBossesRemaining - 1,
  );
  if (state.wave.bossEncounterId) {
    awardRareReward(
      state.progression,
      `boss-rare-point:${state.wave.bossEncounterId}`,
      BOSS_CONFIG.rarePointReward,
    );
    state.statistics.rareCurrency = { ...state.progression.rare };
  }
  if (BOSS_CONFIG.upgradeOpportunityReward > 0) {
    state.wave.bossUpgradeOpportunity = true;
    state.statistics.bossUpgradeOpportunities =
      (state.statistics.bossUpgradeOpportunities ?? 0) +
      BOSS_CONFIG.upgradeOpportunityReward;
  }
  state.wave.announcement = `${bossName(boss.bossType)} defeated`;
  state.wave.announcementSeconds = 3;
}

export function getBossName(type: BossType | undefined): string {
  return type ? BOSS_NAMES[type] : 'Boss';
}

function bossName(type: BossType | undefined): string {
  return getBossName(type);
}
