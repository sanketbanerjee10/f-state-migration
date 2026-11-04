import { useEffect, useRef, useState } from 'react';
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

const ORB_GUIDE_DETAILS: Readonly<Record<GameItemType, {
  readonly name: string;
  readonly description: string;
  readonly details: string;
}>> = {
  health: {
    name: 'Health Orb',
    description: 'Restores health.',
    details: 'Restores 25 health, up to your maximum.',
  },
  damage: {
    name: 'Damage Orb',
    description: 'Boosts projectile damage.',
    details: 'Doubles your projectile damage for a limited time.',
  },
  rapidFire: {
    name: 'Rapid Fire Orb',
    description: 'Speeds up your firing rate.',
    details: 'Doubles your firing rate for a limited time.',
  },
  shield: {
    name: 'Shield Orb',
    description: 'Absorbs incoming damage.',
    details: 'Adds a shield that absorbs incoming damage for a limited time.',
  },
  bomb: {
    name: 'Bomb Orb',
    description: 'Adds an explosive charge to your inventory.',
    details: 'A bomb damages nearby enemies when detonated.',
  },
  magnet: {
    name: 'Magnet Orb',
    description: 'Draws nearby orbs toward you.',
    details: 'Pulls nearby orbs toward you for a limited time.',
  },
  turret: {
    name: 'Turret Orb',
    description: 'Deploys an automated turret.',
    details: 'A deployed turret targets nearby enemies and fires for a limited time.',
  },
  cursed: {
    name: 'Cursed Orb',
    description: 'Makes enemies move faster.',
    details: 'Increases enemy movement speed for a limited time.',
  },
  rareGold: {
    name: 'Rare Gold Orb',
    description: 'Awards one Rare Point.',
    details: 'Grants one Rare Point.',
  },
};

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
  const [selectedOrb, setSelectedOrb] = useState<GameItemType | null>(null);

  return (
    <section
      className="game-orb-guide game-guide-section"
      aria-labelledby="game-orb-guide-title"
    >
      <div className="game-guide-section-heading">
        <span className="game-guide-eyebrow">SUPPLIES &amp; POWER-UPS</span>
        <div className="game-guide-section-heading-row">
          <div className="game-guide-section-index" aria-hidden="true">01</div>
          <h2 id="game-orb-guide-title">Orbs</h2>
        </div>
        <p className="game-guide-section-description">
          Useful pickups that can turn the tide of a run.
        </p>
      </div>

      <div className="game-orb-guide-grid">
        {GAME_ITEM_TYPES.map((type) => {
          const details = ORB_GUIDE_DETAILS[type];

          return (
            <button
              className="game-orb-guide-card"
              type="button"
              key={type}
              aria-haspopup="dialog"
              aria-label={`View ${details.name} details`}
              onClick={() => setSelectedOrb(type)}
            >
              <GameOrbPortrait type={type} />
              <div className="game-orb-guide-card-copy">
                <div className="game-orb-guide-name">
                  <h3>{details.name}</h3>
                  {type === 'rareGold' && (
                    <span className="game-orb-guide-rare-label">RARE</span>
                  )}
                </div>
                <p>{details.description}</p>
              </div>
            </button>
          );
        })}
      </div>
      {selectedOrb && (
        <GameGuideDetailDialog
          title={ORB_GUIDE_DETAILS[selectedOrb].name}
          preview={<GameOrbPortrait type={selectedOrb} />}
          onClose={() => setSelectedOrb(null)}
        >
          <p>{ORB_GUIDE_DETAILS[selectedOrb].details}</p>
        </GameGuideDetailDialog>
      )}
    </section>
  );
}
