import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_GAME_SETTINGS,
  loadGameSettings,
  saveGameSettings,
  type GameSettings,
} from '@/game/core/GameSettings';

export interface GameSettingsState {
  readonly settings: GameSettings;
  readonly error: string | null;
  readonly updateSettings: (settings: GameSettings) => void;
}

export function useGameSettings(): GameSettingsState {
  const [settings, setSettings] = useState(DEFAULT_GAME_SETTINGS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSettings(loadGameSettings(window.localStorage));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load saved game settings.',
      );
    }
  }, []);

  const updateSettings = useCallback((nextSettings: GameSettings) => {
    setSettings(nextSettings);
    try {
      saveGameSettings(window.localStorage, nextSettings);
      setError(null);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? `Settings changed for this session but could not be saved: ${saveError.message}`
          : 'Settings changed for this session but could not be saved.',
      );
    }
  }, []);

  return { settings, error, updateSettings };
}
