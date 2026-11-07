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
  private element: HTMLElement | null = null;
  private additionalElements: HTMLElement[] = [];
  private windowTarget: Window | null = null;
  private isEnabled = true;

  attach(
    element: HTMLElement,
    windowTarget: Window = window,
    additionalElements: readonly HTMLElement[] = [],
  ): void {
    if (this.element) return;

    this.element = element;
    this.windowTarget = windowTarget;
    this.attachKeyListeners(element);
    this.setAdditionalElements(additionalElements);
    windowTarget.addEventListener('blur', this.clear);
  }

  setAdditionalElements(elements: readonly HTMLElement[]): void {
    for (const element of this.additionalElements) {
      this.detachKeyListeners(element);
    }
    this.clear();
    this.additionalElements = [...new Set(elements)].filter(
      (element) => element !== this.element,
    );
    for (const element of this.additionalElements) {
      this.attachKeyListeners(element);
    }
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

  requestBomb(): void {
    if (this.isEnabled) this.bombRequested = true;
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
    if (this.element) this.detachKeyListeners(this.element);
    for (const element of this.additionalElements) {
      this.detachKeyListeners(element);
    }
    this.windowTarget?.removeEventListener('blur', this.clear);
    this.element = null;
    this.additionalElements = [];
    this.windowTarget = null;
    this.clear();
  }

  private attachKeyListeners(element: HTMLElement): void {
    element.addEventListener('keydown', this.handleKeyDown);
    element.addEventListener('keyup', this.handleKeyUp);
    element.addEventListener('blur', this.clear);
  }

  private detachKeyListeners(element: HTMLElement): void {
    element.removeEventListener('keydown', this.handleKeyDown);
    element.removeEventListener('keyup', this.handleKeyUp);
    element.removeEventListener('blur', this.clear);
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
