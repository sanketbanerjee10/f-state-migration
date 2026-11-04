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
import {
  ARENA_THEME_CYCLE,
  createArenaLayoutForWave,
  createExplosiveBarrels,
} from '@/game/arena/ArenaSystem';
import { renderArena } from '@/game/rendering/ArenaRenderer';
import { drawZombie } from '@/game/rendering/ZombieRenderer';
import { GameOrbGuideSection } from './GameOrbGuide';

interface GameEnemyGuideProps {
  readonly onBack: () => void;
  readonly backLabel: string;
}

const ARENA_GUIDE_DETAILS = [
  'A moonlit outpost with supply crates, sandbag cover, and destructible barricades.',
  'A heavy industrial floor broken up by concrete structures and reinforced barriers.',
  'A weathered green zone with scattered cover and dangerous open lanes.',
  'A ruined city arena where broken walls and cover shape the battlefield.',
  'A cold underground complex of concrete defenses and tight corridors.',
] as const;

const ARENA_GUIDE_ENTRIES = ARENA_THEME_CYCLE.map((theme, index) => {
  const waveNumber = index * 10 + 1;
  const layout = createArenaLayoutForWave(waveNumber);
  return {
    theme,
    waveNumber,
    layout,
    description: ARENA_GUIDE_DETAILS[index]!,
  };
});

type ArenaGuideEntry = (typeof ARENA_GUIDE_ENTRIES)[number];

function GameArenaPreview({ entry }: { readonly entry: ArenaGuideEntry }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    renderArena(context, canvas.width, canvas.height, {
      obstacles: entry.layout.obstacles,
      barrels: createExplosiveBarrels(entry.waveNumber),
      theme: entry.theme.id,
    });
  }, [entry]);

  return (
    <canvas
      ref={canvasRef}
      className="game-arena-guide-canvas"
      width={480}
      height={240}
      aria-hidden="true"
    />
  );
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
      <h1 id="game-enemy-guide-title">Guides</h1>
      <GameOrbGuideSection />
      <h2 className="game-enemy-guide-section-title" aria-live="polite">
        Enemies <span>({discoveredCount}/{ENEMY_DISCOVERY_TYPES.length} identified)</span>
      </h2>
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
      <h2 className="game-enemy-guide-section-title" aria-live="polite">
        Bosses <span>({discoveredBossCount}/{BOSS_DISCOVERY_TYPES.length} identified)</span>
      </h2>
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
      <section className="game-arena-guide" aria-labelledby="game-arena-guide-title">
        <h2 className="game-enemy-guide-section-title" id="game-arena-guide-title">
          Arenas
        </h2>
        <p className="game-arena-guide-intro">
          Five environments rotate through Survival waves, each with varied
          obstacle layouts.
        </p>
        <div className="game-arena-guide-grid">
          {ARENA_GUIDE_ENTRIES.map((entry) => (
            <article className="game-arena-guide-card" key={entry.theme.id}>
              <div className="game-arena-guide-preview">
                <GameArenaPreview entry={entry} />
                <span>{entry.layout.name} layout</span>
              </div>
              <div className="game-arena-guide-copy">
                <p className="game-arena-guide-wave">
                  Waves {entry.waveNumber}–{entry.waveNumber + 9}
                </p>
                <h3>{entry.theme.name}</h3>
                <p>{entry.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
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
