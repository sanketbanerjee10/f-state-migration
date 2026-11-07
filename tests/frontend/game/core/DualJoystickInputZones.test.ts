// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_CONTROL_SETTINGS,
  type ControlSettings,
} from '@/game/core/ControlSettings';
import { DualJoystickInput } from '@/game/core/DualJoystickInput';
import { computeZones, type ControlZones } from '@/game/core/TouchControlGeometry';

function pointerEvent(
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  pointerId: number,
  clientX: number,
  clientY: number,
  pointerType = 'touch',
): PointerEvent {
  const event = new Event(type, {
    bubbles: true,
    cancelable: true,
  }) as PointerEvent;
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { configurable: true, value: pointerType },
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  return event;
}

function addPointerCapture(element: HTMLElement) {
  const capturedPointers = new Set<number>();
  element.setPointerCapture = vi.fn((pointerId: number) => {
    capturedPointers.add(pointerId);
  });
  element.hasPointerCapture = vi.fn((pointerId: number) =>
    capturedPointers.has(pointerId),
  );
  element.releasePointerCapture = vi.fn((pointerId: number) => {
    capturedPointers.delete(pointerId);
  });
  return capturedPointers;
}

function createHarness(settings: ControlSettings) {
  const surface = document.createElement('div');
  const gameplaySurface = document.createElement('canvas');
  const movement = document.createElement('button');
  const aim = document.createElement('button');
  const hud = document.createElement('div');
  let zones: ControlZones = computeZones(
    { left: 0, top: 0, width: 400, height: 800 },
    undefined,
    settings.layout,
    { size: settings.joystickSize },
  );
  surface.append(gameplaySurface, movement, aim, hud);
  const captures = addPointerCapture(surface);

  const input = new DualJoystickInput();
  const onMovement = vi.fn();
  const onAim = vi.fn();
  const positionStick = vi.fn();
  input.attachToZones(movement, aim, onMovement, onAim, {
    surface,
    gameplaySurface,
    getZones: () => zones,
    settings,
    positionStick,
  });
  input.setEnabled(true);
  return {
    input,
    surface,
    gameplaySurface,
    movement,
    aim,
    hud,
    zones,
    onMovement,
    onAim,
    positionStick,
    captures,
    setZones(next: ControlZones) {
      zones = next;
      input.refreshZones();
    },
  };
}

describe('DualJoystickInput zone ownership', () => {
  it('only accepts touch pointers on the gameplay surface or a stick', () => {
    const harness = createHarness(DEFAULT_CONTROL_SETTINGS);
    const movementPoint = {
      x: harness.zones.movement.left + harness.zones.movement.width / 2,
      y: 400,
    };

    harness.gameplaySurface.dispatchEvent(
      pointerEvent('pointerdown', 1, movementPoint.x, movementPoint.y, 'mouse'),
    );
    harness.hud.dispatchEvent(
      pointerEvent('pointerdown', 2, movementPoint.x, movementPoint.y),
    );
    expect(harness.onMovement).not.toHaveBeenCalled();
    expect(harness.positionStick).not.toHaveBeenCalled();
    harness.input.detach();
  });

  it('captures independent movement and aim pointers and ignores a third finger', () => {
    const harness = createHarness(DEFAULT_CONTROL_SETTINGS);
    const movementPoint = {
      x: harness.zones.movement.left + harness.zones.movement.width / 2,
      y: 400,
    };
    const aimPoint = {
      x: harness.zones.aim.left + harness.zones.aim.width / 2,
      y: 400,
    };

    harness.gameplaySurface.dispatchEvent(
      pointerEvent('pointerdown', 1, movementPoint.x, movementPoint.y),
    );
    harness.gameplaySurface.dispatchEvent(
      pointerEvent('pointerdown', 2, aimPoint.x, aimPoint.y),
    );
    harness.gameplaySurface.dispatchEvent(
      pointerEvent('pointerdown', 3, movementPoint.x, movementPoint.y),
    );

    expect(harness.captures).toEqual(new Set([1, 2]));
    expect(harness.onMovement).toHaveBeenCalledTimes(1);
    expect(harness.onAim).toHaveBeenCalledTimes(1);
    harness.input.detach();
  });

  it('starts both sticks floating in their zones, clamps their bases, and never reassigns fingers', () => {
    const harness = createHarness(DEFAULT_CONTROL_SETTINGS);
    const down = pointerEvent('pointerdown', 7, 5, 120);
    harness.gameplaySurface.dispatchEvent(down);

    expect(down.defaultPrevented).toBe(true);
    expect(harness.positionStick).toHaveBeenCalledWith(
      'movement',
      {
        x: harness.zones.movement.left + harness.zones.joystickDiameter / 2,
        y: 120,
      },
      harness.zones,
    );
    expect(harness.onMovement.mock.lastCall?.[0].x).toBeCloseTo(-49 / 54);
    expect(harness.onMovement.mock.lastCall?.[0].y).toBe(0);

    harness.gameplaySurface.dispatchEvent(
      pointerEvent('pointermove', 7, 260, 120),
    );
    expect(harness.onMovement).toHaveBeenLastCalledWith({ x: 1, y: 0 });
    expect(harness.onAim).not.toHaveBeenCalled();

    harness.gameplaySurface.dispatchEvent(
      pointerEvent('pointerdown', 8, 395, 180),
    );
    expect(harness.onAim.mock.lastCall?.[0].x).toBeCloseTo(49 / 54);
    expect(harness.onAim.mock.lastCall?.[0].y).toBe(0);
    expect(harness.positionStick).toHaveBeenCalledWith(
      'aim',
      {
        x:
          harness.zones.aim.left +
          harness.zones.aim.width -
          harness.zones.joystickDiameter / 2,
        y: 180,
      },
      harness.zones,
    );
    harness.gameplaySurface.dispatchEvent(
      pointerEvent('pointermove', 8, 140, 180),
    );
    expect(harness.onAim).toHaveBeenLastCalledWith({ x: -1, y: 0 });
    expect(harness.onMovement).toHaveBeenLastCalledWith({ x: 1, y: 0 });

    harness.gameplaySurface.dispatchEvent(
      pointerEvent('pointerup', 7, 260, 120),
    );
    expect(harness.positionStick).toHaveBeenCalledWith(
      'movement',
      null,
      harness.zones,
    );
    expect(harness.onMovement).toHaveBeenLastCalledWith({ x: 0, y: 0 });
    expect(harness.onAim).toHaveBeenLastCalledWith({ x: -1, y: 0 });
    harness.input.detach();
  });

  it('releasing one pointer leaves the other active and layout changes cancel both', () => {
    const harness = createHarness(DEFAULT_CONTROL_SETTINGS);
    const movementX =
      harness.zones.movement.left + harness.zones.movement.width / 2;
    const aimX = harness.zones.aim.left + harness.zones.aim.width / 2;
    harness.gameplaySurface.dispatchEvent(
      pointerEvent('pointerdown', 11, movementX, 400),
    );
    harness.gameplaySurface.dispatchEvent(
      pointerEvent('pointerdown', 12, aimX, 400),
    );
    harness.surface.dispatchEvent(pointerEvent('pointerup', 11, 0, 0));
    expect(harness.onMovement).toHaveBeenLastCalledWith({ x: 0, y: 0 });
    expect(harness.positionStick).toHaveBeenLastCalledWith(
      'movement',
      null,
      harness.zones,
    );
    expect(harness.onAim).toHaveBeenCalledTimes(1);

    harness.input.setControlSettings({
      ...DEFAULT_CONTROL_SETTINGS,
      layout: 'left',
    });
    expect(harness.onAim).toHaveBeenLastCalledWith({ x: 0, y: 0 });
    harness.input.detach();
  });

  it('clears pointers on cancellation, blur, orientation, and hidden visibility', () => {
    const harness = createHarness(DEFAULT_CONTROL_SETTINGS);
    const movementX =
      harness.zones.movement.left + harness.zones.movement.width / 2;

    harness.gameplaySurface.dispatchEvent(
      pointerEvent('pointerdown', 21, movementX, 200),
    );
    harness.surface.dispatchEvent(pointerEvent('pointercancel', 21, 60, 200));
    expect(harness.onMovement).toHaveBeenLastCalledWith({ x: 0, y: 0 });

    harness.gameplaySurface.dispatchEvent(
      pointerEvent('pointerdown', 22, movementX, 200),
    );
    window.dispatchEvent(new Event('blur'));
    expect(harness.positionStick).toHaveBeenCalledWith(
      'movement',
      null,
      harness.zones,
    );

    harness.gameplaySurface.dispatchEvent(
      pointerEvent('pointerdown', 23, movementX, 200),
    );
    window.dispatchEvent(new Event('orientationchange'));
    expect(harness.onMovement).toHaveBeenLastCalledWith({ x: 0, y: 0 });

    harness.gameplaySurface.dispatchEvent(
      pointerEvent('pointerdown', 24, movementX, 200),
    );
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(harness.onMovement).toHaveBeenLastCalledWith({ x: 0, y: 0 });
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    });
    harness.input.detach();
  });
});
