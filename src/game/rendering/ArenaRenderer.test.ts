import { describe, expect, it, vi } from 'vitest';
import { ARENA_OBSTACLES } from '../core/GameConfig';
import { renderArena } from './ArenaRenderer';

function createContext() {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D & {
    fillRect: ReturnType<typeof vi.fn>;
  };
}

describe('renderArena', () => {
  it('draws the configured procedural obstacles after the ground layer', () => {
    const context = createContext();

    renderArena(context, 960, 540);

    expect(ARENA_OBSTACLES).toHaveLength(4);
    expect(ARENA_OBSTACLES.filter(({ kind }) => kind === 'crate')).toHaveLength(2);
    expect(ARENA_OBSTACLES.filter(({ kind }) => kind === 'barricade')).toHaveLength(2);
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

    const expectedShadows = dimensions.map(([width, height]) => [
      width * firstCrate.xFraction - firstCrate.width / 2 + 4,
      height * firstCrate.yFraction - firstCrate.height / 2 + 6,
      firstCrate.width,
      firstCrate.height,
    ]);
    for (const shadow of expectedShadows) {
      expect(context.fillRect).toHaveBeenCalledWith(...shadow);
    }
  });
});
