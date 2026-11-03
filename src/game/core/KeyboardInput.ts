import {
  DEFAULT_GAME_KEY_BINDINGS,
  LEGACY_ARROW_BINDINGS,
  type GameKeyBindings,
} from './GameSettings';

export interface MovementVector {
  readonly x: number;
  readonly y: number;
}

export class KeyboardInput {
  private readonly pressedKeys = new Set<string>();
  private keyBindings = DEFAULT_GAME_KEY_BINDINGS;
  private bombRequested = false;
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
    const hasActionKey = (action: keyof GameKeyBindings): boolean => {
      const binding = this.keyBindings[action];
      const legacyArrow = LEGACY_ARROW_BINDINGS[action];
      const legacyArrowInUse = legacyArrow !== undefined &&
        Object.values(this.keyBindings).includes(legacyArrow);
      return this.pressedKeys.has(binding) ||
        (legacyArrow !== undefined &&
          !legacyArrowInUse &&
          this.pressedKeys.has(legacyArrow));
    };
    const horizontal =
      Number(hasActionKey('moveRight')) -
      Number(hasActionKey('moveLeft'));
    const vertical =
      Number(hasActionKey('moveDown')) -
      Number(hasActionKey('moveUp'));
    const magnitude = Math.hypot(horizontal, vertical);

    if (magnitude === 0) return { x: 0, y: 0 };
    return { x: horizontal / magnitude, y: vertical / magnitude };
  }

  setKeyBindings(keyBindings: GameKeyBindings): void {
    this.keyBindings = keyBindings;
    this.clear();
  }

  consumeBombRequest(): boolean {
    const requested = this.bombRequested;
    this.bombRequested = false;
    return requested;
  }

  clear = (): void => {
    this.pressedKeys.clear();
    this.bombRequested = false;
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
    const supportedKeys = new Set([
      ...Object.values(this.keyBindings),
      ...Object.values(LEGACY_ARROW_BINDINGS),
    ]);
    if (
      !this.isEnabled ||
      keyEvent.isComposing ||
      !supportedKeys.has(keyEvent.code)
    ) {
      return;
    }

    keyEvent.preventDefault();
    if (
      keyEvent.code === this.keyBindings.useBomb &&
      !keyEvent.repeat &&
      !this.pressedKeys.has(keyEvent.code)
    ) {
      this.bombRequested = true;
    }
    this.pressedKeys.add(keyEvent.code);
  };

  private readonly handleKeyUp = (event: Event): void => {
    this.pressedKeys.delete((event as KeyboardEvent).code);
  };
}
