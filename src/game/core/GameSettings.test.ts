import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_GAME_SETTINGS,
  loadGameSettings,
  saveGameSettings,
} from './GameSettings';

describe('game settings persistence', () => {
  it('uses defaults when no saved preferences exist', () => {
    expect(loadGameSettings({ getItem: () => null })).toEqual(
      DEFAULT_GAME_SETTINGS,
    );
  });

  it('round-trips validated presentation preferences', () => {
    let saved: string | null = null;
    const storage = {
      getItem: () => saved,
      setItem: vi.fn((_key: string, value: string) => {
        saved = value;
      }),
    };
    const settings = {
      touchControls: 'always' as const,
      hudDensity: 'compact' as const,
    };

    saveGameSettings(storage, settings);

    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(loadGameSettings(storage)).toEqual(settings);
  });

  it('rejects malformed or unsupported persisted values', () => {
    expect(() => loadGameSettings({ getItem: () => '{' })).toThrow(
      'Saved game settings are invalid.',
    );
    expect(() =>
      loadGameSettings({
        getItem: () => JSON.stringify({
          touchControls: 'sometimes',
          hudDensity: 'standard',
        }),
      }),
    ).toThrow('Saved game settings are invalid.');
  });
});
