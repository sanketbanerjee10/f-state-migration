export type TouchControlsSetting = 'auto' | 'always' | 'never';
export type HudDensitySetting = 'compact' | 'standard';

export const GAME_KEY_BINDING_ACTIONS = {
  moveUp: 'Move up',
  moveDown: 'Move down',
  moveLeft: 'Move left',
  moveRight: 'Move right',
  useBomb: 'Use bomb',
} as const;

export type GameKeyBindingAction = keyof typeof GAME_KEY_BINDING_ACTIONS;

export interface GameKeyBindings {
  readonly moveUp: string;
  readonly moveDown: string;
  readonly moveLeft: string;
  readonly moveRight: string;
  readonly useBomb: string;
}

export const DEFAULT_GAME_KEY_BINDINGS: GameKeyBindings = {
  moveUp: 'KeyW',
  moveDown: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  useBomb: 'Space',
};

export const LEGACY_ARROW_BINDINGS: Partial<Record<GameKeyBindingAction, string>> = {
  moveUp: 'ArrowUp',
  moveDown: 'ArrowDown',
  moveLeft: 'ArrowLeft',
  moveRight: 'ArrowRight',
};

export function isSupportedGameKeyCode(code: string): boolean {
  return code.length > 0;
}

export function formatGameKeyCode(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return code.slice(5);
  return code;
}

function isGameKeyBindings(value: unknown): value is GameKeyBindings {
  if (typeof value !== 'object' || value === null) return false;
  const bindings = value as Record<string, unknown>;
  const actions = Object.keys(GAME_KEY_BINDING_ACTIONS);
  return actions.every((action) =>
    typeof bindings[action] === 'string' &&
    isSupportedGameKeyCode(bindings[action]),
  );
}

export interface GameSettings {
  readonly touchControls: TouchControlsSetting;
  readonly hudDensity: HudDensitySetting;
  readonly keyBindings: GameKeyBindings;
  readonly musicEnabled: boolean;
  readonly soundEnabled: boolean;
  readonly musicVolume: number;
  readonly soundVolume: number;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  touchControls: 'auto',
  hudDensity: 'standard',
  keyBindings: DEFAULT_GAME_KEY_BINDINGS,
  musicEnabled: true,
  soundEnabled: true,
  musicVolume: 0.5,
  soundVolume: 0.5,
};

const GAME_SETTINGS_KEY = 'state565.game.settings.v1';

export function loadGameSettings(storage: Pick<Storage, 'getItem'>): GameSettings {
  const saved = storage.getItem(GAME_SETTINGS_KEY);
  if (saved === null) return DEFAULT_GAME_SETTINGS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(saved);
  } catch {
    throw new Error('Saved game settings are invalid. Reset them to continue.');
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Saved game settings are invalid. Reset them to continue.');
  }

  const settings = parsed as Record<string, unknown>;
  const musicEnabled = settings.musicEnabled ?? DEFAULT_GAME_SETTINGS.musicEnabled;
  const soundEnabled = settings.soundEnabled ?? DEFAULT_GAME_SETTINGS.soundEnabled;
  const musicVolume = settings.musicVolume ?? DEFAULT_GAME_SETTINGS.musicVolume;
  const soundVolume = settings.soundVolume ?? DEFAULT_GAME_SETTINGS.soundVolume;
  const savedKeyBindings = settings.keyBindings;
  let keyBindings: unknown = DEFAULT_GAME_SETTINGS.keyBindings;
  if (typeof savedKeyBindings === 'object' && savedKeyBindings !== null) {
    const savedBindings = savedKeyBindings as Record<string, unknown>;
    keyBindings = {
      moveUp: savedBindings.moveUp ?? DEFAULT_GAME_KEY_BINDINGS.moveUp,
      moveDown: savedBindings.moveDown ?? DEFAULT_GAME_KEY_BINDINGS.moveDown,
      moveLeft: savedBindings.moveLeft ?? DEFAULT_GAME_KEY_BINDINGS.moveLeft,
      moveRight: savedBindings.moveRight ?? DEFAULT_GAME_KEY_BINDINGS.moveRight,
      useBomb: savedBindings.useBomb ?? DEFAULT_GAME_KEY_BINDINGS.useBomb,
    };
  }
  if (
    (settings.touchControls !== 'auto' &&
      settings.touchControls !== 'always' &&
      settings.touchControls !== 'never') ||
    (settings.hudDensity !== 'compact' &&
      settings.hudDensity !== 'standard') ||
    !isGameKeyBindings(keyBindings) ||
    typeof musicEnabled !== 'boolean' ||
    typeof soundEnabled !== 'boolean' ||
    typeof musicVolume !== 'number' ||
    !Number.isFinite(musicVolume) ||
    musicVolume < 0 ||
    musicVolume > 1 ||
    typeof soundVolume !== 'number' ||
    !Number.isFinite(soundVolume) ||
    soundVolume < 0 ||
    soundVolume > 1
  ) {
    throw new Error('Saved game settings are invalid. Reset them to continue.');
  }
  return {
    touchControls: settings.touchControls,
    hudDensity: settings.hudDensity,
    keyBindings,
    musicEnabled,
    soundEnabled,
    musicVolume,
    soundVolume,
  };
}

export function saveGameSettings(
  storage: Pick<Storage, 'setItem'>,
  settings: GameSettings,
): void {
  storage.setItem(GAME_SETTINGS_KEY, JSON.stringify(settings));
}
