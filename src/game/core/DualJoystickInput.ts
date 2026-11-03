export interface JoystickVector {
  readonly x: number;
  readonly y: number;
}

type JoystickName = 'movement' | 'aim';
type JoystickTargetHandlers = {
  readonly pointerdown: (event: Event) => void;
  readonly pointermove: (event: Event) => void;
  readonly pointerup: (event: Event) => void;
  readonly pointercancel: (event: Event) => void;
  readonly lostpointercapture: (event: Event) => void;
};

interface JoystickState {
  element: HTMLElement | null;
  pointerId: number | null;
  onChange: ((vector: JoystickVector) => void) | null;
  handlers: JoystickTargetHandlers | null;
}

export class DualJoystickInput {
  private readonly movement: JoystickState = {
    element: null,
    pointerId: null,
    onChange: null,
    handlers: null,
  };
  private readonly aim: JoystickState = {
    element: null,
    pointerId: null,
    onChange: null,
    handlers: null,
  };
  private windowTarget: Window | null = null;
  private isEnabled = true;

  attach(
    movementElement: HTMLElement,
    aimElement: HTMLElement,
    onMovement: (vector: JoystickVector) => void,
    onAim: (vector: JoystickVector) => void,
    windowTarget: Window = window,
  ): void {
    if (this.movement.element || this.aim.element) return;

    this.windowTarget = windowTarget;
    this.attachJoystick('movement', movementElement, onMovement);
    this.attachJoystick('aim', aimElement, onAim);
    windowTarget.addEventListener('blur', this.handleWindowBlur);
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.resetJoystick(this.movement, true);
      this.resetJoystick(this.aim, true);
    }
  }

  detach(): void {
    this.detachJoystick(this.movement);
    this.detachJoystick(this.aim);
    this.windowTarget?.removeEventListener('blur', this.handleWindowBlur);
    this.windowTarget = null;
  }

  private attachJoystick(
    name: JoystickName,
    element: HTMLElement,
    onChange: (vector: JoystickVector) => void,
  ): void {
    const handlers: JoystickTargetHandlers = {
      pointerdown: (event) => this.handlePointerDown(name, event as PointerEvent),
      pointermove: (event) => this.handlePointerMove(name, event as PointerEvent),
      pointerup: (event) => this.handlePointerEnd(name, event as PointerEvent),
      pointercancel: (event) => this.handlePointerEnd(name, event as PointerEvent),
      lostpointercapture: (event) =>
        this.handlePointerEnd(name, event as PointerEvent),
    };
    const state = this.getState(name);

    state.element = element;
    state.onChange = onChange;
    state.handlers = handlers;
    element.addEventListener('pointerdown', handlers.pointerdown);
    element.addEventListener('pointermove', handlers.pointermove);
    element.addEventListener('pointerup', handlers.pointerup);
    element.addEventListener('pointercancel', handlers.pointercancel);
    element.addEventListener('lostpointercapture', handlers.lostpointercapture);
  }

  private detachJoystick(state: JoystickState): void {
    const { element, handlers } = state;
    if (element && handlers) {
      element.removeEventListener('pointerdown', handlers.pointerdown);
      element.removeEventListener('pointermove', handlers.pointermove);
      element.removeEventListener('pointerup', handlers.pointerup);
      element.removeEventListener('pointercancel', handlers.pointercancel);
      element.removeEventListener(
        'lostpointercapture',
        handlers.lostpointercapture,
      );
    }
    this.resetJoystick(state, true);
    state.element = null;
    state.onChange = null;
    state.handlers = null;
  }

  private handlePointerDown(name: JoystickName, event: PointerEvent): void {
    const state = this.getState(name);
    if (!this.isEnabled || state.pointerId !== null) return;

    event.preventDefault();
    state.pointerId = event.pointerId;
    state.element?.setPointerCapture(event.pointerId);
    this.updateJoystick(name, event);
  }

  private handlePointerMove(name: JoystickName, event: PointerEvent): void {
    const state = this.getState(name);
    if (!this.isEnabled || state.pointerId !== event.pointerId) return;

    event.preventDefault();
    this.updateJoystick(name, event);
  }

  private handlePointerEnd(name: JoystickName, event: PointerEvent): void {
    const state = this.getState(name);
    if (state.pointerId !== event.pointerId) return;

    event.preventDefault();
    this.resetJoystick(state, true);
  }

  private updateJoystick(name: JoystickName, event: PointerEvent): void {
    const state = this.getState(name);
    const element = state.element;
    if (!element) return;

    const bounds = element.getBoundingClientRect();
    const radius = Math.min(bounds.width, bounds.height) / 2;
    if (radius <= 0) return;

    let x = (event.clientX - (bounds.left + bounds.width / 2)) / radius;
    let y = (event.clientY - (bounds.top + bounds.height / 2)) / radius;
    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }
    if (Math.hypot(x, y) < GAME_INPUT_CONFIG.joystickDeadZone) {
      x = 0;
      y = 0;
    }

    element.style.setProperty('--joystick-x', `${x * radius * 0.62}px`);
    element.style.setProperty('--joystick-y', `${y * radius * 0.62}px`);
    state.onChange?.({ x, y });
  }

  private resetJoystick(state: JoystickState, releaseCapture: boolean): void {
    const element = state.element;
    const pointerId = state.pointerId;
    state.pointerId = null;
    element?.style.setProperty('--joystick-x', '0px');
    element?.style.setProperty('--joystick-y', '0px');
    state.onChange?.({ x: 0, y: 0 });

    if (
      releaseCapture &&
      pointerId !== null &&
      element?.hasPointerCapture(pointerId)
    ) {
      element.releasePointerCapture(pointerId);
    }
  }

  private readonly handleWindowBlur = (): void => {
    this.resetJoystick(this.movement, true);
    this.resetJoystick(this.aim, true);
  };

  private getState(name: JoystickName): JoystickState {
    return name === 'movement' ? this.movement : this.aim;
  }
}
import { GAME_INPUT_CONFIG } from './GameConfig';
