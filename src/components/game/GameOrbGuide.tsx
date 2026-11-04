import { useEffect, useRef } from 'react';
import type { GameItemType } from '@/game/core/GameState';
import { drawOrb } from '@/game/rendering/OrbRenderer';

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
}>> = {
  health: {
    name: 'Health Orb',
    description: 'Restores some health, up to your maximum.',
  },
  damage: {
    name: 'Damage Orb',
    description: 'Increases your projectile damage for a limited time.',
  },
  rapidFire: {
    name: 'Rapid Fire Orb',
    description: 'Increases your firing speed for a limited time.',
  },
  shield: {
    name: 'Shield Orb',
    description: 'Adds a shield that absorbs incoming damage for a limited time.',
  },
  bomb: {
    name: 'Bomb Orb',
    description: 'Adds one bomb to your inventory. Use your configured bomb key to detonate it.',
  },
  magnet: {
    name: 'Magnet Orb',
    description: 'Pulls nearby orbs toward you for a limited time.',
  },
  turret: {
    name: 'Turret Orb',
    description: 'Adds one turret to your inventory. Right-click an open arena spot to deploy it. Each turret fires at nearby enemies for a limited time.',
  },
  cursed: {
    name: 'Cursed Orb',
    description: 'Enemies move faster for a limited time, making this a dangerous pickup.',
  },
  rareGold: {
    name: 'Rare Gold Orb',
    description: 'Grants a Rare Point when collected.',
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
  return (
    <section className="game-orb-guide" aria-labelledby="game-orb-guide-title">
      <h2 className="game-enemy-guide-section-title" id="game-orb-guide-title">
        Orbs
      </h2>
      <p className="game-orb-guide-intro">
        Collect orbs during a run to gain their effects.
      </p>
      <div className="game-orb-guide-grid">
        {GAME_ITEM_TYPES.map((type) => {
          const details = ORB_GUIDE_DETAILS[type];
          return (
            <article className="game-orb-guide-card" key={type}>
              <GameOrbPortrait type={type} />
              <div className="game-orb-guide-card-copy">
                <h2>{details.name}</h2>
                <p>{details.description}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
