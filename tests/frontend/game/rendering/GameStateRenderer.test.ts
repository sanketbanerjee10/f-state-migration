import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameState, createZombie } from '@/game/core/GameState';
import { GAME_PALETTE } from '@/game/rendering/GamePalette';
import { createGameStateRenderLayers } from '@/game/rendering/GameStateRenderer';

function createContext() {
  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
  };
  return context as unknown as CanvasRenderingContext2D;
}

describe('game state render layers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders bloater poison hazards in neon yellow with animated particles', () => {
    const state = createGameState();
    state.hazards = [{
      id: 8,
      x: 120,
      y: 80,
      radius: 32,
      damage: 6,
      durationSeconds: 5,
      remainingSeconds: 4,
      kind: 'bloater',
    }];
    const layers = createGameStateRenderLayers(state);
    const fillStyles: string[] = [];
    const context = createContext();
    Object.defineProperty(context, 'fillStyle', {
      set: (value: string) => fillStyles.push(value),
    });

    layers.groundShadows[1]!.draw(context, { elapsedSeconds: 1.2 });
    layers.foregroundEffects[0]!.draw(context, { elapsedSeconds: 1.2 });

    expect(fillStyles).toContain(GAME_PALETTE.hazards.bloaterFill);
    expect(fillStyles).toContain(GAME_PALETTE.hazards.bloaterParticle);
    expect(context.arc).toHaveBeenCalledWith(
      120,
      80,
      32,
      0,
      Math.PI * 2,
    );
    expect(context.arc).toHaveBeenCalledTimes(12);
  });

  it('maps gameplay entities and feedback to pure draw commands without mutating state', () => {
    vi.stubGlobal('Path2D', class {
      constructor(_path: string) {}
    });
    const state = createGameState();
    state.zombies = [createZombie(1, 'walker', 240, 180)];
    state.items = [{
      id: 2,
      type: 'health',
      x: 300,
      y: 180,
      radius: 16,
      durationSeconds: 12,
      remainingSeconds: 6,
    }];
    state.projectiles = [{
      id: 3,
      x: 320,
      y: 220,
      directionX: 1,
      directionY: 0,
      radius: 4,
      damage: 25,
      speed: 560,
      remainingSeconds: 1,
    }];
    state.impacts = [{
      id: 4,
      x: 240,
      y: 180,
      durationSeconds: 0.4,
      remainingSeconds: 0.2,
      kind: 'death',
      critical: true,
    }];
    state.collectionEffects = [{
      id: 5,
      x: 300,
      y: 180,
      color: '#4ADE80',
      durationSeconds: 0.36,
      remainingSeconds: 0.18,
    }];
    state.damageNumbers = [{
      id: 6,
      x: 240,
      y: 160,
      amount: 25,
      durationSeconds: 0.65,
      remainingSeconds: 0.3,
    }];
    state.player.muzzleFlashSeconds = 0.05;

    const layers = createGameStateRenderLayers(state);
    const beforeDraw = JSON.stringify(state);
    const context = createContext();
    const frame = { elapsedSeconds: 1.25 };

    expect(layers.actors).toHaveLength(2);
    expect(layers.pickups).toHaveLength(1);
    expect(layers.projectiles).toHaveLength(1);
    expect(layers.foregroundEffects).toHaveLength(2);
    expect(layers.feedback).toHaveLength(3);

    for (const commands of [
      layers.groundShadows,
      layers.pickups,
      layers.projectiles,
      layers.actors,
      layers.foregroundEffects,
      layers.feedback,
      layers.debugOverlays,
    ]) {
      for (const command of commands) command.draw(context, frame);
    }

    expect(context.arc).toHaveBeenCalled();
    expect(context.fillText).toHaveBeenCalledWith('25', 240, expect.any(Number));
    expect(JSON.stringify(state)).toBe(beforeDraw);
  });
});
