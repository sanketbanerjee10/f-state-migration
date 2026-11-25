import {
  applySiegeHordeDamage,
  createSiegeHordeVisuals,
} from './SiegeHorde';
import type { SiegeDifficulty, SiegeZombieGroup } from './SiegeRules';

export const MAX_PLAYER_VISUALS = 30;

const PLAYER_RADIUS = 18;
const PLAYER_SPEED = 800;
const PLAYER_FORMATION_COLUMNS = 5;
const PLAYER_FORMATION_HORIZONTAL_SPACING = 36;
const PLAYER_FORMATION_VERTICAL_SPACING = 28;
const PLAYER_FORMATION_TRAIL_OFFSET = 28;
const MIN_SIEGE_SHOT_INTERVAL_SECONDS = 0.25;
const VALIDATION_VIEWPORT_WIDTH = 1280;
const VALIDATION_VIEWPORT_HEIGHT = 720;
const VALIDATION_STEP_SECONDS = 1 / 60;
const MAX_VALIDATION_FIGHT_SECONDS = 30;
const DIFFICULTY_INDEX: Readonly<Record<SiegeDifficulty, number>> = {
  easy: 0,
  medium: 1,
  difficult: 2,
  impossible: 3,
};

export interface SiegeTankOffset {
  readonly x: number;
  readonly y: number;
}

interface SiegeCombatBullet {
  x: number;
  y: number;
  readonly directionX: number;
  readonly directionY: number;
  readonly damage: number;
}

export interface SiegeHordeEncounterResult {
  readonly remainingHorde: number;
  readonly secondsUntilResolution: number;
}

export function getSiegeDisplayedUnitCount(troops: number): number {
  if (!Number.isSafeInteger(troops) || troops < 0) {
    throw new RangeError('Siege troop count must be a non-negative safe integer.');
  }
  return Math.min(troops, MAX_PLAYER_VISUALS);
}

export function getSiegeTankFormation(count: number): readonly SiegeTankOffset[] {
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_PLAYER_VISUALS) {
    throw new RangeError(`Siege tank count must be between 1 and ${MAX_PLAYER_VISUALS}.`);
  }

  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return { x: 0, y: 0 };
    const formationIndex = index - 1;
    const row = Math.floor(formationIndex / PLAYER_FORMATION_COLUMNS);
    const rowStart = row * PLAYER_FORMATION_COLUMNS;
    const rowLength = Math.min(PLAYER_FORMATION_COLUMNS, count - 1 - rowStart);
    const column = formationIndex - rowStart;
    return {
      x: (column - (rowLength - 1) / 2) * PLAYER_FORMATION_HORIZONTAL_SPACING,
      y: PLAYER_FORMATION_TRAIL_OFFSET + row * PLAYER_FORMATION_VERTICAL_SPACING,
    };
  });
}

export function getSiegeVolleyDamage(troops: number): number {
  if (!Number.isSafeInteger(troops) || troops < 1) {
    throw new RangeError('Siege troops must be a positive safe integer.');
  }
  const bulletCount = getSiegeDisplayedUnitCount(troops);
  if (troops <= MAX_PLAYER_VISUALS) return troops;
  return Math.round(
    bulletCount * Math.pow(troops / bulletCount, 0.6),
  );
}

export function getSiegeBulletDamage(troops: number, bulletIndex: number): number {
  const bulletCount = getSiegeDisplayedUnitCount(troops);
  if (
    bulletCount < 1 ||
    !Number.isSafeInteger(bulletIndex) ||
    bulletIndex < 0 ||
    bulletIndex >= bulletCount
  ) {
    throw new RangeError('Siege bullet index must identify a visible tank.');
  }
  const volleyDamage = getSiegeVolleyDamage(troops);
  const baseDamage = Math.floor(volleyDamage / bulletCount);
  const extraDamageBullets = volleyDamage % bulletCount;
  return baseDamage + Number(bulletIndex < extraDamageBullets);
}

export function getSiegeShotInterval(
  troops: number,
  difficulty: SiegeDifficulty,
): number {
  if (!Number.isSafeInteger(troops) || troops < 1) {
    throw new RangeError('Siege troops must be a positive safe integer.');
  }
  const difficultyIndex = DIFFICULTY_INDEX[difficulty];
  return Math.max(
    MIN_SIEGE_SHOT_INTERVAL_SECONDS,
    0.42 -
      Math.log2(getSiegeDisplayedUnitCount(troops) + 1) * 0.025 -
      difficultyIndex * 0.015,
  );
}

export function getSiegeCombatSpawnGroups(
  groups: readonly SiegeZombieGroup[],
  targetZombieCount: number,
): SiegeZombieGroup[] {
  const baseZombieCount = groups.reduce((total, group) => total + group.count, 0);
  if (
    baseZombieCount < 1 ||
    !Number.isSafeInteger(targetZombieCount) ||
    targetZombieCount < baseZombieCount
  ) {
    throw new RangeError('Siege combat zombie groups and target count are invalid.');
  }

  let remainingZombieCount = targetZombieCount;
  return groups.map((group, index) => {
    const count = index === groups.length - 1
      ? remainingZombieCount
      : Math.floor(group.count * targetZombieCount / baseZombieCount);
    remainingZombieCount -= count;
    return { kind: group.kind, count };
  });
}

export function simulateSiegeHordeEncounter(
  troops: number,
  groups: readonly SiegeZombieGroup[],
  targetZombieCount: number,
  difficulty: SiegeDifficulty,
): SiegeHordeEncounterResult {
  if (!Number.isSafeInteger(troops) || troops < 1) {
    throw new RangeError('Siege encounter troops must be a positive safe integer.');
  }
  const spawnGroups = getSiegeCombatSpawnGroups(groups, targetZombieCount);
  const visuals = createSiegeHordeVisuals(spawnGroups);
  const formation = getSiegeTankFormation(getSiegeDisplayedUnitCount(troops));
  const bullets: SiegeCombatBullet[] = [];
  const playerTarget = {
    x: PLAYER_RADIUS,
    y: VALIDATION_VIEWPORT_HEIGHT - PLAYER_RADIUS,
  };
  let playerX = VALIDATION_VIEWPORT_WIDTH / 2;
  let playerY = VALIDATION_VIEWPORT_HEIGHT * 0.72;
  let hordeX = VALIDATION_VIEWPORT_WIDTH / 2;
  let hordeY = -Math.max(80, VALIDATION_VIEWPORT_HEIGHT * 0.12);
  let hordeCount = targetZombieCount;
  let elapsedSeconds = 0;
  let lastShotTime = 0;
  const hordeSpeed = 280 + DIFFICULTY_INDEX[difficulty] * 24;
  const shotInterval = getSiegeShotInterval(troops, difficulty);
  const maxSteps = Math.ceil(
    MAX_VALIDATION_FIGHT_SECONDS / VALIDATION_STEP_SECONDS,
  );

  for (let step = 0; step < maxSteps; step += 1) {
    elapsedSeconds += VALIDATION_STEP_SECONDS;

    const playerDx = playerTarget.x - playerX;
    const playerDy = playerTarget.y - playerY;
    const playerDistance = Math.hypot(playerDx, playerDy);
    if (playerDistance > 0) {
      const travel = Math.min(playerDistance, PLAYER_SPEED * VALIDATION_STEP_SECONDS);
      playerX += playerDx / playerDistance * travel;
      playerY += playerDy / playerDistance * travel;
    }

    const hordeDx = playerX - hordeX;
    const hordeDy = playerY - hordeY;
    const hordeDistance = Math.hypot(hordeDx, hordeDy);
    if (hordeDistance > 0) {
      const travel = Math.min(hordeDistance, hordeSpeed * VALIDATION_STEP_SECONDS);
      hordeX += hordeDx / hordeDistance * travel;
      hordeY += hordeDy / hordeDistance * travel;
    }

    if (elapsedSeconds - lastShotTime >= shotInterval) {
      for (const [index, offset] of formation.entries()) {
        const x = playerX + offset.x;
        const y = playerY + offset.y;
        const dx = hordeX - x;
        const dy = hordeY - y;
        const distance = Math.hypot(dx, dy);
        bullets.push({
          x,
          y,
          directionX: distance === 0 ? 0 : dx / distance,
          directionY: distance === 0 ? 0 : dy / distance,
          damage: getSiegeBulletDamage(troops, index),
        });
      }
      lastShotTime = elapsedSeconds;
    }

    for (const bullet of bullets) {
      bullet.x += bullet.directionX * 720 * VALIDATION_STEP_SECONDS;
      bullet.y += bullet.directionY * 720 * VALIDATION_STEP_SECONDS;
    }

    const activeVisualCount = visuals.reduce(
      (count, visual) => count + Number(visual.remainingCount > 0),
      0,
    );
    const hordeRadius = Math.max(48, Math.sqrt(activeVisualCount) * 14);
    for (let index = bullets.length - 1; index >= 0; index -= 1) {
      if (hordeCount === 0) break;
      const bullet = bullets[index]!;
      if (Math.hypot(bullet.x - hordeX, bullet.y - hordeY) > hordeRadius) {
        continue;
      }
      const damage = Math.min(hordeCount, bullet.damage);
      hordeCount -= damage;
      bullets.splice(index, 1);
      if (applySiegeHordeDamage(visuals, damage) !== damage) {
        throw new Error('Siege validation horde visuals are out of sync with the enemy count.');
      }
    }

    for (let index = bullets.length - 1; index >= 0; index -= 1) {
      const bullet = bullets[index]!;
      if (
        bullet.x < -24 || bullet.x > VALIDATION_VIEWPORT_WIDTH + 24 ||
        bullet.y < -24 || bullet.y > VALIDATION_VIEWPORT_HEIGHT + 24
      ) {
        bullets.splice(index, 1);
      }
    }

    if (hordeCount === 0) {
      return { remainingHorde: 0, secondsUntilResolution: elapsedSeconds };
    }
    if (Math.hypot(playerX - hordeX, playerY - hordeY) <= 66) {
      return { remainingHorde: hordeCount, secondsUntilResolution: elapsedSeconds };
    }
  }

  throw new Error('Siege validation horde encounter did not resolve within 30 seconds.');
}
