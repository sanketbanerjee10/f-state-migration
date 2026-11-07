import { describe, expect, it } from 'vitest';
import {
  clampFloatingBase,
  computeZones,
  updateJoystickVector,
  type JoystickVector,
} from '@/game/core/TouchControlGeometry';

describe('touch control geometry', () => {
  it('splits the usable viewport and mirrors movement and aim zones', () => {
    const viewport = { left: 0, top: 0, width: 360, height: 780 };
    const right = computeZones(viewport);
    const small = computeZones(viewport, undefined, 'right', { size: 'small' });
    const large = computeZones(viewport, undefined, 'right', { size: 'large' });
    const left = computeZones(viewport, undefined, 'left');

    expect(right.movement).toEqual({
      left: 0,
      top: 0,
      width: 180,
      height: 780,
    });
    expect(right.aim.left).toBe(180);
    expect(left.movement.left).toBe(180);
    expect(left.aim.left).toBe(0);
    expect(right.joystickDiameter).toBe(108);
    expect(small.joystickDiameter).toBeCloseTo(86.4);
    expect(large.joystickDiameter).toBeCloseTo(135);
    expect(right.joystickDiameter).toBeLessThanOrEqual(
      right.movement.width * 0.8,
    );
  });

  it('respects safe-area insets, orientation, and the zone-size cap', () => {
    const zones = computeZones(
      { left: 0, top: 0, width: 844, height: 390 },
      { top: 20, right: 32, bottom: 12, left: 16 },
    );

    expect(zones.movement.left).toBe(16);
    expect(zones.movement.top).toBe(20);
    expect(zones.movement.width).toBe(398);
    expect(zones.aim.width).toBe(398);
    expect(zones.joystickDiameter).toBeLessThanOrEqual(
      zones.movement.width * 0.8,
    );
  });

  it('clamps a floating base within either touch zone', () => {
    const movement = { left: 0, top: 0, width: 180, height: 700 };
    const aim = { left: 180, top: 0, width: 180, height: 700 };
    expect(clampFloatingBase({ x: 2, y: 698 }, movement, 120)).toEqual({
      x: 60,
      y: 640,
    });
    expect(clampFloatingBase({ x: 358, y: 2 }, aim, 120)).toEqual({
      x: 300,
      y: 60,
    });
  });

  it('reuses the output vector and preserves the existing hard dead zone', () => {
    const vector: JoystickVector = { x: 0, y: 0 };
    updateJoystickVector(5, 0, 100, 0.12, vector);
    expect(vector).toEqual({ x: 0, y: 0 });

    updateJoystickVector(50, 0, 100, 0.12, vector);
    expect(vector).toEqual({ x: 0.5, y: 0 });

    updateJoystickVector(200, 200, 100, 0.12, vector);
    expect(Math.hypot(vector.x, vector.y)).toBeCloseTo(1);
  });
});
