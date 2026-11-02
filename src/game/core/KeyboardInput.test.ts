import { describe, expect, it } from 'vitest';
import { KeyboardInput } from './KeyboardInput';

function keyEvent(
  type: 'keydown' | 'keyup',
  code: string,
  isComposing = false,
): KeyboardEvent {
  const event = new Event(type, { cancelable: true }) as KeyboardEvent;
  Object.defineProperties(event, {
    code: { value: code },
    isComposing: { value: isComposing },
  });
  return event;
}

describe('KeyboardInput', () => {
  it('normalizes diagonal movement and cancels opposing directions', () => {
    const input = new KeyboardInput();
    const canvas = new EventTarget();
    input.attach(canvas as HTMLElement, new EventTarget() as Window);

    canvas.dispatchEvent(keyEvent('keydown', 'KeyW'));
    canvas.dispatchEvent(keyEvent('keydown', 'ArrowRight'));
    expect(input.getMovement().x).toBeCloseTo(Math.SQRT1_2);
    expect(input.getMovement().y).toBeCloseTo(-Math.SQRT1_2);

    canvas.dispatchEvent(keyEvent('keydown', 'ArrowUp'));
    canvas.dispatchEvent(keyEvent('keydown', 'KeyS'));
    expect(input.getMovement()).toEqual({ x: 1, y: 0 });

    input.detach();
  });

  it('handles only supported non-composing keys while attached to the focused surface', () => {
    const input = new KeyboardInput();
    const canvas = new EventTarget();
    const unrelated = new EventTarget();
    input.attach(canvas as HTMLElement, new EventTarget() as Window);

    const movement = keyEvent('keydown', 'ArrowLeft');
    canvas.dispatchEvent(movement);
    expect(movement.defaultPrevented).toBe(true);

    const composing = keyEvent('keydown', 'KeyD', true);
    canvas.dispatchEvent(composing);
    expect(composing.defaultPrevented).toBe(false);

    const unrelatedKey = keyEvent('keydown', 'KeyW');
    unrelated.dispatchEvent(unrelatedKey);
    expect(input.getMovement()).toEqual({ x: -1, y: 0 });

    const unsupported = keyEvent('keydown', 'Space');
    canvas.dispatchEvent(unsupported);
    expect(unsupported.defaultPrevented).toBe(false);

    input.detach();
    canvas.dispatchEvent(keyEvent('keydown', 'KeyD'));
    expect(input.getMovement()).toEqual({ x: 0, y: 0 });
  });

  it('clears held keys on blur and tracks keyup for overlapping bindings', () => {
    const input = new KeyboardInput();
    const canvas = new EventTarget();
    const windowTarget = new EventTarget();
    input.attach(canvas as HTMLElement, windowTarget as Window);

    canvas.dispatchEvent(keyEvent('keydown', 'KeyD'));
    canvas.dispatchEvent(keyEvent('keydown', 'ArrowRight'));
    canvas.dispatchEvent(keyEvent('keyup', 'ArrowRight'));
    expect(input.getMovement()).toEqual({ x: 1, y: 0 });

    windowTarget.dispatchEvent(new Event('blur'));
    expect(input.getMovement()).toEqual({ x: 0, y: 0 });
    input.detach();
  });

  it('accepts keyboard input when an accessible joystick control has focus', () => {
    const input = new KeyboardInput();
    const canvas = new EventTarget();
    const joystick = new EventTarget();
    input.attach(
      canvas as HTMLElement,
      new EventTarget() as Window,
      [joystick as HTMLElement],
    );

    const movement = keyEvent('keydown', 'ArrowUp');
    joystick.dispatchEvent(movement);
    expect(movement.defaultPrevented).toBe(true);
    expect(input.getMovement()).toEqual({ x: 0, y: -1 });

    joystick.dispatchEvent(new Event('blur'));
    expect(input.getMovement()).toEqual({ x: 0, y: 0 });
    input.detach();
  });
});
