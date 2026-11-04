import { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
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
import { GameGuideDetailDialog } from './GameGuideDetailDialog';
import { GameFranchiseWordmark } from './GameFranchiseWordmark';

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
  readonly summary: string;
  readonly description: string;
  readonly ability: string;
}>> = {
  charger: {
    summary: 'A massive mutant built for high-speed charges.',
    description: 'A massive mutant that builds momentum before charging across the arena.',
    ability: 'Telegraphs its dash direction; colliding with an obstacle stuns it briefly.',
  },
  acidQueen: {
    summary: 'A toxic mutant that attacks from range and controls space.',
    description: 'A toxic mutant that controls the arena with ranged acid attacks.',
    ability: 'Fires acid spreads and creates telegraphed pools that deny areas temporarily.',
  },
  hordeCaller: {
    summary: 'A summoner shielded by its reinforcements.',
    description: 'A summoner protected by a shield while its reinforcements remain.',
    ability: 'Summons supporting zombies; defeat them to remove its shield and make it vulnerable.',
  },
};

type SelectedGuideEntry =
  | { readonly kind: 'enemy'; readonly type: ZombieType }
  | { readonly kind: 'boss'; readonly type: BossType };

function getBossZombieType(bossType: BossType): ZombieType {
  return bossType === 'hordeCaller'
    ? 'screamer'
    : bossType === 'acidQueen'
      ? 'spitter'
      : 'brute';
}

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
      <span className="game-enemy-guide-portrait-glow" />
      <canvas
        ref={canvasRef}
        className="game-enemy-guide-character"
        width={240}
        height={150}
      />
      {!discovered && (
        <span className="game-enemy-guide-question">?</span>
      )}
      <span className="game-enemy-guide-scanline" />
    </div>
  );
}

function GuideSectionHeading({
  index,
  eyebrow,
  title,
  description,
  count,
}: {
  readonly index: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly count?: {
    readonly numerator: number;
    readonly denominator: number;
  };
}) {
  return (
    <div className="game-guide-section-heading">
      <span className="game-guide-eyebrow">{eyebrow}</span>
      <div className="game-guide-section-heading-row">
        <div className="game-guide-section-index" aria-hidden="true">
          {index}
        </div>
        <h2>{title}</h2>
        {count && (
          <span
            className="game-guide-section-count"
            aria-label={`${count.numerator} of ${count.denominator} identified`}
          >
            <span className="game-guide-section-count-numerator">{count.numerator}</span>
            <span aria-hidden="true">/</span>
            <span className="game-guide-section-count-denominator">{count.denominator}</span>
          </span>
        )}
      </div>
      <p className="game-guide-section-description">{description}</p>
    </div>
  );
}

export function GameEnemyGuide({ onBack, backLabel }: GameEnemyGuideProps) {
  const backButtonRef = useRef<HTMLButtonElement>(null);
  const [discoveredEnemies] = useState<Set<ZombieType>>(
    () => readDiscoveredEnemies(getEnemyDiscoveryStorage()),
  );
  const [discoveredBosses] = useState<Set<BossType>>(
    () => readDiscoveredBosses(getEnemyDiscoveryStorage()),
  );
  const [selectedGuideEntry, setSelectedGuideEntry] =
    useState<SelectedGuideEntry | null>(null);

  const discoveredCount = ENEMY_DISCOVERY_TYPES.filter((type) =>
    discoveredEnemies.has(type),
  ).length;
  const discoveredBossCount = BOSS_DISCOVERY_TYPES.filter((type) =>
    discoveredBosses.has(type),
  ).length;

  const totalDiscoveries = discoveredCount + discoveredBossCount;
  const totalEntries =
    ENEMY_DISCOVERY_TYPES.length + BOSS_DISCOVERY_TYPES.length;
  const discoveryPercent = totalEntries
    ? Math.round((totalDiscoveries / totalEntries) * 100)
    : 0;
  const selectedEnemyType = selectedGuideEntry?.kind === 'enemy'
    ? selectedGuideEntry.type
    : null;
  const selectedBossType = selectedGuideEntry?.kind === 'boss'
    ? selectedGuideEntry.type
    : null;
  const selectedDiscovered = selectedEnemyType
    ? discoveredEnemies.has(selectedEnemyType)
    : selectedBossType
      ? discoveredBosses.has(selectedBossType)
      : false;
  const selectedDetails = selectedEnemyType
    ? ENEMY_GUIDE_DETAILS[selectedEnemyType]
    : selectedBossType
      ? BOSS_GUIDE_DETAILS[selectedBossType]
      : null;
  const selectedTitle = selectedEnemyType
    ? selectedDiscovered
      ? ENEMY_DISCOVERY_LABELS[selectedEnemyType]
      : 'Unknown Enemy'
    : selectedBossType
      ? selectedDiscovered
        ? getBossName(selectedBossType)
        : 'Unknown Boss'
      : '';
  const selectedPreview = selectedEnemyType ? (
    <GameEnemyPortrait
      type={selectedEnemyType}
      discovered={selectedDiscovered}
    />
  ) : selectedBossType ? (
    <GameEnemyPortrait
      type={getBossZombieType(selectedBossType)}
      discovered={selectedDiscovered}
      bossType={selectedBossType}
    />
  ) : null;

  useEffect(() => {
    backButtonRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="game-enemy-guide">
      <header className="game-guide-hero">
        <div className="game-guide-hero-main">
          <div className="game-guide-hero-copy">
            <div className="settings-brand game-guide-heading-brand">
              <button
                className="game-level-back-button"
                type="button"
                onClick={onBack}
                aria-label={backLabel}
                ref={backButtonRef}
              >
                <ChevronLeft size={22} aria-hidden="true" />
              </button>
              <div>
                <p className="game-dialog-wordmark">
                  <GameFranchiseWordmark />
                </p>
                <h1 id="game-enemy-guide-title">Field Guides<span>.</span></h1>
              </div>
            </div>
            <p className="game-guide-hero-description">
              Know what you’re up against. Study the threats, learn your
              resources, and prepare for the next run.
            </p>
          </div>

          <div
            className="game-guide-progress"
            role="group"
            aria-label={`${totalDiscoveries} of ${totalEntries} enemy and boss entries identified`}
          >
            <div className="game-guide-progress-top">
              <span>THREAT INTEL</span>
              <strong>{discoveryPercent}%</strong>
            </div>
            <div
              className="game-guide-progress-track"
              role="progressbar"
              aria-label="Threat intelligence completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={discoveryPercent}
            >
              <span style={{ width: `${discoveryPercent}%` }} />
            </div>
            <p>{totalDiscoveries} / {totalEntries} entries identified</p>
          </div>
        </div>
      </header>

      <div className="game-guide-content">
        <GameOrbGuideSection />

        <section
          className="game-guide-section"
          aria-labelledby="game-guide-enemies-title"
        >
          <GuideSectionHeading
            index="02"
            eyebrow="THREAT CATALOGUE"
            title="Enemies"
            description="The infected you’ll encounter out in the field."
            count={{
              numerator: discoveredCount,
              denominator: ENEMY_DISCOVERY_TYPES.length,
            }}
          />
          <div className="game-enemy-guide-grid">
            {ENEMY_DISCOVERY_TYPES.map((type) => {
              const discovered = discoveredEnemies.has(type);
              const name = ENEMY_DISCOVERY_LABELS[type];
              const details = ENEMY_GUIDE_DETAILS[type];

              return (
                <button
                  className={`game-enemy-guide-card${discovered ? '' : ' is-locked'}`}
                  type="button"
                  key={type}
                  aria-haspopup="dialog"
                  aria-label={`View ${discovered ? name : 'unidentified enemy'} details`}
                  onClick={() => setSelectedGuideEntry({ kind: 'enemy', type })}
                >
                  <GameEnemyPortrait type={type} discovered={discovered} />
                  <div className="game-enemy-guide-card-copy">
                    <div className="game-guide-card-meta">
                      <span>{discovered ? 'THREAT IDENTIFIED' : 'UNKNOWN CONTACT'}</span>
                      <span className="game-guide-card-status">
                        {discovered ? '●' : '◌'}
                      </span>
                    </div>
                    <h3>{discovered ? name : 'Unknown'}</h3>
                    {discovered ? (
                      <p>{details.summary}</p>
                    ) : (
                      <p className="game-guide-locked-copy">
                        Threat details are classified.
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="game-guide-section game-guide-boss-section"
          aria-labelledby="game-guide-bosses-title"
        >
          <GuideSectionHeading
            index="03"
            eyebrow="HIGH-THREAT DOSSIER"
            title="Bosses"
            description="Major mutations. Learn their patterns before they find you."
            count={{
              numerator: discoveredBossCount,
              denominator: BOSS_DISCOVERY_TYPES.length,
            }}
          />
          <div className="game-enemy-guide-grid game-enemy-guide-boss-grid">
            {BOSS_TYPES.map((bossType) => {
              const discovered = discoveredBosses.has(bossType);
              const name = getBossName(bossType);
              const details = BOSS_GUIDE_DETAILS[bossType];
              const type = getBossZombieType(bossType);

              return (
                <button
                  className={`game-enemy-guide-card game-enemy-guide-boss-card${discovered ? '' : ' is-locked'}`}
                  type="button"
                  key={bossType}
                  aria-haspopup="dialog"
                  aria-label={`View ${discovered ? name : 'unidentified boss'} details`}
                  onClick={() => setSelectedGuideEntry({ kind: 'boss', type: bossType })}
                >
                  <GameEnemyPortrait
                    type={type}
                    discovered={discovered}
                    bossType={bossType}
                  />
                  <div className="game-enemy-guide-card-copy">
                    <div className="game-guide-card-meta">
                      <span>{discovered ? 'BOSS DOSSIER' : 'CLASSIFIED DOSSIER'}</span>
                      <span className="game-guide-card-status">
                        {discovered ? '●' : '◌'}
                      </span>
                    </div>
                    <h3>{discovered ? name : 'Unknown'}</h3>
                    {discovered ? (
                      <p>{details.summary}</p>
                    ) : (
                      <p className="game-guide-locked-copy">
                        Threat details are classified.
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section
          className="game-arena-guide game-guide-section"
          aria-labelledby="game-arena-guide-title"
        >
          <GuideSectionHeading
            index="04"
            eyebrow="OPERATIONAL ENVIRONMENTS"
            title="Arenas"
            description="Five environments rotate through Survival waves, each with varied obstacle layouts."
          />
          <div className="game-arena-guide-grid">
            {ARENA_GUIDE_ENTRIES.map((entry, index) => (
              <article className="game-arena-guide-card" key={entry.theme.id}>
                <div className="game-arena-guide-preview">
                  <GameArenaPreview entry={entry} />
                  <span className="game-arena-guide-layout-label">
                    {entry.layout.name} layout
                  </span>
                  <span className="game-arena-guide-number">
                    ZONE 0{index + 1}
                  </span>
                </div>
                <div className="game-arena-guide-copy">
                  <p className="game-arena-guide-wave">
                    WAVES {entry.waveNumber}–{entry.waveNumber + 9}
                  </p>
                  <h3>{entry.theme.name}</h3>
                  <p>{entry.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {selectedGuideEntry && selectedPreview && (
          <GameGuideDetailDialog
            title={selectedTitle}
            preview={selectedPreview}
            onClose={() => setSelectedGuideEntry(null)}
          >
            {selectedDiscovered && selectedDetails ? (
              <>
                <p>{selectedDetails.description}</p>
                <p className="game-enemy-guide-ability">
                  <strong>{selectedBossType ? 'COMBAT INTEL' : 'FIELD NOTE'}</strong>
                  {selectedDetails.ability}
                </p>
              </>
            ) : (
              <p>Threat intel remains classified.</p>
            )}
            {selectedEnemyType && (
              <aside className="game-enemy-guide-note">
                <div>
                  <strong>IN-GAME TIP // ELITE ENEMIES</strong>
                  <p>
                    Elite enemies may be Fast, Shielded, Regenerating, or Explosive.
                    Keep moving, watch for their trait, and prioritize threats that
                    can corner you.
                  </p>
                </div>
              </aside>
            )}
          </GameGuideDetailDialog>
        )}
      </div>
    </div>
  );
}
