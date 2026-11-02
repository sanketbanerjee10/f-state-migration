import { describe, expect, it, vi } from 'vitest';
import { drawCollectionBurst, drawDamageNumber, drawImpactEffect, drawMuzzleFlash } from './EffectsRenderer';
import { INITIAL_ORB_TYPES, drawOrb } from './OrbRenderer';
import { drawPlayer } from './PlayerRenderer';
import { drawProjectile } from './ProjectileRenderer';
import { drawZombie } from './ZombieRenderer';

function createContext() {
  const context = {
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
    stroke: vi.fn(),
    strokeRect: vi.fn(),
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
  it('keeps player body orientation fixed while the separate barrel follows aim', () => {
    const east = createContext();
    const north = createContext();

    drawPlayer(east, { x: 100, y: 80, aimAngle: 0, shieldStrength: 1 }, 1);
    drawPlayer(north, { x: 100, y: 80, aimAngle: Math.PI / 2 }, 1);

    expect(east.moveTo.mock.calls[0]).toEqual([107.2, 80]);
    expect(north.moveTo.mock.calls[0]?.[0]).toBeCloseTo(100);
    expect(north.moveTo.mock.calls[0]?.[1]).toBeCloseTo(87.2);
    expect(east.arc.mock.calls.some(([, , radius]) => radius === 18)).toBe(true);
    expect(east.save.mock.calls.length).toBe(east.restore.mock.calls.length);
  });

  it('renders the walker and runner with different geometry and damaged-only health bars', () => {
    const walker = createContext();
    const runner = createContext();

    drawZombie(walker, { x: 40, y: 50, type: 'walker', healthFraction: 1 }, 0.4);
    drawZombie(
      runner,
      { x: 40, y: 50, type: 'runner', facingAngle: 0.6, healthFraction: 0.5 },
      0.4,
    );

    expect(walker.arc.mock.calls.length).toBeGreaterThan(runner.arc.mock.calls.length);
    expect(runner.lineTo.mock.calls.length).toBeGreaterThan(0);
    expect(walker.fillRect).not.toHaveBeenCalled();
    expect(runner.fillRect).toHaveBeenCalled();
  });

  it('draws projectile trails behind their travel direction', () => {
    const east = createContext();
    const north = createContext();

    drawProjectile(east, { x: 100, y: 80, directionX: 1, directionY: 0 });
    drawProjectile(north, { x: 100, y: 80, directionX: 0, directionY: 1 });

    expect(east.moveTo.mock.calls[0]).toEqual([90, 80]);
    expect(north.moveTo.mock.calls[0]).toEqual([100, 70]);
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
