import { useState, type KeyboardEvent } from 'react';
import type { GameSettings } from '@/game/core/GameSettings';
import {
  GAME_KEY_BINDING_ACTIONS,
  formatGameKeyCode,
  isSupportedGameKeyCode,
  type GameKeyBindingAction,
} from '@/game/core/GameSettings';
import { GAME_MUSIC_TRACKS } from '@/game/audio/GameAudioController';

interface GameSettingsPanelProps {
  readonly settings: GameSettings;
  readonly error: string | null;
  readonly audioError: string | null;
  readonly onChange: (settings: GameSettings) => void;
  readonly onBack: () => void;
  readonly backLabel: string;
}

export function GameSettingsPanel({
  settings,
  error,
  audioError,
  onChange,
  onBack,
  backLabel,
}: GameSettingsPanelProps) {
  const [capturingAction, setCapturingAction] =
    useState<GameKeyBindingAction | null>(null);
  const [keyBindingError, setKeyBindingError] = useState<string | null>(null);

  const captureKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    action: GameKeyBindingAction,
  ) => {
    if (capturingAction !== action) return;
    event.preventDefault();
    event.stopPropagation();
    if (!isSupportedGameKeyCode(event.code)) {
      setKeyBindingError('This key cannot be assigned by your browser.');
      return;
    }
    onChange({
      ...settings,
      keyBindings: { ...settings.keyBindings, [action]: event.code },
    });
    setCapturingAction(null);
    setKeyBindingError(null);
  };

  return (
    <>
      <p className="game-panel-eyebrow">Game preferences</p>
      <h1 id="game-settings-title">Settings</h1>
      <div className="game-settings-list">
        <fieldset className="game-setting">
          <legend>Touch controls</legend>
          <p>Choose when the movement and aim joysticks are shown.</p>
          <div
            className="game-setting-options"
            role="group"
            aria-label="Touch controls visibility"
          >
            {([
              ['auto', 'Auto'],
              ['always', 'Always'],
              ['never', 'Never'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                className="game-setting-option"
                type="button"
                aria-pressed={settings.touchControls === value}
                onClick={() => onChange({ ...settings, touchControls: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="game-setting">
          <legend>HUD density</legend>
          <p>Adjust how much space the run display uses.</p>
          <div
            className="game-setting-options"
            role="group"
            aria-label="HUD density"
          >
            {([
              ['standard', 'Standard'],
              ['compact', 'Compact'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                className="game-setting-option"
                type="button"
                aria-pressed={settings.hudDensity === value}
                onClick={() => onChange({ ...settings, hudDensity: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="game-setting">
          <legend>Key bindings</legend>
          <p>
            Click a button, then press any key to assign it. Click the active
            binding again to cancel. Place turrets with right click.
          </p>
          <div className="game-key-binding-list" role="group" aria-label="Key bindings">
            {Object.entries(GAME_KEY_BINDING_ACTIONS).map(([action, label]) => {
              const typedAction = action as GameKeyBindingAction;
              return (
                <button
                  key={action}
                  className="game-setting-option game-key-binding"
                  type="button"
                  aria-label={`${label}: ${formatGameKeyCode(settings.keyBindings[typedAction])}`}
                  aria-pressed={capturingAction === typedAction}
                  onClick={() => {
                    setCapturingAction((currentAction) =>
                      currentAction === typedAction ? null : typedAction,
                    );
                    setKeyBindingError(null);
                  }}
                  onKeyDown={(event) => captureKey(event, typedAction)}
                >
                  <span>{label}</span>
                  <strong>
                    {capturingAction === typedAction
                      ? 'Press key...'
                      : formatGameKeyCode(settings.keyBindings[typedAction])}
                  </strong>
                </button>
              );
            })}
            <div
              className="game-setting-option game-key-binding game-key-binding-static"
              aria-label="Place turret: Right click"
            >
              <span>Place turret</span>
              <strong>Right click</strong>
            </div>
          </div>
          {keyBindingError && (
            <p className="game-settings-error" role="status">
              {keyBindingError}
            </p>
          )}
        </fieldset>
        <fieldset className="game-setting">
          <legend>Background music</legend>
          <p>
            {GAME_MUSIC_TRACKS.length > 0
              ? 'Play the hosted lofi tracks in sequence. The next track is prepared before this one ends.'
              : 'Music is unavailable because no tracks are configured.'}
          </p>
          <div className="game-setting-options" role="group" aria-label="Background music">
            {([
              [true, 'On'],
              [false, 'Off'],
            ] as const).map(([value, label]) => (
              <button
                key={label}
                className="game-setting-option"
                type="button"
                aria-pressed={settings.musicEnabled === value}
                onClick={() => onChange({ ...settings, musicEnabled: value })}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="game-setting-volume">
            <span>
              Music volume <output>{Math.round(settings.musicVolume * 100)}%</output>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.musicVolume}
              aria-label="Music volume"
              onChange={(event) =>
                onChange({ ...settings, musicVolume: Number(event.currentTarget.value) })
              }
            />
          </label>
        </fieldset>
        <fieldset className="game-setting">
          <legend>Sound effects</legend>
          <p>Optional cues for collecting items, taking damage, and combat.</p>
          <div className="game-setting-options" role="group" aria-label="Sound effects">
            {([
              [true, 'On'],
              [false, 'Off'],
            ] as const).map(([value, label]) => (
              <button
                key={label}
                className="game-setting-option"
                type="button"
                aria-pressed={settings.soundEnabled === value}
                onClick={() => onChange({ ...settings, soundEnabled: value })}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="game-setting-volume">
            <span>
              Effects volume <output>{Math.round(settings.soundVolume * 100)}%</output>
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.soundVolume}
              aria-label="Effects volume"
              onChange={(event) =>
                onChange({ ...settings, soundVolume: Number(event.currentTarget.value) })
              }
            />
          </label>
        </fieldset>
      </div>
      {error && (
        <p className="game-settings-error" role="status">
          {error}
        </p>
      )}
      {audioError && (
        <p className="game-settings-error" role="status">
          Audio unavailable: {audioError}
        </p>
      )}
      <div className="game-menu-actions game-settings-actions">
        <button
          className="game-menu-primary"
          type="button"
          onClick={onBack}
          autoFocus
        >
          {backLabel}
        </button>
      </div>
    </>
  );
}
