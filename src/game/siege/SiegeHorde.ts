import type { ZombieType } from '../core/GameState';

export interface SiegeHordeVisual {
  readonly type: ZombieType;
  readonly offsetX: number;
  readonly offsetY: number;
  remainingCount: number;
  deathElapsed: number | null;
}

export interface SiegeZombieSpawnGroup {
  readonly kind: ZombieType;
  readonly count: number;
}

export const SIEGE_ZOMBIE_DEATH_DURATION_SECONDS = 0.48;

const MAX_HORDE_VISUALS = 30;

export function createSiegeHordeVisuals(
  groups: readonly SiegeZombieSpawnGroup[],
): SiegeHordeVisual[] {
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  const count = Math.min(MAX_HORDE_VISUALS, total);
  const visuals: SiegeHordeVisual[] = [];

  for (let index = 0; index < count; index += 1) {
    let groupOffset = Math.floor(index * total / count);
    let type = groups[0]?.kind ?? 'walker';
    for (const group of groups) {
      if (groupOffset < group.count) {
        type = group.kind;
        break;
      }
      groupOffset -= group.count;
    }

    const representedStart = Math.floor(index * total / count);
    const representedEnd = Math.floor((index + 1) * total / count);
    const angle = index * 2.399963229728653;
    const radius = 16 + Math.sqrt(index) * 13;
    visuals.push({
      type,
      offsetX: Math.cos(angle) * radius,
      offsetY: Math.sin(angle) * radius * 0.72,
      remainingCount: representedEnd - representedStart,
      deathElapsed: null,
    });
  }
  return visuals;
}

export function applySiegeHordeDamage(
  visuals: SiegeHordeVisual[],
  damage: number,
): number {
  let remainingDamage = damage;
  for (let index = visuals.length - 1; index >= 0; index -= 1) {
    if (remainingDamage <= 0) break;
    const visual = visuals[index]!;
    if (visual.remainingCount === 0) continue;

    const defeated = Math.min(visual.remainingCount, remainingDamage);
    visual.remainingCount -= defeated;
    remainingDamage -= defeated;
    if (visual.remainingCount === 0) visual.deathElapsed = 0;
  }
  return damage - remainingDamage;
}

export function advanceSiegeHordeDeaths(
  visuals: SiegeHordeVisual[],
  deltaSeconds: number,
): void {
  for (let index = visuals.length - 1; index >= 0; index -= 1) {
    const visual = visuals[index]!;
    if (visual.deathElapsed === null) continue;
    visual.deathElapsed += deltaSeconds;
    if (visual.deathElapsed >= SIEGE_ZOMBIE_DEATH_DURATION_SECONDS) {
      visuals.splice(index, 1);
    }
  }
}

export function hasSiegeHordeDeathAnimation(visuals: readonly SiegeHordeVisual[]): boolean {
  return visuals.some((visual) => visual.deathElapsed !== null);
}
