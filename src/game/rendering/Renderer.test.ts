import { describe, expect, it, vi } from 'vitest';
import { renderGameScene } from './Renderer';
import type { RenderActor, RenderCommand, RenderLayers } from './RenderScene';

function createContext() {
  const context = {
    beginPath: vi.fn(),
    fillRect: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    setTransform: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
  };
  return context as unknown as CanvasRenderingContext2D & {
    fillRect: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
}

function command(label: string, order: string[], y?: number): RenderCommand {
  return {
    draw: vi.fn((_context, frame) => {
      order.push(`${label}:${frame.elapsedSeconds}`);
    }),
    ...(y === undefined ? {} : { y }),
  };
}

function emptyLayers(overrides: Partial<RenderLayers> = {}): RenderLayers {
  return {
    groundShadows: [],
    pickups: [],
    projectiles: [],
    actors: [],
    foregroundEffects: [],
    feedback: [],
    debugOverlays: [],
    ...overrides,
  };
}

describe('renderGameScene', () => {
  it('renders layers in order and sorts actors from back to front by world Y', () => {
    const context = createContext();
    const order: string[] = [];
    const shadow = command('shadow', order);
    const pickup = command('pickup', order);
    const projectile = command('projectile', order);
    const frontActor = command('front', order, 20) as RenderActor;
    const backActor = command('back', order, 80) as RenderActor;
    const middleActor = command('middle', order, 50) as RenderActor;
    const effect = command('effect', order);
    const feedback = command('feedback', order);
    const debug = command('debug', order);

    renderGameScene(
      context,
      960,
      540,
      3.5,
      emptyLayers({
        groundShadows: [shadow],
        pickups: [pickup],
        projectiles: [projectile],
        actors: [frontActor, backActor, middleActor],
        foregroundEffects: [effect],
        feedback: [feedback],
        debugOverlays: [debug],
      }),
    );

    expect(order).toEqual([
      'shadow:3.5',
      'pickup:3.5',
      'projectile:3.5',
      'front:3.5',
      'middle:3.5',
      'back:3.5',
      'effect:3.5',
      'feedback:3.5',
      'debug:3.5',
    ]);
  });

  it('isolates each draw command and restores canvas state if one throws', () => {
    const context = createContext();
    const failure = new Error('test draw failure');
    const badCommand: RenderCommand = {
      draw: () => {
        throw failure;
      },
    };

    expect(() =>
      renderGameScene(
        context,
        960,
        540,
        0,
        emptyLayers({ pickups: [badCommand] }),
      ),
    ).toThrow(failure);
    expect(context.save.mock.calls.length).toBeGreaterThan(0);
    expect(context.save.mock.calls.length).toBe(context.restore.mock.calls.length);
  });

  it('does not mutate the actor collection while sorting draw order', () => {
    const order: string[] = [];
    const actors = [
      command('lower', order, 90) as RenderActor,
      command('upper', order, 10) as RenderActor,
    ];
    const originalOrder = [...actors];

    renderGameScene(
      createContext(),
      960,
      540,
      0,
      emptyLayers({ actors }),
    );

    expect(actors).toEqual(originalOrder);
    expect(order).toEqual(['upper:0', 'lower:0']);
  });
});
