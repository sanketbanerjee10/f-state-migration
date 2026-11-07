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
      musicEnabled: false,
      soundEnabled: true,
      musicVolume: 0.6,
      soundVolume: 0.2,
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
    ).toEqual(DEFAULT_GAME_SETTINGS);
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
      useBomb: 'Escape',
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
              moveUp: 'KeyW',
              moveDown: 'KeyS',
              moveLeft: 'KeyA',
              moveRight: 'KeyD',
              useBomb: '',
            },
          }),
      }),
    ).toThrow('Saved game settings are invalid.');
  });
});
