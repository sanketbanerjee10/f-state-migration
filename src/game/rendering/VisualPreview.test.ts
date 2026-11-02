import { describe, expect, it, vi } from 'vitest';
import { createVisualPreviewLayers } from './VisualPreview';
import { renderGameScene } from './Renderer';
import type { RenderActor } from './RenderScene';
import { drawZombie } from './ZombieRenderer';

function createContext() {
  return {
    arc: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
  } as unknown as CanvasRenderingContext2D & {
    arc: ReturnType<typeof vi.fn>;
    fillRect: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
}

describe('procedural visual preview', () => {
  it('provides all initial entity types and adapts its preview to the viewport', () => {
    const portrait = createVisualPreviewLayers(960, 2000);
    const landscape = createVisualPreviewLayers(1200, 675);

    expect(portrait.actors).toHaveLength(5);
    expect(portrait.pickups).toHaveLength(5);
    expect(portrait.projectiles).toHaveLength(3);
    expect(portrait.groundShadows).toHaveLength(10);
    expect(landscape.actors).toHaveLength(portrait.actors.length);
    expect(landscape.feedback).toHaveLength(3);
  });

  it('renders a dense enemy crowd without mutating render-ready entity data', () => {
    const context = createContext();
    const crowd = Array.from({ length: 120 }, (_, index) => {
      const zombie = {
        x: 40 + (index % 12) * 32,
        y: 40 + Math.floor(index / 12) * 28,
        type: index % 2 === 0 ? 'walker' as const : 'runner' as const,
        facingAngle: index * 0.13,
        healthFraction: 0.72,
      };
      return {
        y: zombie.y,
        draw: (target: CanvasRenderingContext2D, frame: { elapsedSeconds: number }) =>
          drawZombie(target, zombie, frame.elapsedSeconds),
      } satisfies RenderActor;
    });
    const initialData = crowd.map((actor) => actor.y);

    for (const actor of crowd) actor.draw(context, { elapsedSeconds: 12.5 });

    expect(crowd.map((actor) => actor.y)).toEqual(initialData);
    expect(context.arc.mock.calls.length).toBeGreaterThan(120);
    expect(context.save.mock.calls.length).toBe(context.restore.mock.calls.length);

    renderGameScene(context, 960, 540, 12.5, {
      groundShadows: [],
      pickups: [],
      projectiles: [],
      actors: crowd,
      foregroundEffects: [],
      feedback: [],
      debugOverlays: [],
    });
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 960, 540);
  });
});
