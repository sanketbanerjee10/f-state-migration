import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_GAME_SETTINGS,
  loadGameSettings,
  saveGameSettings,
} from '@/game/core/GameSettings';

describe('game settings persistence', () => {
  it('uses defaults when no saved preferences exist', () => {
    expect(DEFAULT_GAME_SETTINGS.musicVolume).toBe(0.5);
    expect(DEFAULT_GAME_SETTINGS.soundVolume).toBe(0.5);
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
      keyBindings: {
        ...DEFAULT_GAME_SETTINGS.keyBindings,
        moveUp: 'KeyI',
      },
      alternatePauseKey: 'KeyQ',
      musicEnabled: false,
      soundEnabled: true,
      musicVolume: 0.6,
      soundVolume: 0.2,
      touchControlSettings: {
        ...DEFAULT_GAME_SETTINGS.touchControlSettings,
        layout: 'left',
        baseOpacity: 32,
      },
    };

    saveGameSettings(storage, settings);

    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(loadGameSettings(storage)).toEqual(settings);
  });

  it('fills audio preferences with defaults for existing saved settings', () => {
    expect(
      loadGameSettings({
        getItem: () =>
          JSON.stringify({ touchControls: 'auto', hudDensity: 'standard' }),
      }),
    ).toEqual({
      ...DEFAULT_GAME_SETTINGS,
      touchControlSettings: {
        ...DEFAULT_GAME_SETTINGS.touchControlSettings,
        baseOpacity: 40,
        thumbOpacity: 40,
      },
    });
  });

  it('migrates existing saved settings without overwriting storage on load', () => {
    let saved = JSON.stringify({
      touchControls: 'auto',
      hudDensity: 'standard',
    });
    const storage = {
      getItem: () => saved,
      setItem: vi.fn((_key: string, value: string) => {
        saved = value;
      }),
    };

    expect(loadGameSettings(storage).touchControlSettings).toEqual(
      {
        ...DEFAULT_GAME_SETTINGS.touchControlSettings,
        baseOpacity: 40,
        thumbOpacity: 40,
      },
    );
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('normalizes corrupt touch-control settings without rejecting other preferences', () => {
    const loaded = loadGameSettings({
      getItem: () => JSON.stringify({
        touchControls: 'auto',
        hudDensity: 'standard',
        touchControlSettings: {
          layout: 'invalid',
          baseOpacity: 145,
        },
      }),
    });

    expect(loaded.touchControlSettings).toEqual({
      ...DEFAULT_GAME_SETTINGS.touchControlSettings,
      baseOpacity: 100,
      thumbOpacity: 40,
    });
  });

  it('fills key bindings with defaults for earlier saved settings', () => {
    expect(
      loadGameSettings({
        getItem: () =>
          JSON.stringify({
            touchControls: 'auto',
            hudDensity: 'standard',
            musicEnabled: true,
            soundEnabled: true,
            musicVolume: 0.3,
            soundVolume: 0.35,
          }),
      }).keyBindings,
    ).toEqual(DEFAULT_GAME_SETTINGS.keyBindings);
  });

  it('defaults the configurable pause shortcut to P for older saved settings', () => {
    expect(
      loadGameSettings({
        getItem: () =>
          JSON.stringify({ touchControls: 'auto', hudDensity: 'standard' }),
      }).alternatePauseKey,
    ).toBe('KeyP');
  });

  it('ignores the removed turret key in older saved bindings', () => {
    const savedBindings = {
      moveUp: 'KeyW',
      moveDown: 'KeyS',
      moveLeft: 'KeyA',
      moveRight: 'KeyD',
      useBomb: 'KeyF',
      useTurret: 'KeyE',
    };
    const loaded = loadGameSettings({
      getItem: () =>
        JSON.stringify({
          touchControls: 'auto',
          hudDensity: 'standard',
          keyBindings: savedBindings,
        }),
    });

    expect(loaded.keyBindings).toEqual({
      moveUp: 'KeyW',
      moveDown: 'KeyS',
      moveLeft: 'KeyA',
      moveRight: 'KeyD',
      useBomb: 'KeyF',
    });
  });

  it('does not retain the old turret key when it conflicts with another binding', () => {
    const loaded = loadGameSettings({
      getItem: () =>
        JSON.stringify({
          touchControls: 'auto',
          hudDensity: 'standard',
          keyBindings: {
            moveUp: 'KeyW',
            moveDown: 'KeyS',
            moveLeft: 'KeyA',
            moveRight: 'KeyR',
            useBomb: 'KeyE',
            useTurret: 'KeyR',
          },
        }),
    });

    expect(loaded.keyBindings.useBomb).toBe('KeyE');
    expect(loaded.keyBindings).not.toHaveProperty('useTurret');
  });

  it('accepts arbitrary and duplicate key bindings', () => {
    const keyBindings = {
      moveUp: 'NumpadAdd',
      moveDown: 'NumpadAdd',
      moveLeft: 'Comma',
      moveRight: 'BracketLeft',
      useBomb: 'NumpadSubtract',
    };

    expect(
      loadGameSettings({
        getItem: () =>
          JSON.stringify({
            touchControls: 'auto',
            hudDensity: 'standard',
            keyBindings,
          }),
      }).keyBindings,
    ).toEqual(keyBindings);
  });

  it('rejects malformed persisted values', () => {
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
    expect(() =>
      loadGameSettings({
        getItem: () =>
          JSON.stringify({
            touchControls: 'auto',
            hudDensity: 'standard',
            musicVolume: 1.1,
          }),
      }),
    ).toThrow('Saved game settings are invalid.');
    expect(() =>
      loadGameSettings({
        getItem: () =>
          JSON.stringify({
            touchControls: 'auto',
            hudDensity: 'standard',
            keyBindings: {
              ...DEFAULT_GAME_SETTINGS.keyBindings,
              useBomb: 'Escape',
            },
          }),
      }),
    ).toThrow('Saved game settings are invalid.');
    expect(() =>
      loadGameSettings({
        getItem: () =>
          JSON.stringify({
            touchControls: 'auto',
            hudDensity: 'standard',
            keyBindings: {
              moveUp: 'KeyW',
              moveDown: 'KeyS',
              moveLeft: 'KeyA',
              moveRight: 'KeyD',
              useBomb: '',
            },
          }),
      }),
    ).toThrow('Saved game settings are invalid.');
    expect(() =>
      loadGameSettings({
        getItem: () =>
          JSON.stringify({
            touchControls: 'auto',
            hudDensity: 'standard',
            alternatePauseKey: 'Escape',
          }),
      }),
    ).toThrow('Saved game settings are invalid.');
  });
});
