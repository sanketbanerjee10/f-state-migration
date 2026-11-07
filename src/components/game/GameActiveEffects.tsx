import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { ActiveTemporaryEffect } from '@/game/core/GameState';
import { drawOrbGlyph } from '@/game/rendering/OrbRenderer';

interface GameActiveEffectIconProps {
  readonly type: ActiveTemporaryEffect['type'];
}

function GameActiveEffectIcon({ type }: GameActiveEffectIconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    drawOrbGlyph(
      context,
      type,
      canvas.width / 2,
      canvas.height / 2,
      9,
    );
  }, [type]);

  return <canvas ref={canvasRef} width={24} height={24} />;
}

interface GameActiveEffectsProps {
  readonly effects: readonly Readonly<ActiveTemporaryEffect>[];
}

export function GameActiveEffects({ effects }: GameActiveEffectsProps) {
  const { t } = useTranslation();
  if (effects.length === 0) return null;

  return (
    <ul className="game-hud-effects" aria-label={t('game.effects.active')}>
      {effects.map((effect) => {
        const label = t(`game.effects.${effect.type}`);
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
            aria-label={t('game.effects.remaining', {
              name: label,
              count: secondsRemaining,
            })}
          >
            <span className="game-effect-icon" aria-hidden="true">
              <GameActiveEffectIcon type={effect.type} />
            </span>
            <span className="game-effect-name">{label}</span>
            <strong className="game-effect-time">{secondsRemaining}s</strong>
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
