import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_GAME_SETTINGS,
  loadGameSettings,
  saveGameSettings,
  type GameSettings,
} from '@/game/core/GameSettings';

export interface GameSettingsState {
  readonly settings: GameSettings;
  readonly error: string | null;
  readonly loaded: boolean;
  readonly updateSettings: (settings: GameSettings) => void;
}

export function useGameSettings(): GameSettingsState {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(DEFAULT_GAME_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      setSettings(loadGameSettings(window.localStorage));
    } catch (loadError) {
      setError(
        t('game.settings.loadFailed', {
          error: loadError instanceof Error
            ? loadError.message
            : t('game.settings.loadFailedSimple'),
        }),
      );
    } finally {
      setLoaded(true);
    }
  }, [t]);

  const updateSettings = useCallback((nextSettings: GameSettings) => {
    setSettings(nextSettings);
    try {
      saveGameSettings(window.localStorage, nextSettings);
      setError(null);
    } catch (saveError) {
      setError(
        t('game.settings.saveFailed', {
          error: saveError instanceof Error
            ? saveError.message
            : t('game.settings.saveFailedSimple'),
        }),
      );
    }
  }, [t]);

  return { settings, error, loaded, updateSettings };
}
