export interface MovementVector {
  readonly x: number;
  readonly y: number;
}

const MOVEMENT_KEYS = new Set([
  'KeyW',
  'ArrowUp',
  'KeyS',
  'ArrowDown',
  'KeyA',
  'ArrowLeft',
  'KeyD',
  'ArrowRight',
]);

export class KeyboardInput {
  private readonly pressedKeys = new Set<string>();
  private elements: HTMLElement[] = [];
  private windowTarget: Window | null = null;
  private isEnabled = true;

  attach(
    element: HTMLElement,
    windowTarget: Window = window,
    additionalElements: readonly HTMLElement[] = [],
  ): void {
    if (this.elements.length > 0) return;

    this.elements = [element, ...additionalElements];
    this.windowTarget = windowTarget;
    for (const target of this.elements) {
      target.addEventListener('keydown', this.handleKeyDown);
      target.addEventListener('keyup', this.handleKeyUp);
      target.addEventListener('blur', this.clear);
    }
    windowTarget.addEventListener('blur', this.clear);
  }

  getMovement(): MovementVector {
    const horizontal =
      Number(this.pressedKeys.has('KeyD') || this.pressedKeys.has('ArrowRight')) -
      Number(this.pressedKeys.has('KeyA') || this.pressedKeys.has('ArrowLeft'));
    const vertical =
      Number(this.pressedKeys.has('KeyS') || this.pressedKeys.has('ArrowDown')) -
      Number(this.pressedKeys.has('KeyW') || this.pressedKeys.has('ArrowUp'));
    const magnitude = Math.hypot(horizontal, vertical);

    if (magnitude === 0) return { x: 0, y: 0 };
    return { x: horizontal / magnitude, y: vertical / magnitude };
  }

  clear = (): void => {
    this.pressedKeys.clear();
  };

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) this.clear();
  }

  detach(): void {
    for (const target of this.elements) {
      target.removeEventListener('keydown', this.handleKeyDown);
      target.removeEventListener('keyup', this.handleKeyUp);
      target.removeEventListener('blur', this.clear);
    }
    this.windowTarget?.removeEventListener('blur', this.clear);
    this.elements = [];
    this.windowTarget = null;
    this.clear();
  }

  private readonly handleKeyDown = (event: Event): void => {
    const keyEvent = event as KeyboardEvent;
    if (
      !this.isEnabled ||
      keyEvent.isComposing ||
      !MOVEMENT_KEYS.has(keyEvent.code)
    ) {
      return;
    }

    keyEvent.preventDefault();
    this.pressedKeys.add(keyEvent.code);
  };

  private readonly handleKeyUp = (event: Event): void => {
    this.pressedKeys.delete((event as KeyboardEvent).code);
  };
}
