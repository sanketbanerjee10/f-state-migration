import { GAME_INPUT_CONFIG } from './GameConfig';
import type { ControlSettings } from './ControlSettings';
import {
  clampFloatingBase,
  updateJoystickVector,
  type ControlPoint,
  type ControlZones,
  type JoystickVector,
} from './TouchControlGeometry';

export type { JoystickVector } from './TouchControlGeometry';

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
  centerX: number;
  centerY: number;
  radius: number;
  pointerX: number;
  pointerY: number;
  readonly vector: { x: number; y: number };
}

export interface ZoneInputOptions {
  readonly surface: HTMLElement;
  readonly gameplaySurface: HTMLElement;
  readonly getZones: () => ControlZones | null;
  readonly settings: ControlSettings;
  readonly positionStick: (
    stick: JoystickName,
    point: ControlPoint | null,
    zones: ControlZones,
  ) => void;
}

interface SurfaceHandlers {
  readonly pointerdown: (event: Event) => void;
  readonly pointermove: (event: Event) => void;
  readonly pointerup: (event: Event) => void;
  readonly pointercancel: (event: Event) => void;
  readonly lostpointercapture: (event: Event) => void;
}

function isWithin(target: EventTarget | null, element: HTMLElement): boolean {
  if (target === element) return true;
  return typeof Node !== 'undefined' &&
    target instanceof Node &&
    element.contains(target);
}

function isPointInRect(x: number, y: number, rect: ControlZones['movement']): boolean {
  return (
    x >= rect.left &&
    x < rect.left + rect.width &&
    y >= rect.top &&
    y < rect.top + rect.height
  );
}

export class DualJoystickInput {
  private readonly movement: JoystickState = this.createState();
  private readonly aim: JoystickState = this.createState();
  private windowTarget: Window | null = null;
  private documentTarget: Document | null = null;
  private surfaceHandlers: SurfaceHandlers | null = null;
  private zoneOptions: ZoneInputOptions | null = null;
  private animationFrameId: number | null = null;
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

  attachToZones(
    movementElement: HTMLElement,
    aimElement: HTMLElement,
    onMovement: (vector: JoystickVector) => void,
    onAim: (vector: JoystickVector) => void,
    options: ZoneInputOptions,
    windowTarget: Window = window,
    documentTarget: Document = document,
  ): void {
    if (this.movement.element || this.aim.element) return;

    this.movement.element = movementElement;
    this.movement.onChange = onMovement;
    this.aim.element = aimElement;
    this.aim.onChange = onAim;
    this.zoneOptions = options;
    this.windowTarget = windowTarget;
    this.documentTarget = documentTarget;
    this.surfaceHandlers = {
      pointerdown: (event) => this.handleSurfacePointerDown(event as PointerEvent),
      pointermove: (event) => this.handleSurfacePointerMove(event as PointerEvent),
      pointerup: (event) => this.handleSurfacePointerEnd(event as PointerEvent),
      pointercancel: (event) => this.handleSurfacePointerEnd(event as PointerEvent),
      lostpointercapture: (event) =>
        this.handleSurfacePointerEnd(event as PointerEvent),
    };
    for (const [type, handler] of Object.entries(this.surfaceHandlers)) {
      options.surface.addEventListener(
        type,
        handler as EventListener,
        { capture: true },
      );
    }
    windowTarget.addEventListener('blur', this.handleWindowBlur);
    windowTarget.addEventListener('pagehide', this.handleWindowInterruption);
    windowTarget.addEventListener(
      'orientationchange',
      this.handleWindowInterruption,
    );
    documentTarget.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
  }

  setControlSettings(settings: ControlSettings): void {
    const options = this.zoneOptions;
    if (!options) return;
    const previous = options.settings;
    this.zoneOptions = { ...options, settings };
    if (previous.layout !== settings.layout) {
      this.resetJoystick(this.movement, true);
      this.resetJoystick(this.aim, true);
      return;
    }

    if (previous.joystickSize !== settings.joystickSize) {
      this.refreshZones();
    }
  }

  refreshZones(): void {
    const zones = this.zoneOptions?.getZones();
    if (!zones) return;
    this.resizeActiveStick('movement', zones);
    this.resizeActiveStick('aim', zones);
    this.scheduleVisualUpdate();
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
    const options = this.zoneOptions;
    if (options && this.surfaceHandlers) {
      for (const [type, handler] of Object.entries(this.surfaceHandlers)) {
        options.surface.removeEventListener(
          type,
          handler as EventListener,
          { capture: true },
        );
      }
    }
    this.surfaceHandlers = null;
    this.zoneOptions = null;
    this.windowTarget?.removeEventListener('blur', this.handleWindowBlur);
    this.windowTarget?.removeEventListener(
      'pagehide',
      this.handleWindowInterruption,
    );
    this.windowTarget?.removeEventListener(
      'orientationchange',
      this.handleWindowInterruption,
    );
    this.documentTarget?.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    if (this.animationFrameId !== null) {
      this.windowTarget?.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.windowTarget = null;
    this.documentTarget = null;
  }

  private createState(): JoystickState {
    return {
      element: null,
      pointerId: null,
      onChange: null,
      handlers: null,
      centerX: 0,
      centerY: 0,
      radius: 0,
      pointerX: 0,
      pointerY: 0,
      vector: { x: 0, y: 0 },
    };
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
    const bounds = state.element?.getBoundingClientRect();
    if (bounds) {
      state.centerX = bounds.left + bounds.width / 2;
      state.centerY = bounds.top + bounds.height / 2;
      state.radius = Math.min(bounds.width, bounds.height) / 2;
    }
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

  private handleSurfacePointerDown(event: PointerEvent): void {
    const options = this.zoneOptions;
    const zones = options?.getZones();
    if (!this.isEnabled || !options || !zones || event.pointerType !== 'touch') {
      return;
    }
    const movementOwnsPoint = isPointInRect(
      event.clientX,
      event.clientY,
      zones.movement,
    );
    const aimOwnsPoint = isPointInRect(
      event.clientX,
      event.clientY,
      zones.aim,
    );
    const stick = movementOwnsPoint
      ? 'movement'
      : aimOwnsPoint
        ? 'aim'
        : null;
    if (!stick) return;
    const state = this.getState(stick);
    if (state.pointerId !== null) return;
    if (
      event.target !== options.gameplaySurface &&
      !isWithin(event.target, state.element!)
    ) {
      return;
    }
    this.startSurfacePointer(stick, event, zones);
  }

  private startSurfacePointer(
    name: JoystickName,
    event: PointerEvent,
    zones: ControlZones,
  ): void {
    const options = this.zoneOptions;
    const state = this.getState(name);
    if (!options || state.pointerId !== null) return;

    event.preventDefault();
    event.stopPropagation();
    state.pointerId = event.pointerId;
    state.radius = zones.joystickDiameter / 2;
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    const base = clampFloatingBase(
      { x: event.clientX, y: event.clientY },
      name === 'movement' ? zones.movement : zones.aim,
      zones.joystickDiameter,
    );
    state.centerX = base.x;
    state.centerY = base.y;
    options.positionStick(
      name,
      base,
      zones,
    );
    options.surface.setPointerCapture(event.pointerId);
    this.updateJoystick(name, event);
  }

  private handleSurfacePointerMove(event: PointerEvent): void {
    if (!this.isEnabled) return;
    const state =
      this.movement.pointerId === event.pointerId
        ? this.movement
        : this.aim.pointerId === event.pointerId
          ? this.aim
          : null;
    if (!state) return;
    event.preventDefault();
    event.stopPropagation();
    this.updateJoystick(state === this.movement ? 'movement' : 'aim', event);
  }

  private handleSurfacePointerEnd(event: PointerEvent): void {
    const state =
      this.movement.pointerId === event.pointerId
        ? this.movement
        : this.aim.pointerId === event.pointerId
          ? this.aim
          : null;
    if (!state) return;
    event.preventDefault();
    event.stopPropagation();
    this.resetJoystick(state, true);
  }

  private updateJoystick(name: JoystickName, event: PointerEvent): void {
    const state = this.getState(name);
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    this.updateVector(name);
  }

  private updateVector(name: JoystickName): void {
    const state = this.getState(name);
    updateJoystickVector(
      state.pointerX - state.centerX,
      state.pointerY - state.centerY,
      state.radius,
      GAME_INPUT_CONFIG.joystickDeadZone,
      state.vector,
    );
    state.onChange?.(state.vector);
    if (this.zoneOptions) this.scheduleVisualUpdate();
    else this.writeJoystickVisual(state);
  }

  private scheduleVisualUpdate(): void {
    if (this.animationFrameId !== null) return;
    const windowTarget = this.windowTarget;
    if (!windowTarget || typeof windowTarget.requestAnimationFrame !== 'function') {
      this.writeJoystickVisual(this.movement);
      this.writeJoystickVisual(this.aim);
      return;
    }
    this.animationFrameId = windowTarget.requestAnimationFrame(() => {
      this.animationFrameId = null;
      this.writeJoystickVisual(this.movement);
      this.writeJoystickVisual(this.aim);
    });
  }

  private writeJoystickVisual(state: JoystickState): void {
    state.element?.style.setProperty(
      '--joystick-x',
      `${state.vector.x * state.radius * 0.62}px`,
    );
    state.element?.style.setProperty(
      '--joystick-y',
      `${state.vector.y * state.radius * 0.62}px`,
    );
  }

  private resizeActiveStick(
    name: JoystickName,
    zones: ControlZones,
  ): void {
    const state = this.getState(name);
    if (state.pointerId === null || !this.zoneOptions) return;
    state.radius = zones.joystickDiameter / 2;
    const base = clampFloatingBase(
      { x: state.centerX, y: state.centerY },
      name === 'movement' ? zones.movement : zones.aim,
      zones.joystickDiameter,
    );
    state.centerX = base.x;
    state.centerY = base.y;
    this.zoneOptions.positionStick(
      name,
      base,
      zones,
    );
    this.updateVector(name);
  }

  private resetJoystick(state: JoystickState, releaseCapture: boolean): void {
    const element = state.element;
    const pointerId = state.pointerId;
    state.pointerId = null;
    state.vector.x = 0;
    state.vector.y = 0;
    state.pointerX = 0;
    state.pointerY = 0;
    element?.style.setProperty('--joystick-x', '0px');
    element?.style.setProperty('--joystick-y', '0px');
    state.onChange?.(state.vector);

    if (this.zoneOptions) {
      const zones = this.zoneOptions.getZones();
      if (zones) {
        this.zoneOptions.positionStick(
          state === this.movement ? 'movement' : 'aim',
          null,
          zones,
        );
      }
    }
    const captureElement = this.zoneOptions?.surface ?? element;
    if (
      releaseCapture &&
      pointerId !== null &&
      captureElement?.hasPointerCapture(pointerId)
    ) {
      captureElement.releasePointerCapture(pointerId);
    }
  }

  private readonly handleWindowBlur = (): void => {
    this.resetJoystick(this.movement, true);
    this.resetJoystick(this.aim, true);
  };

  private readonly handleWindowInterruption = (): void => {
    this.handleWindowBlur();
  };

  private readonly handleVisibilityChange = (): void => {
    if (this.documentTarget?.hidden) this.handleWindowBlur();
  };

  private getState(name: JoystickName): JoystickState {
    return name === 'movement' ? this.movement : this.aim;
  }
}
