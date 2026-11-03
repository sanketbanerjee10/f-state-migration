import type { ActiveTemporaryEffect } from '@/game/core/GameState';

const EFFECT_PRESENTATION = {
  damage: { label: 'Damage', symbol: '↑' },
  rapidFire: { label: 'Rapid fire', symbol: '»' },
  shield: { label: 'Shield', symbol: '◇' },
  magnet: { label: 'Orb magnet', symbol: '⌁' },
  cursed: { label: 'Cursed power', symbol: '☠' },
} as const;

interface GameActiveEffectsProps {
  readonly effects: readonly Readonly<ActiveTemporaryEffect>[];
}

export function GameActiveEffects({ effects }: GameActiveEffectsProps) {
  if (effects.length === 0) return null;

  return (
    <ul className="game-hud-effects" aria-label="Active effects">
      {effects.map((effect) => {
        const presentation = EFFECT_PRESENTATION[effect.type];
        const secondsRemaining = Math.ceil(effect.remainingSeconds);
        const durationPercent = effect.durationSeconds > 0
          ? Math.max(
              0,
              Math.min(
                100,
                (effect.remainingSeconds / effect.durationSeconds) * 100,
              ),
            )
          : 0;
        const expiring = effect.remainingSeconds <= 3;

        return (
          <li
            key={effect.type}
            className={[
              'game-effect',
              `game-effect-${effect.type}`,
              expiring ? 'game-effect-expiring' : '',
            ].filter(Boolean).join(' ')}
            aria-label={`${presentation.label}, ${secondsRemaining} seconds remaining`}
          >
            <span className="game-effect-icon" aria-hidden="true">
              {presentation.symbol}
            </span>
            <span className="game-effect-name">{presentation.label}</span>
            <strong>{secondsRemaining}s</strong>
            <span
              className="game-effect-duration"
              aria-hidden="true"
              style={{ width: `${durationPercent}%` }}
            />
          </li>
        );
      })}
    </ul>
  );
}
