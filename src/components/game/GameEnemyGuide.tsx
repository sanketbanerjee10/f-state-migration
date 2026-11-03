import { useEffect, useRef, useState } from 'react';
import type { ZombieType } from '@/game/core/GameState';
import {
  BOSS_TYPES,
  getBossName,
  type BossType,
} from '@/game/bosses/BossSystem';
import {
  BOSS_DISCOVERY_TYPES,
  ENEMY_DISCOVERY_LABELS,
  ENEMY_DISCOVERY_TYPES,
  ENEMY_GUIDE_DETAILS,
  getEnemyDiscoveryStorage,
  readDiscoveredBosses,
  readDiscoveredEnemies,
} from '@/game/discovery/EnemyDiscovery';
import { drawZombie } from '@/game/rendering/ZombieRenderer';

interface GameEnemyGuideProps {
  readonly onBack: () => void;
  readonly backLabel: string;
}

interface GameEnemyPortraitProps {
  readonly type: ZombieType;
  readonly discovered: boolean;
  readonly bossType?: BossType;
}

const BOSS_GUIDE_DETAILS: Readonly<Record<BossType, {
  readonly description: string;
  readonly ability: string;
}>> = {
  charger: {
    description: 'A massive mutant that builds momentum before charging across the arena.',
    ability: 'Telegraphs its dash direction; colliding with an obstacle stuns it briefly.',
  },
  acidQueen: {
    description: 'A toxic mutant that controls the arena with ranged acid attacks.',
    ability: 'Fires acid spreads and creates telegraphed pools that deny areas temporarily.',
  },
  hordeCaller: {
    description: 'A summoner protected by a shield while its reinforcements remain.',
    ability: 'Summons supporting zombies; defeat them to remove its shield and make it vulnerable.',
  },
};

function GameEnemyPortrait({
  type,
  discovered,
  bossType,
}: GameEnemyPortraitProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2 - 4);
    const portraitScale = bossType ? 1 : 2;
    context.scale(portraitScale, portraitScale);
    drawZombie(
      context,
      {
        x: 0,
        y: 0,
        type,
        facingAngle: 0,
        movementFactor: 0,
        ...(bossType && {
          radius: 32,
          isBoss: true,
          bossType,
          bossShielded: bossType === 'hordeCaller',
        }),
      },
      0,
    );
    context.restore();
  }, [type, bossType]);

  return (
    <div
      className={`game-enemy-guide-portrait${discovered ? '' : ' is-locked'}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="game-enemy-guide-character"
        width={240}
        height={150}
      />
      {!discovered && (
        <span className="game-enemy-guide-question">?</span>
      )}
    </div>
  );
}

export function GameEnemyGuide({ onBack, backLabel }: GameEnemyGuideProps) {
  const [discoveredEnemies] = useState<Set<ZombieType>>(
    () => readDiscoveredEnemies(getEnemyDiscoveryStorage()),
  );
  const [discoveredBosses] = useState<Set<BossType>>(
    () => readDiscoveredBosses(getEnemyDiscoveryStorage()),
  );
  const discoveredCount = ENEMY_DISCOVERY_TYPES.filter((type) =>
    discoveredEnemies.has(type),
  ).length;
  const discoveredBossCount = BOSS_DISCOVERY_TYPES.filter((type) =>
    discoveredBosses.has(type),
  ).length;

  return (
    <div className="game-enemy-guide">
      <p className="game-panel-eyebrow">Field intelligence</p>
      <h1 id="game-enemy-guide-title">Enemy guide</h1>
      <p className="game-enemy-guide-progress" aria-live="polite">
        {discoveredCount} / {ENEMY_DISCOVERY_TYPES.length} enemy types identified
      </p>
      <div className="game-enemy-guide-grid">
        {ENEMY_DISCOVERY_TYPES.map((type) => {
          const discovered = discoveredEnemies.has(type);
          const name = ENEMY_DISCOVERY_LABELS[type];
          const details = ENEMY_GUIDE_DETAILS[type];

          return (
            <article
              className={`game-enemy-guide-card${discovered ? '' : ' is-locked'}`}
              key={type}
              aria-label={discovered ? name : 'Unidentified enemy'}
            >
              <GameEnemyPortrait type={type} discovered={discovered} />
              <div className="game-enemy-guide-card-copy">
                <h2>{discovered ? name : 'Unknown'}</h2>
                {discovered ? (
                  <>
                    <p>{details.description}</p>
                    <p className="game-enemy-guide-ability">
                      <strong>Ability:</strong> {details.ability}
                    </p>
                  </>
                ) : (
                  <p>Encounter this enemy to identify it.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <h2 className="game-enemy-guide-section-title">Bosses</h2>
      <p className="game-enemy-guide-progress" aria-live="polite">
        {discoveredBossCount} / {BOSS_DISCOVERY_TYPES.length} bosses identified
      </p>
      <div className="game-enemy-guide-grid">
        {BOSS_TYPES.map((bossType) => {
          const discovered = discoveredBosses.has(bossType);
          const name = getBossName(bossType);
          const details = BOSS_GUIDE_DETAILS[bossType];
          const type: ZombieType = bossType === 'hordeCaller'
            ? 'screamer'
            : bossType === 'acidQueen'
              ? 'spitter'
              : 'brute';

          return (
            <article
              className={`game-enemy-guide-card${discovered ? '' : ' is-locked'}`}
              key={bossType}
              aria-label={discovered ? name : 'Unidentified boss'}
            >
              <GameEnemyPortrait
                type={type}
                discovered={discovered}
                bossType={bossType}
              />
              <div className="game-enemy-guide-card-copy">
                <h2>{discovered ? name : 'Unknown'}</h2>
                {discovered ? (
                  <>
                    <p>{details.description}</p>
                    <p className="game-enemy-guide-ability">
                      <strong>Ability:</strong> {details.ability}
                    </p>
                  </>
                ) : (
                  <p>Encounter this boss to identify it.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p className="game-enemy-guide-note">
        Elite enemies are tougher variants with Fast, Shielded, Regenerating,
        or Explosive traits.
      </p>
      <div className="game-menu-actions game-enemy-guide-actions">
        <button
          className="game-menu-secondary"
          type="button"
          onClick={onBack}
          autoFocus
        >
          {backLabel}
        </button>
      </div>
    </div>
  );
}
