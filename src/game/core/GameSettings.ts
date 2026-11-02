export type TouchControlsSetting = 'auto' | 'always' | 'never';
export type HudDensitySetting = 'compact' | 'standard';

export interface GameSettings {
  readonly touchControls: TouchControlsSetting;
  readonly hudDensity: HudDensitySetting;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  touchControls: 'auto',
  hudDensity: 'standard',
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
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('touchControls' in parsed) ||
    !('hudDensity' in parsed)
  ) {
    throw new Error('Saved game settings are invalid. Reset them to continue.');
  }

  const settings = parsed as Record<string, unknown>;
  if (
    (settings.touchControls !== 'auto' &&
      settings.touchControls !== 'always' &&
      settings.touchControls !== 'never') ||
    (settings.hudDensity !== 'compact' &&
      settings.hudDensity !== 'standard')
  ) {
    throw new Error('Saved game settings are invalid. Reset them to continue.');
  }
  return {
    touchControls: settings.touchControls,
    hudDensity: settings.hudDensity,
  };
}

export function saveGameSettings(
  storage: Pick<Storage, 'setItem'>,
  settings: GameSettings,
): void {
  storage.setItem(GAME_SETTINGS_KEY, JSON.stringify(settings));
}
