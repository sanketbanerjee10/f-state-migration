import { describe, expect, it, vi } from 'vitest';
import { ARENA_OBSTACLES } from '@/game/core/GameConfig';
import { renderArena } from '@/game/rendering/ArenaRenderer';
import { getArenaBackgroundCacheMetrics } from '@/game/arenas/core/ArenaRenderer';

function createContext() {
  const gradient = { addColorStop: vi.fn() };

  return {
    arc: vi.fn(),
    arcTo: vi.fn(),
    beginPath: vi.fn(),
    clip: vi.fn(),
    closePath: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    setLineDash: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D & {
    fillRect: ReturnType<typeof vi.fn>;
    scale: ReturnType<typeof vi.fn>;
  };
}

function createCachedContext() {
  const cacheContext = createContext() as CanvasRenderingContext2D & {
    setTransform: ReturnType<typeof vi.fn>;
  };
  cacheContext.setTransform = vi.fn();
  const cachedCanvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => cacheContext),
  } as unknown as HTMLCanvasElement;
  const targetCanvas = {
    width: 960,
    height: 540,
    ownerDocument: {
      createElement: vi.fn(() => cachedCanvas),
    },
  } as unknown as HTMLCanvasElement;
  const targetContext = Object.assign(createContext(), {
    canvas: targetCanvas,
    getTransform: vi.fn(() => ({ a: 2, b: 0, c: 0, d: 2 })),
    drawImage: vi.fn(),
  }) as CanvasRenderingContext2D & {
    canvas: HTMLCanvasElement;
    drawImage: ReturnType<typeof vi.fn>;
    getTransform: ReturnType<typeof vi.fn>;
    translate: ReturnType<typeof vi.fn>;
  };
  return { targetCanvas, targetContext, cachedCanvas, cacheContext };
}

describe('renderArena', () => {
  it('draws the configured procedural obstacles after the ground layer', () => {
    const context = createContext();

    renderArena(context, 960, 540);

    expect(ARENA_OBSTACLES).toHaveLength(6);
    expect(ARENA_OBSTACLES.filter(({ kind }) => kind === 'crate')).toHaveLength(2);
    expect(ARENA_OBSTACLES.filter(({ kind }) => kind === 'barricade')).toHaveLength(2);
    expect(ARENA_OBSTACLES.filter(({ kind }) => kind === 'wall')).toHaveLength(1);
    expect(ARENA_OBSTACLES.filter(({ kind }) => kind === 'cover')).toHaveLength(1);
    expect(context.fillRect).toHaveBeenNthCalledWith(1, 0, 0, 960, 540);
  });

  it('keeps obstacle centers proportional across arena sizes', () => {
    const context = createContext();
    const dimensions = [
      [960, 540],
      [1440, 810],
    ] as const;

    for (const [width, height] of dimensions) renderArena(context, width, height);

    const firstCrate = ARENA_OBSTACLES[0];
    expect(firstCrate).toBeDefined();
    if (!firstCrate) return;

    const expectedCenters = dimensions.map(([width, height]) => [
      width * firstCrate.xFraction,
      height * firstCrate.yFraction,
    ]);
    for (const center of expectedCenters) {
      expect(context.translate).toHaveBeenCalledWith(...center);
    }
  });

  it('draws the segmented floor grid and rounded arena frame', () => {
    const context = createContext();

    renderArena(context, 960, 540);

    expect(context.moveTo).toHaveBeenCalled();
    expect(context.arcTo).toHaveBeenCalled();
    expect(context.stroke).toHaveBeenCalled();
  });

  it('does not draw a rectangular stroke around the arena', () => {
    const context = createContext();

    renderArena(context, 960, 540);

    expect(context.strokeRect).not.toHaveBeenCalled();
  });

  it('caches the static background while keeping arena objects dynamic', () => {
    const { targetContext, cacheContext, cachedCanvas } = createCachedContext();
    const before = getArenaBackgroundCacheMetrics();

    renderArena(targetContext, 960, 540);
    const objectDrawCalls = targetContext.translate.mock.calls.length;
    renderArena(targetContext, 960, 540);

    const after = getArenaBackgroundCacheMetrics();
    expect(after.generationCount - before.generationCount).toBe(1);
    expect(after.cacheRebuildCount - before.cacheRebuildCount).toBe(1);
    expect(targetContext.drawImage).toHaveBeenCalledTimes(2);
    expect(cacheContext.fillRect).toHaveBeenCalled();
    expect(targetContext.translate.mock.calls.length).toBeGreaterThan(
      objectDrawCalls,
    );
    expect(cachedCanvas.width).toBe(1920);
    expect(cachedCanvas.height).toBe(1080);
  });

  it('rebuilds the background cache for arena, canvas-size, and DPR changes', () => {
    const { targetCanvas, targetContext } = createCachedContext();
    const before = getArenaBackgroundCacheMetrics();
    renderArena(targetContext, 960, 540);
    renderArena(targetContext, 480, 270);
    renderArena(targetContext, 480, 270, {
      obstacles: [],
      barrels: [],
      theme: 'urban',
    });
    targetCanvas.width = 1440;
    targetCanvas.height = 810;
    targetContext.getTransform.mockReturnValue({
      a: 3,
      b: 0,
      c: 0,
      d: 3,
    });
    renderArena(targetContext, 480, 270, {
      obstacles: [],
      barrels: [],
      theme: 'urban',
    });

    const after = getArenaBackgroundCacheMetrics();
    expect(after.generationCount - before.generationCount).toBe(4);
    expect(after.cacheRebuildCount - before.cacheRebuildCount).toBe(4);
  });

  it('zooms out old obstacles at their centers before zooming in new obstacles', () => {
    const oldObstacle = {
      ...ARENA_OBSTACLES[0]!,
      xFraction: 0.24,
      yFraction: 0.34,
    };
    const newObstacle = {
      ...ARENA_OBSTACLES[1]!,
      xFraction: 0.73,
      yFraction: 0.67,
    };
    const previousArena = {
      obstacles: [oldObstacle],
      barrels: [],
      theme: 'military' as const,
    };
    const nextArena = {
      obstacles: [newObstacle],
      barrels: [],
      theme: 'industrial' as const,
    };
    const oldContext = createContext();

    renderArena(oldContext, 960, 540, {
      ...nextArena,
      transition: { from: previousArena, progress: 0.25 },
    });

    expect(oldContext.fillRect).toHaveBeenNthCalledWith(1, 0, 0, 960, 540);
    expect(oldContext.scale.mock.calls).toEqual([[1, 1], [0.5, 0.5]]);
    const oldCenterX = 960 * oldObstacle.xFraction;
    const oldCenterY = 540 * oldObstacle.yFraction;
    expect(oldContext.translate).toHaveBeenCalledWith(oldCenterX, oldCenterY);
    expect(oldContext.translate).toHaveBeenCalledWith(-oldCenterX, -oldCenterY);

    const newContext = createContext();
    renderArena(newContext, 960, 540, {
      ...nextArena,
      transition: { from: previousArena, progress: 0.75 },
    });

    expect(newContext.fillRect).toHaveBeenNthCalledWith(1, 0, 0, 960, 540);
    expect(newContext.scale.mock.calls).toEqual([
      [1, 1],
      [0.5, 0.5],
      [0.5, 0.5],
    ]);
    const newCenterX = 960 * newObstacle.xFraction;
    const newCenterY = 540 * newObstacle.yFraction;
    expect(newContext.translate).toHaveBeenCalledWith(newCenterX, newCenterY);
    expect(newContext.translate).toHaveBeenCalledWith(-newCenterX, -newCenterY);
  });
});
