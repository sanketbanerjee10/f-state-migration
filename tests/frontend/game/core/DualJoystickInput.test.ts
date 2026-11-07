import { describe, expect, it, vi } from 'vitest';
import { DualJoystickInput } from '@/game/core/DualJoystickInput';

function createJoystick(left = 0, top = 0, size = 100) {
  const target = new EventTarget();
  const style = { setProperty: vi.fn() };
  const capturedPointers = new Set<number>();
  const element = Object.assign(target, {
    style,
    getBoundingClientRect: vi.fn(
      () =>
        ({
          left,
          top,
          width: size,
          height: size,
        }) as DOMRect,
    ),
    setPointerCapture: vi.fn((pointerId: number) =>
      capturedPointers.add(pointerId),
    ),
    hasPointerCapture: vi.fn((pointerId: number) =>
      capturedPointers.has(pointerId),
    ),
    releasePointerCapture: vi.fn((pointerId: number) =>
      capturedPointers.delete(pointerId),
    ),
  }) as unknown as HTMLElement;
  return { element, capturedPointers, style };
}

function pointerEvent(
  type:
    | 'pointerdown'
    | 'pointermove'
    | 'pointerup'
    | 'pointercancel'
    | 'lostpointercapture',
  pointerId: number,
  clientX: number,
  clientY: number,
): PointerEvent {
  const event = new Event(type, { cancelable: true }) as PointerEvent;
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    clientX: { value: clientX },
    clientY: { value: clientY },
  });
  return event;
}

describe('DualJoystickInput', () => {
  it('tracks simultaneous movement and aim pointers independently', () => {
    const input = new DualJoystickInput();
    const movement = createJoystick(0);
    const aim = createJoystick(200);
    const onMovement = vi.fn();
    const onAim = vi.fn();
    input.attach(
      movement.element,
      aim.element,
      onMovement,
      onAim,
      new EventTarget() as Window,
    );

    const moveDown = pointerEvent('pointerdown', 1, 100, 50);
    movement.element.dispatchEvent(moveDown);
    const aimDown = pointerEvent('pointerdown', 2, 250, 100);
    aim.element.dispatchEvent(aimDown);

    expect(moveDown.defaultPrevented).toBe(true);
    expect(aimDown.defaultPrevented).toBe(true);
    expect(onMovement).toHaveBeenLastCalledWith({ x: 1, y: 0 });
    expect(onAim).toHaveBeenLastCalledWith({ x: 0, y: 1 });
    expect(movement.capturedPointers.has(1)).toBe(true);
    expect(aim.capturedPointers.has(2)).toBe(true);

    input.detach();
  });

  it('clamps diagonal movement and ignores a second pointer on the same stick', () => {
    const input = new DualJoystickInput();
    const movement = createJoystick();
    const aim = createJoystick(200);
    const onMovement = vi.fn();
    input.attach(
      movement.element,
      aim.element,
      onMovement,
      vi.fn(),
      new EventTarget() as Window,
    );

    movement.element.dispatchEvent(pointerEvent('pointerdown', 1, 100, 100));
    expect(onMovement.mock.calls[0][0].x).toBeCloseTo(Math.SQRT1_2);
    expect(onMovement.mock.calls[0][0].y).toBeCloseTo(Math.SQRT1_2);
    movement.element.dispatchEvent(pointerEvent('pointerdown', 3, 100, 0));
    movement.element.dispatchEvent(pointerEvent('pointermove', 1, 50, 0));

    expect(onMovement).toHaveBeenLastCalledWith({ x: 0, y: -1 });
    expect(movement.element.setPointerCapture).toHaveBeenCalledTimes(1);
    expect(movement.capturedPointers.has(3)).toBe(false);
    input.detach();
  });

  it('clears input on pointer release, cancellation, and window blur', () => {
    const input = new DualJoystickInput();
    const movement = createJoystick();
    const aim = createJoystick(200);
    const onMovement = vi.fn();
    const onAim = vi.fn();
    const windowTarget = new EventTarget();
    input.attach(
      movement.element,
      aim.element,
      onMovement,
      onAim,
      windowTarget as Window,
    );

    movement.element.dispatchEvent(pointerEvent('pointerdown', 1, 100, 50));
    movement.element.dispatchEvent(pointerEvent('pointerup', 1, 100, 50));
    expect(onMovement).toHaveBeenLastCalledWith({ x: 0, y: 0 });

    aim.element.dispatchEvent(pointerEvent('pointerdown', 2, 250, 50));
    aim.element.dispatchEvent(pointerEvent('pointercancel', 2, 250, 50));
    expect(onAim).toHaveBeenLastCalledWith({ x: 0, y: 0 });

    aim.element.dispatchEvent(pointerEvent('pointerdown', 5, 250, 50));
    aim.element.dispatchEvent(
      pointerEvent('lostpointercapture', 5, 250, 50),
    );
    expect(onAim).toHaveBeenLastCalledWith({ x: 0, y: 0 });

    movement.element.dispatchEvent(pointerEvent('pointerdown', 3, 100, 50));
    aim.element.dispatchEvent(pointerEvent('pointerdown', 4, 250, 50));
    windowTarget.dispatchEvent(new Event('blur'));
    expect(onMovement).toHaveBeenLastCalledWith({ x: 0, y: 0 });
    expect(onAim).toHaveBeenLastCalledWith({ x: 0, y: 0 });
    expect(movement.capturedPointers.size).toBe(0);
    expect(aim.capturedPointers.size).toBe(0);
    input.detach();
  });

  it('releases active pointers when disabled and removes listeners on detach', () => {
    const input = new DualJoystickInput();
    const movement = createJoystick();
    const aim = createJoystick(200);
    const onMovement = vi.fn();
    const windowTarget = new EventTarget();
    input.attach(
      movement.element,
      aim.element,
      onMovement,
      vi.fn(),
      windowTarget as Window,
    );

    movement.element.dispatchEvent(pointerEvent('pointerdown', 1, 100, 50));
    input.setEnabled(false);
    expect(onMovement).toHaveBeenLastCalledWith({ x: 0, y: 0 });
    expect(movement.capturedPointers.size).toBe(0);
    movement.element.dispatchEvent(pointerEvent('pointermove', 1, 0, 50));
    expect(onMovement).toHaveBeenLastCalledWith({ x: 0, y: 0 });

    input.setEnabled(true);
    movement.element.dispatchEvent(pointerEvent('pointerdown', 2, 100, 50));
    input.detach();
    movement.element.dispatchEvent(pointerEvent('pointerdown', 3, 100, 50));
    expect(onMovement).toHaveBeenCalledTimes(4);
    windowTarget.dispatchEvent(new Event('blur'));
    expect(onMovement).toHaveBeenCalledTimes(4);
  });
});
