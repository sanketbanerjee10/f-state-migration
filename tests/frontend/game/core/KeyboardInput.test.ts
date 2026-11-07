import { describe, expect, it } from 'vitest';
import { KeyboardInput } from '@/game/core/KeyboardInput';
import { DEFAULT_GAME_KEY_BINDINGS } from '@/game/core/GameSettings';

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

  it('handles configured keys while attached to the focused surface', () => {
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

    const unbound = keyEvent('keydown', 'Enter');
    canvas.dispatchEvent(unbound);
    expect(unbound.defaultPrevented).toBe(false);

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

  it('adds and removes focused joystick keyboard listeners as controls mount', () => {
    const input = new KeyboardInput();
    const canvas = new EventTarget();
    const joystick = new EventTarget();
    input.attach(canvas as HTMLElement, new EventTarget() as Window);

    input.setAdditionalElements([joystick as HTMLElement]);
    joystick.dispatchEvent(keyEvent('keydown', 'ArrowUp'));
    expect(input.getMovement()).toEqual({ x: 0, y: -1 });

    input.setAdditionalElements([]);
    joystick.dispatchEvent(keyEvent('keyup', 'ArrowUp'));
    joystick.dispatchEvent(keyEvent('keydown', 'ArrowRight'));
    expect(input.getMovement()).toEqual({ x: 0, y: 0 });

    input.detach();
  });

  it('emits one request per press for the bomb key without treating E as a turret action', () => {
    const input = new KeyboardInput();
    const canvas = new EventTarget();
    input.attach(canvas as HTMLElement, new EventTarget() as Window);
    input.setKeyBindings({
      ...DEFAULT_GAME_KEY_BINDINGS,
      moveUp: 'KeyI',
      useBomb: 'KeyF',
    });

    canvas.dispatchEvent(keyEvent('keydown', 'KeyI'));
    expect(input.getMovement()).toEqual({ x: 0, y: -1 });
    canvas.dispatchEvent(keyEvent('keyup', 'KeyI'));

    const obsoleteTurretKey = keyEvent('keydown', 'KeyE');
    canvas.dispatchEvent(obsoleteTurretKey);
    expect(obsoleteTurretKey.defaultPrevented).toBe(false);
    expect(input.consumeBombRequest()).toBe(false);
    canvas.dispatchEvent(keyEvent('keydown', 'KeyF'));
    expect(input.consumeBombRequest()).toBe(true);
    canvas.dispatchEvent(keyEvent('keydown', 'KeyF'));
    expect(input.consumeBombRequest()).toBe(false);
    canvas.dispatchEvent(keyEvent('keyup', 'KeyF'));
    canvas.dispatchEvent(keyEvent('keydown', 'KeyF'));
    expect(input.consumeBombRequest()).toBe(true);

    input.detach();
  });

  it('supports arbitrary key codes and duplicate bindings', () => {
    const input = new KeyboardInput();
    const canvas = new EventTarget();
    input.attach(canvas as HTMLElement, new EventTarget() as Window);
    input.setKeyBindings({
      ...DEFAULT_GAME_KEY_BINDINGS,
      moveUp: 'NumpadAdd',
      useBomb: 'NumpadAdd',
    });

    const customKey = keyEvent('keydown', 'NumpadAdd');
    canvas.dispatchEvent(customKey);
    expect(customKey.defaultPrevented).toBe(true);
    expect(input.getMovement()).toEqual({ x: 0, y: -1 });
    expect(input.consumeBombRequest()).toBe(true);

    input.detach();
  });

  it('uses Space as the default bomb key', () => {
    const input = new KeyboardInput();
    const canvas = new EventTarget();
    input.attach(canvas as HTMLElement, new EventTarget() as Window);

    canvas.dispatchEvent(keyEvent('keydown', 'Space'));
    expect(input.consumeBombRequest()).toBe(true);

    input.detach();
  });
});
