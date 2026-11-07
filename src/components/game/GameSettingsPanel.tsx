import { Fragment, useEffect, useState, type KeyboardEvent } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageFlag } from '@/components/LanguageSelector';
import { LANGUAGE_STORAGE_KEY } from '@/i18n';
import { GAME_TOUCH_CONTROLS_MEDIA_QUERY } from '@/game/core/GameConfig';
import {
  LANGUAGE_METADATA,
  SUPPORTED_LANGUAGES,
  isSupportedLanguage,
} from '@/i18n/languages';
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

type SettingsSection = 'play' | 'controls' | 'audio' | 'language';

const SECTIONS: {
  id: SettingsSection;
  icon: string;
  labelKey: string;
  hintKey: string;
}[] = [
  { id: 'play', icon: '✳', labelKey: 'play', hintKey: 'playHint' },
  { id: 'controls', icon: '⌘', labelKey: 'controls', hintKey: 'controlsHint' },
  { id: 'audio', icon: '♫', labelKey: 'audio', hintKey: 'audioHint' },
  { id: 'language', icon: '文', labelKey: 'language', hintKey: 'languageHint' },
];

const TOUCH_CONTROLS_HINTS: Record<GameSettings['touchControls'], string> = {
  auto: 'touchAutoHint',
  always: 'touchAlwaysHint',
  never: 'touchNeverHint',
};

export function GameSettingsPanel({
  settings,
  error,
  audioError,
  onChange,
  onBack,
  backLabel,
}: GameSettingsPanelProps) {
  const { i18n, t } = useTranslation();
  const [activeSection, setActiveSection] =
    useState<SettingsSection>('play');

  const [capturingAction, setCapturingAction] =
    useState<GameKeyBindingAction | null>(null);

  const [isCapturingPauseKey, setIsCapturingPauseKey] = useState(false);
  const [keyBindingError, setKeyBindingError] =
    useState<string | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(GAME_TOUCH_CONTROLS_MEDIA_QUERY).matches,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const responsiveQuery = window.matchMedia(GAME_TOUCH_CONTROLS_MEDIA_QUERY);
    const updateDeviceType = () => {
      setIsTouchDevice(responsiveQuery.matches);
      if (responsiveQuery.matches) {
        setActiveSection((section) =>
          section === 'controls' ? 'play' : section,
        );
      }
    };
    updateDeviceType();
    responsiveQuery.addEventListener('change', updateDeviceType);
    return () =>
      responsiveQuery.removeEventListener('change', updateDeviceType);
  }, []);

  const activeLanguage = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const selectedLanguage = isSupportedLanguage(activeLanguage)
    ? activeLanguage
    : 'en';

  const selectLanguage = (language: string) => {
    if (!isSupportedLanguage(language)) return;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    void i18n.changeLanguage(language);
  };

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
      setKeyBindingError(t('game.settings.keyCannotAssign'));
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

  const captureAlternatePauseKey = (
    event: KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (!isCapturingPauseKey) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.code === 'Escape') {
      setIsCapturingPauseKey(false);
      setKeyBindingError(null);
      return;
    }

    if (!isSupportedGameKeyCode(event.code)) {
      setKeyBindingError(t('game.settings.keyCannotAssign'));
      return;
    }

    onChange({ ...settings, alternatePauseKey: event.code });
    setIsCapturingPauseKey(false);
    setKeyBindingError(null);
  };

  const changeSection = (section: SettingsSection) => {
    setActiveSection(section);
    setCapturingAction(null);
    setIsCapturingPauseKey(false);
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
            <h1 id="game-settings-title">{t('game.settings.title')}</h1>
          </div>
        </div>

        <div className="settings-header-actions">
          {(error || audioError) && (
            <p className="settings-inline-error settings-header-error" role="alert">
              {error || t('game.settings.audioUnavailable', { error: audioError })}
            </p>
          )}
        </div>
      </header>

      <div className="settings-workspace">
        <nav className="settings-nav" aria-label={t('game.settings.categories')}>
          {SECTIONS.filter(
            (section) => section.id !== 'controls' || !isTouchDevice,
          ).map((section) => (
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
                <strong>{t(`game.settings.${section.labelKey}`)}</strong>
                <small>{t(`game.settings.${section.hintKey}`)}</small>
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
                  <span className="settings-kicker">{t('game.settings.sectionPlay')}</span>
                  <h2>{t('game.settings.makeItYours')}</h2>
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
                      <h3>{t('game.settings.touchControls')}</h3>
                      <p>{t('game.settings.joysticksQuestion')}</p>
                    </div>
                  </div>

                  <div
                    className="settings-choice-row"
                    role="group"
                    aria-label={t('game.settings.touchControlsVisibility')}
                  >
                    {([
                      ['auto', t('game.settings.auto')],
                      ['always', t('game.settings.always')],
                      ['never', t('game.settings.never')],
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
                    {t(`game.settings.${TOUCH_CONTROLS_HINTS[settings.touchControls]}`)}
                  </p>
                </section>

                <section className="settings-card">
                  <div className="settings-card-heading">
                    <span className="settings-card-icon">▦</span>
                    <div>
                      <h3>{t('game.settings.hudDensity')}</h3>
                      <p>{t('game.settings.battlefieldView')}</p>
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
                      <strong>{t('game.settings.standard')}</strong>
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
                      <strong>{t('game.settings.compact')}</strong>
                    </button>
                  </div>
                </section>

              </div>
            </div>
          )}

          {activeSection === 'controls' && !isTouchDevice && (
            <div className="settings-section-view">
              <div className="settings-section-heading">
                <div>
                  <span className="settings-kicker">{t('game.settings.sectionControls')}</span>
                  <h2>{t('game.settings.yourControls')}</h2>
                </div>
                <span className="settings-heading-decoration" aria-hidden="true">
                  ⌘
                </span>
              </div>

              <section className="settings-controls">
                <div className="settings-key-grid" role="group" aria-label={t('game.settings.keyBindings')}>
                  {Object.entries(GAME_KEY_BINDING_ACTIONS).map(
                    ([action]) => {
                      const typedAction = action as GameKeyBindingAction;
                      const isCapturing = capturingAction === typedAction;

                      return (
                        <Fragment key={action}>
                          <button
                            type="button"
                            className="settings-key-row"
                            aria-label={`${t(`game.settings.actions.${action}`)}: ${
                              isCapturing
                                ? t('game.settings.pressKey')
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
                              setIsCapturingPauseKey(false);
                              setKeyBindingError(null);
                            }}
                            onKeyDown={(event) =>
                              captureKey(event, typedAction)
                            }
                          >
                            <span>{t(`game.settings.actions.${action}`)}</span>
                            <kbd>
                              {isCapturing
                                ? t('game.settings.pressKeyEllipsis')
                                : formatGameKeyCode(
                                    settings.keyBindings[typedAction],
                                  )}
                            </kbd>
                          </button>
                          {typedAction === 'moveRight' && (
                            <button
                              type="button"
                              className="settings-key-row"
                              aria-label={`${t('game.settings.pauseGame')}: ${
                                isCapturingPauseKey
                                  ? t('game.settings.pressKey')
                                  : formatGameKeyCode(settings.alternatePauseKey)
                              }`}
                              aria-pressed={isCapturingPauseKey}
                              data-capturing={isCapturingPauseKey}
                              onClick={() => {
                                setIsCapturingPauseKey((capturing) => !capturing);
                                setCapturingAction(null);
                                setKeyBindingError(null);
                              }}
                              onKeyDown={captureAlternatePauseKey}
                            >
                              <span>{t('game.settings.pauseGame')}</span>
                              <kbd>
                                {isCapturingPauseKey
                                  ? t('game.settings.pressKeyEllipsis')
                                  : formatGameKeyCode(settings.alternatePauseKey)}
                              </kbd>
                            </button>
                          )}
                        </Fragment>
                      );
                    },
                  )}

                  <div className="settings-key-row settings-key-static">
                    <span>{t('game.settings.placeTurret')}</span>
                    <span
                      className="settings-mouse-shortcuts"
                      role="img"
                      aria-label={`${t('game.settings.placeTurret')}: ${t('game.settings.leftDoubleOrRightClick')}`}
                    >
                      <span className="settings-mouse-shortcut settings-mouse-left-double">
                        <svg viewBox="0 0 24 30" aria-hidden="true">
                          <path d="M12 2a8 8 0 0 0-8 8v10a8 8 0 0 0 16 0V10a8 8 0 0 0-8-8Z" />
                          <path d="M12 2v12m-8-4h8m0-8v10m-3-7h3" />
                          <path className="settings-mouse-left-button" d="M5 10a7 7 0 0 1 7-7v10H5z" />
                        </svg>
                        <b aria-hidden="true">×2</b>
                      </span>
                      <span className="settings-mouse-shortcut-separator" aria-hidden="true">/</span>
                      <span className="settings-mouse-shortcut">
                        <svg viewBox="0 0 24 30" aria-hidden="true">
                          <path d="M12 2a8 8 0 0 0-8 8v10a8 8 0 0 0 16 0V10a8 8 0 0 0-8-8Z" />
                          <path d="M12 2v12m-8-4h8" />
                          <path className="settings-mouse-right-button" d="M12 3a7 7 0 0 1 7 7v3h-7z" />
                        </svg>
                      </span>
                    </span>
                  </div>
                </div>

                <p className="settings-controls-hint">
                  {t('game.settings.cancelBinding')}
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
                  <span className="settings-kicker">{t('game.settings.sectionAudio')}</span>
                  <h2>{t('game.settings.setTheMood')}</h2>
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
                      <h3>{t('game.settings.backgroundMusic')}</h3>
                      <p>{t('game.settings.lateNightRadio')}</p>
                    </div>

                    <button
                      type="button"
                      className="settings-toggle"
                      role="switch"
                      aria-checked={settings.musicEnabled}
                      aria-label={t('game.settings.backgroundMusic')}
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
                      <label htmlFor="settings-music-volume">{t('game.settings.volume')}</label>
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
                      aria-label={t('game.settings.musicVolume')}
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
                      ? t('game.settings.lofiTracks')
                      : t('game.settings.musicUnavailable')}
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
                      <h3>{t('game.settings.soundEffects')}</h3>
                      <p>{t('game.settings.littleThings')}</p>
                    </div>

                    <button
                      type="button"
                      className="settings-toggle"
                      role="switch"
                      aria-checked={settings.soundEnabled}
                      aria-label={t('game.settings.soundEffects')}
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
                      <label htmlFor="settings-effects-volume">{t('game.settings.volume')}</label>
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
                      aria-label={t('game.settings.effectsVolume')}
                      onChange={(event) =>
                        onChange({
                          ...settings,
                          soundVolume: Number(event.currentTarget.value),
                        })
                      }
                    />
                  </div>

                  <p className="settings-card-footnote">
                    {t('game.settings.soundEffectFootnote')}
                  </p>
                </section>
              </div>
            </div>
          )}

          {activeSection === 'language' && (
            <div className="settings-section-view">
              <div className="settings-section-heading">
                <div>
                  <span className="settings-kicker">{t('game.settings.sectionLanguage')}</span>
                  <h2>{t('game.settings.chooseLanguage')}</h2>
                </div>
              </div>

              <div className="settings-language-options" role="group" aria-label={t('game.settings.chooseLanguage')}>
                {LANGUAGE_METADATA.filter((language) =>
                  SUPPORTED_LANGUAGES.includes(language.code),
                ).map((language) => (
                  <button
                    key={language.code}
                    type="button"
                    className="settings-language-option"
                    aria-pressed={selectedLanguage === language.code}
                    data-selected={selectedLanguage === language.code}
                    onClick={() => selectLanguage(language.code)}
                  >
                    <LanguageFlag code={language.code} />
                    <span>
                      {language.nativeName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </section>
  );
}
