import { useState, type KeyboardEvent } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { GameSettings } from '@/game/core/GameSettings';
import {
  GAME_KEY_BINDING_ACTIONS,
  formatGameKeyCode,
  isSupportedGameKeyCode,
  type GameKeyBindingAction,
} from '@/game/core/GameSettings';
import { GAME_MUSIC_TRACKS } from '@/game/audio/GameAudioController';
import { GameFranchiseWordmark } from './GameFranchiseWordmark';

interface GameSettingsPanelProps {
  readonly settings: GameSettings;
  readonly error: string | null;
  readonly audioError: string | null;
  readonly onChange: (settings: GameSettings) => void;
  readonly onBack: () => void;
  readonly backLabel: string;
}

type SettingsSection = 'play' | 'controls' | 'audio';

const SECTIONS: {
  id: SettingsSection;
  icon: string;
  label: string;
  hint: string;
}[] = [
  { id: 'play', icon: '✳', label: 'Play', hint: 'Your experience' },
  { id: 'controls', icon: '⌘', label: 'Controls', hint: 'Keys & movement' },
  { id: 'audio', icon: '♫', label: 'Audio', hint: 'Music & effects' },
];

const TOUCH_CONTROLS_HINTS: Record<GameSettings['touchControls'], string> = {
  auto: 'Show touch controls automatically when the device supports them.',
  always: 'Keep touch controls visible throughout the game.',
  never: 'Hide touch controls; use keyboard and mouse instead.',
};

export function GameSettingsPanel({
  settings,
  error,
  audioError,
  onChange,
  onBack,
  backLabel,
}: GameSettingsPanelProps) {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>('play');

  const [capturingAction, setCapturingAction] =
    useState<GameKeyBindingAction | null>(null);

  const [keyBindingError, setKeyBindingError] =
    useState<string | null>(null);

  const captureKey = (
    event: KeyboardEvent<HTMLButtonElement>,
    action: GameKeyBindingAction,
  ) => {
    if (capturingAction !== action) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.code === 'Escape') {
      setCapturingAction(null);
      setKeyBindingError(null);
      return;
    }

    if (!isSupportedGameKeyCode(event.code)) {
      setKeyBindingError('This key cannot be assigned by your browser.');
      return;
    }

    onChange({
      ...settings,
      keyBindings: {
        ...settings.keyBindings,
        [action]: event.code,
      },
    });

    setCapturingAction(null);
    setKeyBindingError(null);
  };

  const changeSection = (section: SettingsSection) => {
    setActiveSection(section);
    setCapturingAction(null);
    setKeyBindingError(null);
  };

  return (
    <section
      className="game-settings-panel"
      aria-labelledby="game-settings-title"
    >
      <header className="settings-header">
        <div className="settings-brand">
          <button
            className="game-level-back-button"
            type="button"
            onClick={onBack}
            aria-label={backLabel}
            autoFocus
          >
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <div className="settings-title">
            <p className="game-dialog-wordmark">
              <GameFranchiseWordmark />
            </p>
            <h1 id="game-settings-title">Settings</h1>
          </div>
        </div>

        <div className="settings-header-actions">
          {(error || audioError) && (
            <p className="settings-inline-error settings-header-error" role="alert">
              {error || `Audio unavailable: ${audioError}`}
            </p>
          )}
        </div>
      </header>

      <div className="settings-workspace">
        <nav className="settings-nav" aria-label="Settings categories">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className="settings-nav-item"
              data-active={activeSection === section.id}
              aria-current={
                activeSection === section.id ? 'page' : undefined
              }
              onClick={() => changeSection(section.id)}
            >
              <span className="settings-nav-icon" aria-hidden="true">
                {section.icon}
              </span>

              <span className="settings-nav-copy">
                <strong>{section.label}</strong>
                <small>{section.hint}</small>
              </span>

              <span className="settings-nav-arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}

        </nav>

        <div className="settings-content">
          {activeSection === 'play' && (
            <div className="settings-section-view">
              <div className="settings-section-heading">
                <div>
                  <span className="settings-kicker">01 / PLAY</span>
                  <h2>Make it yours</h2>
                </div>
                <span className="settings-heading-decoration" aria-hidden="true">
                  ✳
                </span>
              </div>

              <div className="settings-card-grid">
                <section className="settings-card">
                  <div className="settings-card-heading">
                    <span className="settings-card-icon">☷</span>
                    <div>
                      <h3>Touch controls</h3>
                      <p>When should joysticks appear?</p>
                    </div>
                  </div>

                  <div
                    className="settings-choice-row"
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
                        type="button"
                        className="settings-choice"
                        aria-pressed={settings.touchControls === value}
                        onClick={() =>
                          onChange({ ...settings, touchControls: value })
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <p className="settings-card-footnote">
                    {TOUCH_CONTROLS_HINTS[settings.touchControls]}
                  </p>
                </section>

                <section className="settings-card">
                  <div className="settings-card-heading">
                    <span className="settings-card-icon">▦</span>
                    <div>
                      <h3>HUD density</h3>
                      <p>Choose your battlefield view.</p>
                    </div>
                  </div>

                  <div className="settings-hud-options">
                    <button
                      type="button"
                      className="settings-hud-option"
                      aria-pressed={settings.hudDensity === 'standard'}
                      onClick={() =>
                        onChange({ ...settings, hudDensity: 'standard' })
                      }
                    >
                      <span className="settings-hud-preview standard">
                        <i />
                        <i />
                        <i />
                        <b />
                      </span>
                      <strong>Standard</strong>
                      <small>Full display</small>
                    </button>

                    <button
                      type="button"
                      className="settings-hud-option"
                      aria-pressed={settings.hudDensity === 'compact'}
                      onClick={() =>
                        onChange({ ...settings, hudDensity: 'compact' })
                      }
                    >
                      <span className="settings-hud-preview compact">
                        <i />
                        <b />
                      </span>
                      <strong>Compact</strong>
                      <small>More room</small>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeSection === 'controls' && (
            <div className="settings-section-view">
              <div className="settings-section-heading">
                <div>
                  <span className="settings-kicker">02 / CONTROLS</span>
                  <h2>Your controls</h2>
                </div>
                <span className="settings-heading-decoration" aria-hidden="true">
                  ⌘
                </span>
              </div>

              <section className="settings-card settings-controls-card">
                <div className="settings-card-heading">
                  <span className="settings-card-icon">⌨</span>
                  <div>
                    <h3>Keyboard bindings</h3>
                    <p>Select an action, then press the key you want.</p>
                  </div>
                </div>

                <div className="settings-key-grid" role="group" aria-label="Key bindings">
                  {Object.entries(GAME_KEY_BINDING_ACTIONS).map(
                    ([action, label]) => {
                      const typedAction = action as GameKeyBindingAction;
                      const isCapturing = capturingAction === typedAction;

                      return (
                        <button
                          key={action}
                          type="button"
                          className="settings-key-row"
                          aria-label={`${label}: ${
                            isCapturing
                              ? 'Press a key'
                              : formatGameKeyCode(
                                  settings.keyBindings[typedAction],
                                )
                          }`}
                          aria-pressed={isCapturing}
                          data-capturing={isCapturing}
                          onClick={() => {
                            setCapturingAction((current) =>
                              current === typedAction ? null : typedAction,
                            );
                            setKeyBindingError(null);
                          }}
                          onKeyDown={(event) =>
                            captureKey(event, typedAction)
                          }
                        >
                          <span>{label}</span>
                          <kbd>
                            {isCapturing
                              ? 'PRESS KEY…'
                              : formatGameKeyCode(
                                  settings.keyBindings[typedAction],
                                )}
                          </kbd>
                        </button>
                      );
                    },
                  )}

                  <div className="settings-key-row settings-key-static">
                    <span>Place turret</span>
                    <kbd>RIGHT CLICK</kbd>
                  </div>
                </div>

                <p className="settings-controls-hint">
                  Click a highlighted key again to cancel. Press Escape while
                  assigning to cancel.
                </p>

                {keyBindingError && (
                  <p className="settings-inline-error" role="status">
                    {keyBindingError}
                  </p>
                )}
              </section>
            </div>
          )}

          {activeSection === 'audio' && (
            <div className="settings-section-view">
              <div className="settings-section-heading">
                <div>
                  <span className="settings-kicker">03 / AUDIO</span>
                  <h2>Set the mood</h2>
                </div>
                <span className="settings-heading-decoration" aria-hidden="true">
                  ♫
                </span>
              </div>

              <div className="settings-card-grid settings-audio-grid">
                <section className="settings-card settings-audio-card">
                  <div className="settings-audio-art music-art" aria-hidden="true">
                    <span>♫</span>
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>

                  <div className="settings-audio-title">
                    <div>
                      <h3>Background music</h3>
                      <p>Late-night radio</p>
                    </div>

                    <button
                      type="button"
                      className="settings-toggle"
                      role="switch"
                      aria-checked={settings.musicEnabled}
                      aria-label="Background music"
                      disabled={GAME_MUSIC_TRACKS.length === 0}
                      onClick={() =>
                        onChange({
                          ...settings,
                          musicEnabled: !settings.musicEnabled,
                        })
                      }
                    >
                      <span />
                    </button>
                  </div>

                  <div className="settings-volume">
                    <div className="settings-volume-label">
                      <label htmlFor="settings-music-volume">Volume</label>
                      <output htmlFor="settings-music-volume">
                        {Math.round(settings.musicVolume * 100)}%
                      </output>
                    </div>

                    <input
                      id="settings-music-volume"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.musicVolume}
                      aria-label="Music volume"
                      onChange={(event) =>
                        onChange({
                          ...settings,
                          musicVolume: Number(event.currentTarget.value),
                        })
                      }
                    />
                  </div>

                  <p className="settings-card-footnote">
                    {GAME_MUSIC_TRACKS.length > 0
                      ? 'Lo-fi tracks play one after another.'
                      : 'Music unavailable — no tracks configured.'}
                  </p>
                </section>

                <section className="settings-card settings-audio-card">
                  <div className="settings-audio-art effects-art" aria-hidden="true">
                    <span>〰</span>
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>

                  <div className="settings-audio-title">
                    <div>
                      <h3>Sound effects</h3>
                      <p>Little things that matter</p>
                    </div>

                    <button
                      type="button"
                      className="settings-toggle"
                      role="switch"
                      aria-checked={settings.soundEnabled}
                      aria-label="Sound effects"
                      onClick={() =>
                        onChange({
                          ...settings,
                          soundEnabled: !settings.soundEnabled,
                        })
                      }
                    >
                      <span />
                    </button>
                  </div>

                  <div className="settings-volume">
                    <div className="settings-volume-label">
                      <label htmlFor="settings-effects-volume">Volume</label>
                      <output htmlFor="settings-effects-volume">
                        {Math.round(settings.soundVolume * 100)}%
                      </output>
                    </div>

                    <input
                      id="settings-effects-volume"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.soundVolume}
                      aria-label="Effects volume"
                      onChange={(event) =>
                        onChange({
                          ...settings,
                          soundVolume: Number(event.currentTarget.value),
                        })
                      }
                    />
                  </div>

                  <p className="settings-card-footnote">
                    Item pickups, damage and combat cues.
                  </p>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>

    </section>
  );
}
