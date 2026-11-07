import { GAME_VISUAL_CONFIG } from '../../rendering/VisualConfig';
import type { GamePerformanceTimings } from '../../core/GamePerformanceDiagnostics';
import { INDUSTRIAL_OBJECT_CONFIG } from '../../core/GameConfig';
import {
  drawIndustrialFloor,
  renderIndustrialObjectBodies,
  renderIndustrialObjectEffects,
  type IndustrialVisualObject,
} from '../environments/industrial';
import {
  getIndustrialGeneratorDangerRadius,
  getIndustrialGeneratorPhase,
  getIndustrialSteamDirection,
  getIndustrialSteamPipeWidth,
  getIndustrialSteamPhase,
} from '../../arena/IndustrialArenaSystem';
import { drawMilitaryFloor } from '../../rendering/MilitaryFloorRenderer';
import { drawContaminatedFloor } from '../../rendering/ContaminatedFloorRenderer';
import type { ArenaThemeId } from '../../arena/ArenaSystem';
import {
  renderContaminatedObjectBodies,
  type ContaminatedVisualObject,
} from '../../rendering/ContaminatedObjectRenderer';
import {
  renderMilitaryObjectBodies,
  type MilitaryVisualObject,
} from '../../rendering/MilitaryObjectRenderer';
import { drawArenaFloor, drawArenaFrame, getArenaTheme } from './ArenaFloorRenderer';
import { renderArenaObstacles } from './ArenaObjectRenderer';
import type { ArenaRenderState } from './ArenaRenderTypes';

interface ArenaBackgroundCache {
  readonly canvas: HTMLCanvasElement;
  readonly theme: ArenaThemeId;
  readonly width: number;
  readonly height: number;
  readonly targetWidth: number;
  readonly targetHeight: number;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly gridSpacing: number;
}

export interface ArenaBackgroundCacheMetrics {
  readonly generationCount: number;
  readonly cacheRebuildCount: number;
}

const arenaBackgroundCaches =
  new WeakMap<CanvasRenderingContext2D, ArenaBackgroundCache>();
let arenaBackgroundGenerationCount = 0;
let arenaBackgroundCacheRebuildCount = 0;

export function getArenaBackgroundCacheMetrics(): ArenaBackgroundCacheMetrics {
  return {
    generationCount: arenaBackgroundGenerationCount,
    cacheRebuildCount: arenaBackgroundCacheRebuildCount,
  };
}

function renderArenaBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ReturnType<typeof getArenaTheme>,
  gridSpacing: number,
): void {
  const drawBackground = (target: CanvasRenderingContext2D): void => {
    if (theme.id === 'military') {
      drawMilitaryFloor(target, width, height);
    } else if (theme.id === 'industrial') {
      drawIndustrialFloor(target, width, height);
    } else if (theme.id === 'contaminated') {
      drawContaminatedFloor(target, width, height);
    } else {
      drawArenaFloor(target, width, height, theme, gridSpacing);
    }
    drawArenaFrame(target, width, height, theme);
  };
  const targetCanvas = context.canvas;
  if (!targetCanvas?.ownerDocument) {
    drawBackground(context);
    arenaBackgroundGenerationCount += 1;
    return;
  }

  const transform = context.getTransform();
  const scaleX = Math.hypot(transform.a, transform.b);
  const scaleY = Math.hypot(transform.c, transform.d);
  const cacheWidth = Math.max(1, Math.round(width * scaleX));
  const cacheHeight = Math.max(1, Math.round(height * scaleY));
  const cached = arenaBackgroundCaches.get(context);
  if (
    !cached ||
    cached.theme !== theme.id ||
    cached.width !== width ||
    cached.height !== height ||
    cached.targetWidth !== targetCanvas.width ||
    cached.targetHeight !== targetCanvas.height ||
    cached.scaleX !== scaleX ||
    cached.scaleY !== scaleY ||
    cached.gridSpacing !== gridSpacing ||
    cached.canvas.width !== cacheWidth ||
    cached.canvas.height !== cacheHeight
  ) {
    const canvas = cached?.canvas ??
      targetCanvas.ownerDocument.createElement('canvas');
    canvas.width = cacheWidth;
    canvas.height = cacheHeight;
    const cacheContext = canvas.getContext('2d');
    if (!cacheContext) {
      throw new Error('Unable to create the arena background cache canvas.');
    }

    cacheContext.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    drawBackground(cacheContext);
    arenaBackgroundCaches.set(context, {
      canvas,
      theme: theme.id,
      width,
      height,
      targetWidth: targetCanvas.width,
      targetHeight: targetCanvas.height,
      scaleX,
      scaleY,
      gridSpacing,
    });
    arenaBackgroundGenerationCount += 1;
    arenaBackgroundCacheRebuildCount += 1;
  }

  const background = arenaBackgroundCaches.get(context);
  if (!background) {
    throw new Error('Arena background cache was not initialized.');
  }
  context.drawImage(background.canvas, 0, 0, width, height);
}

function getIndustrialObjects(
  width: number,
  height: number,
  arena?: ArenaRenderState,
): IndustrialVisualObject[] {
  const objects: IndustrialVisualObject[] = [];
  const elapsedSeconds = arena?.elapsedSeconds ?? 0;
  for (let index = 0; index < (arena?.obstacles.length ?? 0); index += 1) {
    const obstacle = arena!.obstacles[index]!;
    const x = width * obstacle.xFraction;
    const y = height * obstacle.yFraction;
    const w = obstacle.width;
    const h = obstacle.height;

    if (obstacle.kind === 'crate') {
      objects.push({
        id: `industrial-crate-${index}`,
        kind: 'industrial-crate',
        x,
        y,
        width: Math.max(18, w * 0.82),
        height: Math.max(18, h * 0.82),
        health: obstacle.health ?? 100,
        maxHealth: obstacle.maxHealth ?? 100,
        destroyed: obstacle.health !== undefined && obstacle.health <= 0,
      });
      continue;
    }

    if (obstacle.kind === 'wall') {
      objects.push({
        id: `moving-wall-${index}`,
        kind: 'moving-wall',
        x,
        y,
        width: w,
        height: h,
        rotation: 0,
        travelAngle: obstacle.industrialMotion?.angle ?? 0,
        movementIntensity: 0.72 + Math.sin(elapsedSeconds * 1.8 + index) * 0.12,
      });
      continue;
    }

    if (obstacle.kind === 'barricade') {
      const phase = getIndustrialSteamPhase(elapsedSeconds, index);
      const direction = getIndustrialSteamDirection(index);
      objects.push({
        id: `steam-pipe-${index}`,
        kind: 'steam-pipe',
        x,
        y,
        width: getIndustrialSteamPipeWidth(w),
        height: Math.max(18, Math.min(42, h * 1.2)),
        phase: phase.phase,
        directionX: direction.x,
        directionY: direction.y,
        phaseProgress: phase.phaseProgress,
        intensity: phase.intensity,
        rotation: Math.atan2(direction.y, direction.x),
      });
      continue;
    }

    if (obstacle.kind === 'cover') {
      const phase = getIndustrialGeneratorPhase(elapsedSeconds, index);
      objects.push({
        id: `electric-generator-${index}`,
        kind: 'electric-generator',
        x,
        y,
        width: Math.max(32, w),
        height: Math.max(24, h),
        phase: phase.phase,
        chargeProgress: phase.chargeProgress,
        dischargeProgress: phase.dischargeProgress,
        visualSeed: index + 1,
        dangerRadius: getIndustrialGeneratorDangerRadius(w, h),
        arcDirection: elapsedSeconds * 0.7 + index,
      });
    }
  }

  for (const barrel of arena?.barrels ?? []) {
    const x = width * barrel.xFraction;
    const y = height * barrel.yFraction;
    const radius = Math.max(12, barrel.radius * 1.8);
    objects.push({
      id: barrel.id,
      kind: 'oil-barrel',
      x,
      y,
      width: radius,
      height: radius * 1.42,
      health: barrel.health,
      maxHealth: barrel.maxHealth,
      destroyed: barrel.health <= 0,
    });
  }

  for (const cylinder of arena?.gasCylinders ?? []) {
    objects.push({
      id: `gas-cylinder-${cylinder.id}`,
      kind: 'gas-cylinder',
      x: cylinder.x,
      y: cylinder.y,
      width: INDUSTRIAL_OBJECT_CONFIG.gasCylinder.width,
      height: INDUSTRIAL_OBJECT_CONFIG.gasCylinder.height,
      rotation: Math.atan2(cylinder.directionY, cylinder.directionX),
      phase: cylinder.phase,
      travelAngle: Math.atan2(cylinder.directionY, cylinder.directionX),
      travelProgress: Math.max(0, Math.min(1, 1 -
        cylinder.remainingSeconds /
          INDUSTRIAL_OBJECT_CONFIG.gasCylinder.travelDurationSeconds)),
      trailIntensity: cylinder.phase === 'flying' ? 0.8 : 0,
      detonationProgress: cylinder.phase === 'detonating'
        ? Math.max(0, Math.min(
            1,
            1 - cylinder.remainingSeconds /
              INDUSTRIAL_OBJECT_CONFIG.gasCylinder.detonationDurationSeconds,
          ))
        : undefined,
      blastRadius: INDUSTRIAL_OBJECT_CONFIG.gasCylinder.explosionRadius,
    });
  }

  return objects;
}

function renderIndustrialArenaObjects(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  arena?: ArenaRenderState,
  alpha = 1,
  scale = 1,
): void {
  const objects = getIndustrialObjects(width, height, arena);
  const timeSeconds = arena?.elapsedSeconds ?? 0;
  context.save();
  try {
    context.globalAlpha *= alpha;
    const renderAtObjectScale = (
      render: typeof renderIndustrialObjectBodies,
    ): void => {
      for (const object of objects) {
        context.save();
        try {
          context.translate(object.x, object.y);
          context.scale(scale, scale);
          context.translate(-object.x, -object.y);
          render(context, [object], { timeSeconds });
        } finally {
          context.restore();
        }
      }
    };

    renderAtObjectScale(renderIndustrialObjectBodies);
    renderAtObjectScale(renderIndustrialObjectEffects);
  } finally {
    context.restore();
  }
}

function renderMilitaryArenaObjects(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  objects: readonly MilitaryVisualObject[] | undefined,
  timeSeconds: number,
  alpha = 1,
  scale = 1,
): void {
  if (!objects?.length) return;
  context.save();
  try {
    context.globalAlpha *= alpha;
    context.translate(width / 2, height / 2);
    context.scale(scale, scale);
    context.translate(-width / 2, -height / 2);
    renderMilitaryObjectBodies(context, objects, { timeSeconds });
  } finally {
    context.restore();
  }
}

function renderContaminatedArenaObjects(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  objects: readonly ContaminatedVisualObject[] | undefined,
  timeSeconds: number,
  alpha = 1,
  scale = 1,
): void {
  if (!objects?.length) return;
  context.save();
  try {
    context.globalAlpha *= alpha;
    context.translate(width / 2, height / 2);
    context.scale(scale, scale);
    context.translate(-width / 2, -height / 2);
    renderContaminatedObjectBodies(context, objects, { timeSeconds });
  } finally {
    context.restore();
  }
}

function renderArenaLayer(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  arena?: ArenaRenderState,
  alpha = 1,
  scale = 1,
  includeObstacles = true,
  performanceTimings?: GamePerformanceTimings,
): void {
  const { arena: dimensions } = GAME_VISUAL_CONFIG;
  const theme = getArenaTheme(arena?.theme);

  context.save();
  try {
    context.globalAlpha *= alpha;
    context.translate(width / 2, height / 2);
    context.scale(scale, scale);
    context.translate(-width / 2, -height / 2);

    const floorStartedAt = performanceTimings ? performance.now() : 0;
    renderArenaBackground(context, width, height, theme, dimensions.gridSpacing);
    if (performanceTimings) {
      performanceTimings.arenaFloorMs += performance.now() - floorStartedAt;
    }

    if (theme.id === 'industrial') {
      if (includeObstacles) {
        renderIndustrialArenaObjects(context, width, height, arena, 1, 1);
      }
      return;
    }

    if (includeObstacles) {
      if (theme.id === 'contaminated') {
        renderContaminatedObjectBodies(
          context,
          arena?.contaminatedObjects ?? [],
          { timeSeconds: arena?.elapsedSeconds ?? 0 },
        );
      }
      renderArenaObstacles(context, width, height, arena);
      if (theme.id === 'military') {
        renderMilitaryArenaObjects(
          context,
          width,
          height,
          arena?.militaryObjects,
          arena?.elapsedSeconds ?? 0,
        );
      }
    }
  } finally {
    context.restore();
  }
}

export function renderArena(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  arena?: ArenaRenderState,
  performanceTimings?: GamePerformanceTimings,
): void {
  if (!arena?.transition) {
    renderArenaLayer(context, width, height, arena, 1, 1, true, performanceTimings);
    return;
  }

  const transition = arena.transition;
  const progress = Math.max(0, Math.min(1, transition.progress));
  renderArenaLayer(context, width, height, arena, 1, 1, false, performanceTimings);
  if (progress < 0.5) {
    const phaseProgress = progress * 2;
    const zoomOut = phaseProgress * phaseProgress * (3 - 2 * phaseProgress);
    const fromTheme = getArenaTheme(transition.from.theme);
    if (fromTheme.id === 'industrial') {
      renderIndustrialArenaObjects(
        context,
        width,
        height,
        {
          ...transition.from,
          elapsedSeconds: transition.from.elapsedSeconds ?? arena.elapsedSeconds,
        },
        1 - zoomOut,
        1 - zoomOut,
      );
      return;
    }
    renderArenaObstacles(
      context,
      width,
      height,
      transition.from,
      1 - zoomOut,
      1 - zoomOut,
    );
    if (fromTheme.id === 'military') {
      renderMilitaryArenaObjects(
        context,
        width,
        height,
        transition.from.militaryObjects,
        transition.from.elapsedSeconds ?? arena.elapsedSeconds ?? 0,
        1 - zoomOut,
        1 - zoomOut,
      );
    }
    if (fromTheme.id === 'contaminated') {
      renderContaminatedArenaObjects(
        context,
        width,
        height,
        transition.from.contaminatedObjects,
        transition.from.elapsedSeconds ?? arena.elapsedSeconds ?? 0,
        1 - zoomOut,
        1 - zoomOut,
      );
    }
    return;
  }

  const phaseProgress = (progress - 0.5) * 2;
  const zoomIn = phaseProgress * phaseProgress * (3 - 2 * phaseProgress);
  const theme = getArenaTheme(arena?.theme);
  if (theme.id === 'industrial') {
    renderIndustrialArenaObjects(context, width, height, arena, zoomIn, zoomIn);
    return;
  }
  if (theme.id === 'military') {
    renderMilitaryArenaObjects(
      context,
      width,
      height,
      arena?.militaryObjects,
      arena?.elapsedSeconds ?? 0,
      zoomIn,
      zoomIn,
    );
    return;
  }
  if (theme.id === 'contaminated') {
    renderContaminatedArenaObjects(
      context,
      width,
      height,
      arena?.contaminatedObjects,
      arena?.elapsedSeconds ?? 0,
      zoomIn,
      zoomIn,
    );
  }
  renderArenaObstacles(context, width, height, arena, zoomIn, zoomIn);
}
