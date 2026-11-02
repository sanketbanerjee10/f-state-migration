import type { GameSettings } from '@/game/core/GameSettings';

interface GameSettingsPanelProps {
  readonly settings: GameSettings;
  readonly error: string | null;
  readonly onChange: (settings: GameSettings) => void;
  readonly onBack: () => void;
  readonly backLabel: string;
}

export function GameSettingsPanel({
  settings,
  error,
  onChange,
  onBack,
  backLabel,
}: GameSettingsPanelProps) {
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
      </div>
      {error && (
        <p className="game-settings-error" role="status">
          {error}
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
