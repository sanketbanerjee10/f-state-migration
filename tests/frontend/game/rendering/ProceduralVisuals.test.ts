import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drawCollectionBurst, drawDamageNumber, drawImpactEffect, drawMuzzleFlash } from '@/game/rendering/EffectsRenderer';
import { createEnemyAppearance, drawBody, drawEnemyAnatomy, drawFace, drawHead, drawMutations } from '@/game/rendering/enemies';
import { INITIAL_ORB_TYPES, drawOrb } from '@/game/rendering/OrbRenderer';
import { GAME_VISUAL_CONFIG } from '@/game/rendering/VisualConfig';
import { drawPlayer } from '@/game/rendering/PlayerRenderer';
import { drawProjectile } from '@/game/rendering/ProjectileRenderer';
import { drawZombie } from '@/game/rendering/ZombieRenderer';

class TestPath2D {
  constructor(readonly data: string) {}
}

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
    rotate: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    stroke: vi.fn(),
    strokeRect: vi.fn(),
    translate: vi.fn(),
  };
  return context as unknown as CanvasRenderingContext2D & {
    arc: ReturnType<typeof vi.fn>;
    fillRect: ReturnType<typeof vi.fn>;
    fillText: ReturnType<typeof vi.fn>;
    lineTo: ReturnType<typeof vi.fn>;
    moveTo: ReturnType<typeof vi.fn>;
    restore: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };
}

describe('procedural entity visuals', () => {
  beforeEach(() => {
    vi.stubGlobal('Path2D', TestPath2D);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps player body orientation fixed while the separate barrel follows aim', () => {
    const east = createContext();
    const north = createContext();

    drawPlayer(east, { x: 100, y: 80, aimAngle: 0, shieldStrength: 1 }, 1);
    drawPlayer(north, { x: 100, y: 80, aimAngle: Math.PI / 2 }, 1);

    expect(east.moveTo.mock.calls[0]).toEqual([105.6, 80]);
    expect(east.lineTo.mock.calls[0]).toEqual([131.4, 80]);
    expect(north.moveTo.mock.calls[0]?.[0]).toBeCloseTo(100);
    expect(north.moveTo.mock.calls[0]?.[1]).toBeCloseTo(85.6);
    expect(east.arc.mock.calls.some(([, , radius]) => radius === 14)).toBe(true);
    expect(GAME_VISUAL_CONFIG.entity.playerRadius).toBe(18);
    expect(GAME_VISUAL_CONFIG.entity.aimMarkerWidth).toBe(10);
    expect(east.save.mock.calls.length).toBe(east.restore.mock.calls.length);
  });

  it('renders the walker and runner with different geometry and damaged-only health bars', () => {
    const walker = createContext();
    const damagedWalker = createContext();
    const runner = createContext();
    const healthyRunner = createContext();

    drawZombie(walker, { x: 40, y: 50, type: 'walker', healthFraction: 1 }, 0.4);
    drawZombie(
      damagedWalker,
      { x: 40, y: 50, type: 'walker', healthFraction: 0.5 },
      0.4,
    );
    drawZombie(
      runner,
      { x: 40, y: 50, type: 'runner', facingAngle: 0.6, healthFraction: 0.5 },
      0.4,
    );
    drawZombie(
      healthyRunner,
      { x: 40, y: 50, type: 'runner', facingAngle: 0.6, healthFraction: 1 },
      0.4,
    );

    expect(walker.arc.mock.calls).not.toEqual(runner.arc.mock.calls);
    expect(runner.lineTo.mock.calls.length).toBeGreaterThan(0);
    expect(damagedWalker.fillRect).toHaveBeenCalled();
    expect(walker.fillRect).not.toHaveBeenCalled();
    expect(runner.lineTo.mock.calls.length).toBeGreaterThan(
      healthyRunner.lineTo.mock.calls.length,
    );
  });

  it('draws projectile trails behind their travel direction', () => {
    const east = createContext();
    const north = createContext();

    drawProjectile(east, { x: 100, y: 80, directionX: 1, directionY: 0 });
    drawProjectile(north, { x: 100, y: 80, directionX: 0, directionY: 1 });

    expect(east.moveTo.mock.calls[0]).toEqual([90, 80]);
    expect(north.moveTo.mock.calls[0]).toEqual([100, 70]);
  });

  it('renders Spitter projectiles in green with a matching trail', () => {
    const context = createContext();
    const fillColors: string[] = [];
    const strokeColors: string[] = [];
    Object.defineProperty(context, 'fillStyle', {
      set: (value: string) => fillColors.push(value),
    });
    Object.defineProperty(context, 'strokeStyle', {
      set: (value: string) => strokeColors.push(value),
    });

    drawProjectile(context, {
      x: 100,
      y: 80,
      directionX: 1,
      directionY: 0,
      type: 'spitter',
    });

    expect(fillColors).toContain('#8fdb55');
    expect(strokeColors).toEqual([
      'rgba(143, 219, 85, 0.72)',
      '#314b25',
    ]);
  });

  it('draws each of the five circular orb types with a symbol and expiry ring', () => {
    expect(INITIAL_ORB_TYPES).toHaveLength(5);
    for (const type of INITIAL_ORB_TYPES) {
      const context = createContext();

      drawOrb(
        context,
        { x: 80, y: 90, type, remainingFraction: 0.6 },
        2.5,
      );

      expect(context.arc.mock.calls.length).toBeGreaterThanOrEqual(4);
      expect(context.save.mock.calls.length).toBe(context.restore.mock.calls.length);
      expect(context.fill.mock.calls.length + context.stroke.mock.calls.length).toBeGreaterThan(0);
    }
  });

  it('renders the health orb with an emerald shell, green glow, and thick white plus', () => {
    const context = createContext();
    const fillColors: string[] = [];
    const strokeColors: string[] = [];
    const lineWidths: number[] = [];
    Object.defineProperty(context, 'fillStyle', {
      set: (value: string) => fillColors.push(value),
    });
    Object.defineProperty(context, 'strokeStyle', {
      set: (value: string) => strokeColors.push(value),
    });
    Object.defineProperty(context, 'lineWidth', {
      set: (value: number) => lineWidths.push(value),
    });

    drawOrb(
      context,
      { x: 80, y: 90, type: 'health', remainingFraction: 0 },
      0,
    );

    expect(fillColors).toContain('#31b85c');
    expect(fillColors).toContain('#3acb68');
    expect(strokeColors).toContain('#f0f8f1');
    expect(lineWidths.length).toBeGreaterThan(0);
    expect(context.stroke).toHaveBeenCalled();
  });

  it('enlarges the shell and inner glow without changing the outer glow size', () => {
    const context = createContext();
    const baseOrbRadius = GAME_VISUAL_CONFIG.entity.orbRadius;
    const suppliedOrbRadius = baseOrbRadius * 1.25;

    drawOrb(
      context,
      {
        x: 80,
        y: 90,
        type: 'health',
        radius: suppliedOrbRadius,
        remainingFraction: 0,
      },
      0,
    );

    const orbRadii = context.arc.mock.calls
      .slice(0, 3)
      .map(([, , radius]) => radius);
    const enlargedShellRadius = suppliedOrbRadius * 1.2;
    expect(orbRadii).toEqual([
      suppliedOrbRadius * 2.05,
      enlargedShellRadius,
      enlargedShellRadius * 0.92,
    ]);
  });

  it('renders all nine distinct orbs using their custom silhouettes', () => {
    const types = [
      'health',
      'damage',
      'rapidFire',
      'shield',
      'bomb',
      'magnet',
      'turret',
      'cursed',
      'rareGold',
    ] as const;
    for (const type of types) {
      const context = createContext();

      drawOrb(
        context,
        { x: 80, y: 90, type, remainingFraction: 1 },
        0,
      );

      const drawnPaths = [
        ...context.fill.mock.calls,
        ...context.stroke.mock.calls,
      ].flatMap(([path]) => path instanceof TestPath2D ? [path] : []);
      expect(drawnPaths.length, type).toBeGreaterThan(0);
      expect(drawnPaths.every((path) => path.data.length > 0), type).toBe(true);
      expect(context.save.mock.calls.length, type)
        .toBe(context.restore.mock.calls.length);
    }
  });

  it('renders the expanded orb types and their rarity rings', () => {
    for (const type of ['magnet', 'turret', 'cursed', 'rareGold'] as const) {
      const context = createContext();

      drawOrb(
        context,
        { x: 80, y: 90, type, rarity: 'special', remainingFraction: 0.6 },
        2.5,
      );

      expect(context.arc.mock.calls.length).toBeGreaterThanOrEqual(5);
      expect(context.save.mock.calls.length).toBe(context.restore.mock.calls.length);
      expect(context.fill.mock.calls.length + context.stroke.mock.calls.length).toBeGreaterThan(0);
    }
  });

  it('builds reusable body, head, face, and mutation anatomy layers', () => {
    const context = createContext();
    const appearance = createEnemyAppearance({
      bodyColor: '#89a96b',
      outlineColor: '#1c2b2d',
      limbColor: '#415f5a',
      headScale: 1.2,
      torsoScale: 1.15,
      hornStyle: 'curved',
      eyeStyle: 'glowing',
      mouthStyle: 'fangs',
      mutationLevel: 2,
      armorLevel: 1,
      clawStyle: 'hooked',
    });

    drawBody(context, { x: 30, y: 40, radius: 12, torsoScale: 1.1 }, appearance);
    drawHead(context, { x: 30, y: 22, radius: 11 }, appearance);
    drawFace(context, { x: 30, y: 22, radius: 11 }, appearance);
    drawMutations(context, { x: 30, y: 26, radius: 12 }, appearance);
    drawEnemyAnatomy(context, { x: 80, y: 70, radius: 16, movementFactor: 0.6, healthFraction: 0.65 }, 1.2, appearance);

    expect(context.arc.mock.calls.length).toBeGreaterThan(0);
    expect(context.moveTo.mock.calls.length).toBeGreaterThan(0);
    expect(context.lineTo.mock.calls.length).toBeGreaterThan(0);
  });

  it('renders deterministic muzzle, impact, collection, and damage feedback', () => {
    const context = createContext();
    const savedCommands: unknown[][] = [];

    drawMuzzleFlash(context, { x: 20, y: 30, angle: 0.4, intensity: 0.8 });
    const impactStart = context.moveTo.mock.calls.length;
    drawImpactEffect(context, { x: 40, y: 50, progress: 0.45, critical: true });
    const firstImpactLines = context.moveTo.mock.calls.slice(impactStart);
    drawImpactEffect(context, { x: 40, y: 50, progress: 0.45, critical: true });
    expect(
      context.moveTo.mock.calls.slice(impactStart + firstImpactLines.length),
    ).toEqual(firstImpactLines);

    drawCollectionBurst(context, { x: 60, y: 70, progress: 0.3, color: '#4ADE80' });
    drawDamageNumber(context, { x: 80, y: 90, amount: 24, progress: 0.5 });
    savedCommands.push(...context.moveTo.mock.calls);

    expect(savedCommands.length).toBeGreaterThan(0);
    expect(context.fillText).toHaveBeenCalledWith('24', 80, 81);
    expect(context.save.mock.calls.length).toBe(context.restore.mock.calls.length);
  });
});
