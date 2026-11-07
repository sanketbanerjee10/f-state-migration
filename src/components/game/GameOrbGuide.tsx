import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GameItemType } from '@/game/core/GameState';
import { drawOrb } from '@/game/rendering/OrbRenderer';
import { GameGuideDetailDialog } from './GameGuideDetailDialog';

const GAME_ITEM_TYPES = [
  'health',
  'damage',
  'rapidFire',
  'shield',
  'bomb',
  'magnet',
  'turret',
  'cursed',
  'rareGold',
] as const satisfies readonly GameItemType[];

interface GameOrbPortraitProps {
  readonly type: GameItemType;
}

function GameOrbPortrait({ type }: GameOrbPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    drawOrb(
      context,
      {
        x: canvas.width / 2,
        y: canvas.height / 2,
        type,
        rarity: type === 'rareGold' ? 'special' : 'common',
        remainingFraction: 0,
        pulseOffset: 0,
      },
      0,
    );
  }, [type]);

  return (
    <div className="game-orb-guide-portrait" aria-hidden="true">
      <span className="game-orb-guide-orbit" />
      <canvas
        ref={canvasRef}
        className="game-orb-guide-image"
        width={96}
        height={96}
      />
    </div>
  );
}

export function GameOrbGuideSection() {
  const { t } = useTranslation();
  const [selectedOrb, setSelectedOrb] = useState<GameItemType | null>(null);

  return (
    <section
      className="game-orb-guide game-guide-section"
      aria-labelledby="game-orb-guide-title"
    >
      <div className="game-guide-section-heading">
        <span className="game-guide-eyebrow">{t('game.orbs.supplies')}</span>
        <div className="game-guide-section-heading-row">
          <div className="game-guide-section-index" aria-hidden="true">01</div>
          <h2 id="game-orb-guide-title">{t('game.orbs.title')}</h2>
        </div>
        <p className="game-guide-section-description">
          {t('game.orbs.description')}
        </p>
      </div>

      <div className="game-orb-guide-grid">
        {GAME_ITEM_TYPES.map((type) => {
          const name = t(`game.orbs.${type}Name`);
          const description = t(`game.orbs.${type}Description`);

          return (
            <button
              className="game-orb-guide-card"
              type="button"
              key={type}
              aria-haspopup="dialog"
              aria-label={t('game.orbs.viewDetails', { name })}
              onClick={() => setSelectedOrb(type)}
            >
              <GameOrbPortrait type={type} />
              <div className="game-orb-guide-card-copy">
                <div className="game-orb-guide-name">
                  <h3>{name}</h3>
                  {type === 'rareGold' && (
                    <span className="game-orb-guide-rare-label">{t('game.orbs.rare')}</span>
                  )}
                </div>
                <p>{description}</p>
              </div>
            </button>
          );
        })}
      </div>
      {selectedOrb && (
        <GameGuideDetailDialog
          title={t(`game.orbs.${selectedOrb}Name`)}
          preview={<GameOrbPortrait type={selectedOrb} />}
          onClose={() => setSelectedOrb(null)}
        >
          <p>{t(`game.orbs.${selectedOrb}Details`)}</p>
        </GameGuideDetailDialog>
      )}
    </section>
  );
}
