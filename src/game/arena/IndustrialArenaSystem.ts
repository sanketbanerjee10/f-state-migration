import {
  findCirclePositionInArena,
  getArenaObstacleBounds,
} from '../core/ArenaGeometry';
import type { CirclePosition } from '../core/ArenaGeometry';
import { INDUSTRIAL_OBJECT_CONFIG } from '../core/GameConfig';
import type { ArenaObstacleEntity, ExplosiveBarrelEntity } from './ArenaSystem';

export interface IndustrialSteamPhase {
  readonly phase: 'idle' | 'warning' | 'venting' | 'cooldown';
  readonly phaseProgress: number;
  readonly intensity: number;
}

export interface IndustrialGeneratorPhase {
  readonly phase: 'charging' | 'discharging' | 'cooldown';
  readonly chargeProgress: number;
  readonly dischargeProgress: number;
}

function cycleTime(elapsedSeconds: number, index: number, cycleSeconds: number, offsetSeconds: number): number {
  const rawTime = elapsedSeconds + index * offsetSeconds;
  return ((rawTime % cycleSeconds) + cycleSeconds) % cycleSeconds;
}

export function getIndustrialSteamPhase(
  elapsedSeconds: number,
  obstacleIndex: number,
): IndustrialSteamPhase {
  const config = INDUSTRIAL_OBJECT_CONFIG.steamPipe;
  const time = cycleTime(elapsedSeconds, obstacleIndex, config.cycleSeconds, 2.15);
  if (time < config.warningStartSeconds) {
    return {
      phase: 'idle',
      phaseProgress: time / config.warningStartSeconds,
      intensity: 0,
    };
  }
  if (time < config.ventStartSeconds) {
    return {
      phase: 'warning',
      phaseProgress: (time - config.warningStartSeconds) /
        (config.ventStartSeconds - config.warningStartSeconds),
      intensity: 0,
    };
  }
  if (time < config.cooldownStartSeconds) {
    const phaseProgress = (time - config.ventStartSeconds) /
      (config.cooldownStartSeconds - config.ventStartSeconds);
    return { phase: 'venting', phaseProgress, intensity: 0.58 + Math.sin(phaseProgress * Math.PI) * 0.42 };
  }
  return {
    phase: 'cooldown',
    phaseProgress: (time - config.cooldownStartSeconds) /
      (config.cycleSeconds - config.cooldownStartSeconds),
    intensity: 0,
  };
}

export function getIndustrialGeneratorPhase(
  elapsedSeconds: number,
  obstacleIndex: number,
): IndustrialGeneratorPhase {
  const config = INDUSTRIAL_OBJECT_CONFIG.generator;
  const time = cycleTime(elapsedSeconds, obstacleIndex, config.cycleSeconds, 2.6);
  if (time < config.dischargeStartSeconds) {
    return {
      phase: 'charging',
      chargeProgress: time / config.dischargeStartSeconds,
      dischargeProgress: 0,
    };
  }
  if (time < config.cooldownStartSeconds) {
    return {
      phase: 'discharging',
      chargeProgress: 1,
      dischargeProgress: (time - config.dischargeStartSeconds) /
        (config.cooldownStartSeconds - config.dischargeStartSeconds),
    };
  }
  return {
    phase: 'cooldown',
    chargeProgress: 0,
    dischargeProgress: 0,
  };
}

export function getIndustrialSteamDirection(index: number): CirclePosition {
  const angle = (index % 4) * Math.PI / 2 + Math.PI / 8;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function getIndustrialSteamPipeWidth(obstacleWidth: number): number {
  return Math.max(24, Math.min(58, obstacleWidth * 0.72));
}

export function getIndustrialGeneratorDangerRadius(
  obstacleWidth: number,
  obstacleHeight: number,
): number {
  return Math.max(obstacleWidth, obstacleHeight) *
    INDUSTRIAL_OBJECT_CONFIG.generator.dangerRadiusMultiplier;
}

function rectanglesOverlap(
  left: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  right: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
): boolean {
  return left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y;
}

export function updateIndustrialMovingWalls(
  obstacles: ArenaObstacleEntity[],
  barrels: readonly ExplosiveBarrelEntity[],
  actors: Array<{ x: number; y: number; readonly radius: number; alive?: boolean; health?: number }>,
  width: number,
  height: number,
  elapsedSeconds: number,
): void {
  for (let index = 0; index < obstacles.length; index += 1) {
    const obstacle = obstacles[index];
    const motion = obstacle?.industrialMotion;
    if (!obstacle || !motion) continue;

    const time = elapsedSeconds * INDUSTRIAL_OBJECT_CONFIG.movingWall.angularSpeed +
      motion.phase;
    const alongPath = (Math.sin(time) - Math.sin(motion.phase)) *
      motion.amplitude;
    const acrossPath = motion.pathMode === 'loop'
      ? (Math.cos(time) - Math.cos(motion.phase)) * motion.amplitude
      : 0;
    const centerX = motion.originXFraction * width +
      Math.cos(motion.angle) * alongPath -
      Math.sin(motion.angle) * acrossPath;
    const centerY = motion.originYFraction * height +
      Math.sin(motion.angle) * alongPath +
      Math.cos(motion.angle) * acrossPath;
    const candidate = {
      x: centerX - obstacle.width / 2,
      y: centerY - obstacle.height / 2,
      width: obstacle.width,
      height: obstacle.height,
    };
    if (
      candidate.x < 0 ||
      candidate.y < 0 ||
      candidate.x + candidate.width > width ||
      candidate.y + candidate.height > height
    ) continue;

    const overlapsObstacle = obstacles.some((other, otherIndex) => {
      if (otherIndex === index || (other.health !== undefined && other.health <= 0)) return false;
      return rectanglesOverlap(
        candidate,
        getArenaObstacleBounds(other, width, height),
      );
    });
    const overlapsBarrel = barrels.some((barrel) => {
      if (barrel.health <= 0) return false;
      return rectanglesOverlap(candidate, {
        x: width * barrel.xFraction - barrel.radius,
        y: height * barrel.yFraction - barrel.radius,
        width: barrel.radius * 2,
        height: barrel.radius * 2,
      });
    });
    if (overlapsObstacle || overlapsBarrel) continue;

    const previousX = width * obstacle.xFraction;
    const previousY = height * obstacle.yFraction;
    obstacles[index] = {
      ...obstacle,
      xFraction: centerX / width,
      yFraction: centerY / height,
    };
    const collisionObstacles = [
      ...obstacles.filter((other) =>
        other.health === undefined || other.health > 0,
      ),
      ...barrels.filter(({ health }) => health > 0).map((barrel) => ({
        xFraction: width * barrel.xFraction,
        yFraction: height * barrel.yFraction,
        width: barrel.radius * 2,
        height: barrel.radius * 2,
        kind: 'barrel' as const,
      })),
    ];
    for (const actor of actors) {
      if (actor.alive === false || actor.health === 0) continue;
      if (
        actor.x + actor.radius <= candidate.x ||
        actor.x - actor.radius >= candidate.x + candidate.width ||
        actor.y + actor.radius <= candidate.y ||
        actor.y - actor.radius >= candidate.y + candidate.height
      ) continue;

      const pushed = findCirclePositionInArena(
        {
          x: actor.x + centerX - previousX,
          y: actor.y + centerY - previousY,
        },
        actor.radius + INDUSTRIAL_OBJECT_CONFIG.movingWall.pushPadding,
        width,
        height,
        collisionObstacles,
      );
      actor.x = pushed.x;
      actor.y = pushed.y;
    }
  }
}

export function isPointInIndustrialSteam(
  point: CirclePosition,
  radius: number,
  obstacle: ArenaObstacleEntity,
  obstacleIndex: number,
  width: number,
  height: number,
  elapsedSeconds: number,
): boolean {
  const direction = getIndustrialSteamDirection(obstacleIndex);
  const centerX = width * obstacle.xFraction;
  const centerY = height * obstacle.yFraction;
  const baseX = centerX + direction.x * obstacle.width * 0.42;
  const baseY = centerY + direction.y * obstacle.height * 0.42;
  const deltaX = point.x - baseX;
  const deltaY = point.y - baseY;
  const along = deltaX * direction.x + deltaY * direction.y;
  const across = Math.abs(deltaX * direction.y - deltaY * direction.x);
  const pipeWidth = getIndustrialSteamPipeWidth(obstacle.width);
  const steam = getIndustrialSteamPhase(elapsedSeconds, obstacleIndex);
  const plumeLength = pipeWidth * (1.9 + steam.intensity * 2.2);
  const plumeWidth = pipeWidth * 0.5 + along * 0.2;
  return along >= -radius && along <= plumeLength + radius &&
    across <= plumeWidth + radius;
}
